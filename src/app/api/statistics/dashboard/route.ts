import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success } from '@/lib/api-handler'

// 获取工作台统计数据
export const GET = withErrorHandler(async (request: NextRequest) => {
    const [
        pendingEntrustments,
        testingSamples,
        pendingReports,
        completedThisMonth,
    ] = await Promise.all([
        prisma.entrustment.count({ where: { status: 'pending' } }),
        prisma.sample.count({ where: { status: 'testing' } }),
        prisma.testReport.count({ where: { status: { in: ['draft', 'reviewing'] } } }),
        prisma.testReport.count({
            where: {
                status: 'issued',
                issuedDate: {
                    gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                },
            },
        }),
    ])

    return success({
        pendingEntrustments,
        testingSamples,
        pendingReports,
        completedThisMonth,
    })
})
