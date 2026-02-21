/**
 * @file route.ts
 * @desc 工作台应收提醒API - 查询逾期和即将到期的应收款
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withErrorHandler, success } from '@/lib/api-handler'

export const GET = withErrorHandler(async (request: NextRequest) => {
    const now = new Date()
    // 即将到期：7天内
    const soon = new Date()
    soon.setDate(soon.getDate() + 7)

    // 查询未完成的应收款（pending / partial）
    const receivables = await prisma.financeReceivable.findMany({
        where: {
            status: { in: ['pending', 'partial'] },
            dueDate: { not: null },
        },
        orderBy: { dueDate: 'asc' },
        take: 20,
    })

    // 分类：逾期 / 即将到期 / 正常
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
