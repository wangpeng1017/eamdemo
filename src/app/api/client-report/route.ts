import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success } from '@/lib/api-handler'
import { getEntrustmentBasedFilter } from '@/lib/data-permission'

// 获取客户报告列表 - 需要登录 + 数据权限过滤
export const GET = withAuth(async (request: NextRequest, user) => {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const status = searchParams.get('status')

    // 注入数据权限过滤
    const permissionFilter = await getEntrustmentBasedFilter(user.id)
    const where: any = { ...permissionFilter }
    if (status) where.status = status

    const [list, total] = await Promise.all([
        prisma.clientReport.findMany({
            where,
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: { createdAt: 'desc' }
        }),
        prisma.clientReport.count({ where })
    ])

    return success({ list, total, page, pageSize })
})
