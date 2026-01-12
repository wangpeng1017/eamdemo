/**
 * @file route.ts
 * @desc 工作台我的任务列表API
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { withErrorHandler, success, unauthorized } from '@/lib/api-handler'

/**
 * 获取分配给当前用户的任务列表
 * GET /api/dashboard/my-tasks
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
    const session = await auth()

    if (!session?.user?.id) {
        return unauthorized()
    }

    const userId = session.user.id
    const userRoles = session.user.roles || []

    // 构建查询条件
    let where: any = {
        status: { in: ['pending', 'in_progress'] }, // 只查询未完成的任务
    }

    // 非管理员只能看到分配给自己的任务
    if (!userRoles.includes('admin') && !userRoles.includes('lab_director')) {
        where.assignedToId = userId
    }

    const tasks = await prisma.testTask.findMany({
        where,
        include: {
            sample: {
                select: {
                    sampleNo: true,
                    name: true,
                },
            },
            assignedTo: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
        orderBy: [
            { status: 'asc' },
            { dueDate: 'asc' },
            { createdAt: 'desc' },
        ],
        take: 10,
    })

    return success({
        list: tasks,
        total: tasks.length,
    })
})
