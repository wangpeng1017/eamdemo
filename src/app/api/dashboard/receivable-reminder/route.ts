/**
 * @file route.ts
 * @desc 工作台应收提醒API - 查询逾期和即将到期的应收款（按跟单人过滤）
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, success } from '@/lib/api-handler'

export const GET = withAuth(async (request: NextRequest, user) => {
    const now = new Date()
    // 即将到期：7天内
    const soon = new Date()
    soon.setDate(soon.getDate() + 7)

    // 查询用户角色的数据范围
    const userWithRoles = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
            deptId: true,
            roles: { select: { role: { select: { dataScope: true } } } }
        }
    })

    let hasAll = false
    let hasDept = false
    userWithRoles?.roles.forEach((ur: { role: { dataScope: string } }) => {
        if (ur.role.dataScope === 'all') hasAll = true
        if (ur.role.dataScope === 'dept') hasDept = true
    })

    // 构建跟单人过滤条件
    const whereClause: any = {
        status: { in: ['pending', 'partial'] },
        dueDate: { not: null },
    }

    if (!hasAll) {
        // 非全局权限用户：只看自己跟单的应收款（通过委托单关联）
        if (hasDept && userWithRoles?.deptId) {
            // 部门权限：看本部门用户跟单的
            const deptUserIds = await prisma.user.findMany({
                where: { deptId: userWithRoles.deptId },
                select: { id: true }
            }).then(users => users.map(u => u.id))

            whereClause.entrustment = {
                OR: [
                    { followerId: { in: deptUserIds } },
                    { createdById: { in: deptUserIds } },
                ]
            }
        } else {
            // 仅本人权限：只看自己跟单或创建的
            whereClause.entrustment = {
                OR: [
                    { followerId: user.id },
                    { createdById: user.id },
                ]
            }
        }
    }

    // 查询未完成的应收款
    const receivables = await prisma.financeReceivable.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 20,
    })

    // 分类：逾期 / 即将到期
    const overdue: any[] = []
    const dueSoon: any[] = []

    for (const r of receivables) {
        if (!r.dueDate) continue
        const remaining = Number(r.amount) - Number(r.receivedAmount)
        const item = {
            id: r.id,
            receivableNo: r.receivableNo,
            clientName: r.clientName,
            amount: Number(r.amount),
            receivedAmount: Number(r.receivedAmount),
            remaining,
            dueDate: r.dueDate.toISOString(),
            status: r.status,
            daysOverdue: Math.floor((now.getTime() - r.dueDate.getTime()) / (1000 * 60 * 60 * 24)),
        }

        if (r.dueDate < now) {
            overdue.push(item)
        } else if (r.dueDate <= soon) {
            dueSoon.push(item)
        }
    }

    return success({
        overdue,
        dueSoon,
        overdueCount: overdue.length,
        dueSoonCount: dueSoon.length,
        totalCount: overdue.length + dueSoon.length,
    })
})
