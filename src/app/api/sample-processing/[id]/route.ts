import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success } from '@/lib/api-handler'

// 获取单个加工记录
export const GET = withErrorHandler(async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    const { id } = await params
    const processing = await prisma.sampleProcessing.findUnique({
        where: { id },
        include: {
            sample: {
                select: { id: true, sampleNo: true, name: true, specification: true }
            },
            createdBy: {
                select: { id: true, name: true }
            }
        }
    })
    if (!processing) throw new Error('加工记录不存在')
    return success(processing)
})

// 更新加工记录（记录回样信息）
export const PUT = withErrorHandler(async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    const { id } = await params
    const data = await request.json()

    const processing = await prisma.sampleProcessing.findUnique({ where: { id } })
    if (!processing) throw new Error('加工记录不存在')

    const updated = await prisma.sampleProcessing.update({
        where: { id },
        data: {
            processorName: data.processorName ?? processing.processorName,
            processType: data.processType ?? processing.processType,
            description: data.description ?? processing.description,
            expectedReturnDate: data.expectedReturnDate ? new Date(data.expectedReturnDate) : processing.expectedReturnDate,
            actualReturnDate: data.actualReturnDate ? new Date(data.actualReturnDate) : processing.actualReturnDate,
            result: data.result ?? processing.result,
            quantity: data.quantity ?? processing.quantity,
            cost: data.cost ?? processing.cost,
            remark: data.remark ?? processing.remark,
        }
    })

    return success(updated)
})

// 标记加工完成 / 取消
export const PATCH = withErrorHandler(async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    const { id } = await params
    const data = await request.json()
    const action = data.action // 'complete' | 'cancel'

    const processing = await prisma.sampleProcessing.findUnique({
        where: { id },
        include: { sample: true }
    })
    if (!processing) throw new Error('加工记录不存在')

    if (action === 'complete') {
        // 标记完成
        await prisma.sampleProcessing.update({
            where: { id },
            data: {
                status: 'completed',
                actualReturnDate: data.actualReturnDate ? new Date(data.actualReturnDate) : new Date(),
                result: data.result || 'qualified',
            }
        })

        // 检查该样品是否还有其他进行中的加工
        const activeProcessings = await prisma.sampleProcessing.count({
            where: {
                sampleId: processing.sampleId,
                status: 'processing',
                id: { not: id }
            }
        })

        // 如果没有其他进行中的加工，更新样品状态为 processed
        if (activeProcessings === 0) {
            await prisma.sample.update({
                where: { id: processing.sampleId },
                data: { status: 'processed' }
            })
        }
    } else if (action === 'cancel') {
        await prisma.sampleProcessing.update({
            where: { id },
            data: { status: 'cancelled' }
        })

        // 如果样品没有其他进行中加工，恢复为已收样
        const activeProcessings = await prisma.sampleProcessing.count({
            where: {
                sampleId: processing.sampleId,
                status: 'processing',
                id: { not: id }
            }
        })
        if (activeProcessings === 0) {
            await prisma.sample.update({
                where: { id: processing.sampleId },
                data: { status: 'received' }
            })
        }
    }

    return success({ message: action === 'complete' ? '加工完成' : '已取消' })
})
