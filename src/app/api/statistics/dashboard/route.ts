import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { withErrorHandler, success } from '@/lib/api-handler'

// 获取工作台统计数据
export const GET = withErrorHandler(async (request: NextRequest) => {
    const session = await auth()
    const userId = session?.user?.id
    const userRoles = session?.user?.roles || []
    const userName = session?.user?.name || ''
    const isAdmin = userRoles.includes('admin') || userRoles.includes('lab_director')

    // 1. 待处理委托：admin 全局，普通用户按跟单人过滤
    const entrustmentWhere: any = { status: 'pending' }
    if (!isAdmin && userId) {
        entrustmentWhere.followerId = userId
    }

    // 2. 检测中样品：admin 全局，普通用户按自己负责任务的样品过滤
    let testingSamplesCount: number
    if (isAdmin) {
        testingSamplesCount = await prisma.sample.count({ where: { status: 'testing' } })
    } else if (userId) {
        // 找到当前用户负责的任务关联的样品
        const myTaskSampleIds = await prisma.testTask.findMany({
            where: { assignedToId: userId, status: { in: ['pending', 'in_progress'] } },
            select: { sampleId: true },
            distinct: ['sampleId'],
        })
        const sampleIds = myTaskSampleIds.map(t => t.sampleId).filter(Boolean) as string[]
        testingSamplesCount = sampleIds.length > 0
            ? await prisma.sample.count({ where: { id: { in: sampleIds }, status: 'testing' } })
            : 0
    } else {
        testingSamplesCount = 0
    }

    // 3. 待审核报告：admin 全局，普通用户按审核人或任务负责人过滤
    let pendingReportsWhere: any = { status: { in: ['draft', 'reviewing'] } }
    if (!isAdmin && userId) {
        // 查找当前用户负责任务关联的报告，或审核人为当前用户的报告
        const myTaskIds = await prisma.testTask.findMany({
            where: { assignedToId: userId },
            select: { id: true },
        })
        const taskIds = myTaskIds.map(t => t.id)
        pendingReportsWhere = {
            status: { in: ['draft', 'reviewing'] },
            OR: [
                { taskId: { in: taskIds } },
                { reviewer: userName },
                { tester: userName },
            ],
        }
    }

    // 4. 本月完成：admin 全局，普通用户按自己的任务过滤
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    let completedWhere: any = {
        status: 'issued',
        issuedDate: { gte: monthStart },
    }
    if (!isAdmin && userId) {
        const myTaskIds = await prisma.testTask.findMany({
            where: { assignedToId: userId },
            select: { id: true },
        })
        const taskIds = myTaskIds.map(t => t.id)
        completedWhere = {
            status: 'issued',
            issuedDate: { gte: monthStart },
            OR: [
                { taskId: { in: taskIds } },
                { reviewer: userName },
                { tester: userName },
            ],
        }
    }

    // 并行查询
    const [
        pendingEntrustments,
        pendingReports,
        completedThisMonth,
    ] = await Promise.all([
        prisma.entrustment.count({ where: entrustmentWhere }),
        prisma.testReport.count({ where: pendingReportsWhere }),
        prisma.testReport.count({ where: completedWhere }),
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
        const taskWhere: any = { status: { in: ['pending', 'in_progress'] } }
        if (!isAdmin) {
            taskWhere.assignedToId = userId
        }
        myTasks = await prisma.testTask.count({ where: taskWhere })
    }

    return success({
        pendingEntrustments,
        testingSamples: testingSamplesCount,
        pendingReports,
        completedThisMonth,
        pendingApprovals,
        myTasks,
    })
})
