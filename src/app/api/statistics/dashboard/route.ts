import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { withErrorHandler, success } from '@/lib/api-handler'

// 获取工作台统计数据
export const GET = withErrorHandler(async (request: NextRequest) => {
    const session = await auth()
    const userId = session?.user?.id
    const userRoles = session?.user?.roles || []

    // 基础统计
    const [
        pendingEntrustments,
        testingSamples,
        pendingReports,
        completedThisMonth,
    ] = await Promise.all([
        prisma.entrustment.count({ where: { status: 'pending' } }),
        prisma.sample.count({ where: { status: '检测中' } }),
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

    // 待审批统计(根据用户角色)
    let pendingApprovals = 0
    if (userId) {
        const allPending = await prisma.approvalInstance.findMany({
            where: { status: 'pending' },
            select: { currentStep: true },
        })

        pendingApprovals = allPending.filter((item) => {
            if (userRoles.includes('admin')) return true
            if (item.currentStep === 1 && userRoles.includes('sales_manager')) return true
            if (item.currentStep === 2 && userRoles.includes('finance')) return true
            if (item.currentStep === 3 && userRoles.includes('lab_director')) return true
            return false
        }).length
    }

    // 我的任务统计
    let myTasks = 0
    if (userId) {
        const taskWhere: any = { status: { in: ['pending', '进行中'] } }
        if (!userRoles.includes('admin') && !userRoles.includes('lab_director')) {
            taskWhere.assignedToId = userId
        }
        myTasks = await prisma.testTask.count({ where: taskWhere })
    }

    return success({
        pendingEntrustments,
        testingSamples,
        pendingReports,
        completedThisMonth,
        pendingApprovals,
        myTasks,
    })
})

