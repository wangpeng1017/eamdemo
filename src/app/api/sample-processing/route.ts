import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success } from '@/lib/api-handler'
import { auth } from '@/lib/auth'
import { generateNo, NumberPrefixes } from '@/lib/generate-no'

// 获取加工记录列表
export const GET = withErrorHandler(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const status = searchParams.get('status')
    const sampleId = searchParams.get('sampleId')

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (sampleId) where.sampleId = sampleId

    const [list, total] = await Promise.all([
        prisma.sampleProcessing.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
            include: {
                sample: {
                    select: {
                        id: true,
                        sampleNo: true,
                        name: true,
                        specification: true,
                        entrustment: {
                            select: { entrustmentNo: true }
                        }
                    }
                },
                createdBy: {
                    select: { id: true, name: true }
                }
            }
        }),
        prisma.sampleProcessing.count({ where })
    ])

    return success({ list, total, page, pageSize })
})

// 创建加工单
export const POST = withErrorHandler(async (request: NextRequest) => {
    const session = await auth()
    const data = await request.json()

    if (!data.sampleId || !data.processorName || !data.processType) {
        throw new Error('缺少必填字段: sampleId, processorName, processType')
    }

    // 验证样品状态
    const sample = await prisma.sample.findUnique({ where: { id: data.sampleId } })
    if (!sample) throw new Error('样品不存在')
    if (sample.status !== 'received' && sample.status !== 'processed') {
        throw new Error('只有已收样或已加工完成的样品才能送出加工')
    }

    const processNo = await generateNo(NumberPrefixes.PROCESSING, 4)

    const processing = await prisma.sampleProcessing.create({
        data: {
            processNo,
            sampleId: data.sampleId,
            processorName: data.processorName,
            processType: data.processType,
            description: data.description || null,
            sentDate: data.sentDate ? new Date(data.sentDate) : new Date(),
            expectedReturnDate: data.expectedReturnDate ? new Date(data.expectedReturnDate) : null,
            quantity: data.quantity || null,
            cost: data.cost || null,
            remark: data.remark || null,
            status: 'processing',
            createdById: session?.user?.id,
        }
    })

    // 更新样品状态为加工中
    await prisma.sample.update({
        where: { id: data.sampleId },
        data: { status: 'processing' }
    })

    return success(processing)
})
