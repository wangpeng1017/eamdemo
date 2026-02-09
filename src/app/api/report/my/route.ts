import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import {
    withErrorHandler,
    success,
} from '@/lib/api-handler'

// 获取当前用户跟单的客户报告（client-generate 的子集）
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

    // 先查询当前用户跟单的委托单 ID
    const myEntrustments = await prisma.entrustment.findMany({
        where: { followerId: session.user.id },
        select: { id: true }
    })
    const myEntrustmentIds = myEntrustments.map(e => e.id)

    // 构建查询条件：客户报告属于我跟单的委托单
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

    return success({
        list,
        total,
        page,
        pageSize,
    })
})
