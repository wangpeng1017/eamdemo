import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import {
    withErrorHandler,
    success,
} from '@/lib/api-handler'

// 获取当前用户的报告
// type=client 查客户报告（按 followerId），type=task 查任务报告（按 assignedToId）
export const GET = withErrorHandler(async (request: NextRequest) => {
    const session = await auth()
    if (!session?.user?.id) {
        return Response.json({ success: false, error: { message: '未登录' } }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const status = searchParams.get('status')
    const keyword = searchParams.get('keyword')
    const type = searchParams.get('type') || 'task' // 默认查任务报告

    if (type === 'client') {
        // 客户报告：当前用户跟单的委托单
        const myEntrustments = await prisma.entrustment.findMany({
            where: { followerId: session.user.id },
            select: { id: true }
        })
        const myEntrustmentIds = myEntrustments.map(e => e.id)

        const where: any = {
            entrustmentId: { in: myEntrustmentIds }
        }
        if (status) where.status = status
        if (keyword) {
            where.OR = [
                { reportNo: { contains: keyword } },
                { clientName: { contains: keyword } },
                { sampleName: { contains: keyword } },
            ]
        }

        const [list, total] = await Promise.all([
            prisma.clientReport.findMany({
                where,
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                include: {
                    template: { select: { name: true } },
                }
            }),
            prisma.clientReport.count({ where })
        ])

        return success({ list, total, page, pageSize })
    } else {
        // 任务报告：当前用户被分配的任务，或当前用户是检测人
        const currentUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { name: true }
        })

        const where: any = {
            OR: [
                { task: { assignedToId: session.user.id } },
                ...(currentUser?.name ? [{ tester: currentUser.name }] : []),
            ]
        }
        if (status && false) where.status = status // 任务报告已移除状态管理
        if (keyword) {
            where.AND = [
                ...(where.AND || []),
                {
                    OR: [
                        { reportNo: { contains: keyword } },
                        { clientName: { contains: keyword } },
                        { sampleName: { contains: keyword } },
                    ]
                }
            ]
        }

        const [list, total] = await Promise.all([
            prisma.testReport.findMany({
                where,
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                include: {
                    task: { select: { taskNo: true, assignedTo: { select: { name: true } } } },
                }
            }),
            prisma.testReport.count({ where })
        ])

        return success({ list, total, page, pageSize })
    }
})
