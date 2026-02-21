import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success } from '@/lib/api-handler'

// 获取待办事项列表 - 需要登录
export const GET = withAuth(async (request: NextRequest, user) => {
    const { searchParams } = new URL(request.url)
    const pageSize = parseInt(searchParams.get('pageSize') || '10')

    const todos: any[] = []

    // 1. 待审批的报价单
    const pendingQuotations = await prisma.quotation.findMany({
        where: { status: { in: ['pending_sales', 'pending_finance', 'pending_lab'] } },
        include: { client: true },
        take: 5,
        orderBy: { createdAt: 'desc' },
    })
    pendingQuotations.forEach(q => {
        todos.push({
            id: `quotation-${q.id}`,
            type: 'quotation',
            title: `报价单 ${q.quotationNo} 待审批`,
            description: q.client?.name || '未知客户',
            priority: 'high',
            link: '/entrustment/quotation',
        })
    })

    // 2. 待分配的委托单项目
    const pendingProjects = await prisma.entrustmentProject.findMany({
        where: { status: 'pending' },
        take: 5,
        include: { entrustment: { include: { client: true } } },
    })
    pendingProjects.forEach(p => {
        todos.push({
            id: `project-${p.id}`,
            type: 'entrustment',
            title: `检测项目 ${p.name} 待分配`,
            description: p.entrustment?.client?.name || '未知客户',
            priority: 'medium',
            link: '/entrustment/list',
        })
    })

    // 3. 待审核的报告
    const pendingReports = await prisma.testReport.findMany({
        where: { status: 'reviewing' },
        take: 5,
        orderBy: { createdAt: 'desc' },
    })
    pendingReports.forEach(r => {
        todos.push({
            id: `report-${r.id}`,
            type: 'approval',
            title: `报告 ${r.reportNo} 待审核`,
            description: r.sampleName || '未知样品',
            priority: 'high',
            link: '/report/approval',
        })
    })

    // 4. 应收款到期提醒（7天内到期 + 已逾期，筛选当前用户跟进的委托单）
    const reminderDate = new Date()
    reminderDate.setDate(reminderDate.getDate() + 7)

    const nearDueReceivables = await prisma.financeReceivable.findMany({
        where: {
            status: { in: ['pending', 'partial'] },
            dueDate: { lte: reminderDate },
            entrustment: { followerId: user.id },
        },
        include: {
            entrustment: { select: { entrustmentNo: true, followerUser: { select: { name: true } } } },
        },
        take: 5,
        orderBy: { dueDate: 'asc' },
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    nearDueReceivables.forEach(r => {
        const isOverdue = r.dueDate && new Date(r.dueDate) < today
        const remaining = Number(r.amount) - Number(r.receivedAmount)
        const dueDateStr = r.dueDate
            ? new Date(r.dueDate).toLocaleDateString('zh-CN')
            : '未设置'

        todos.push({
            id: `receivable-${r.id}`,
            type: 'finance',
            title: isOverdue
                ? `应收款 ${r.receivableNo} 已逾期`
                : `应收款 ${r.receivableNo} 即将到期`,
            description: `${r.clientName || '未知客户'} | 待收 ¥${remaining.toFixed(2)} | 到期日 ${dueDateStr}`,
            priority: isOverdue ? 'high' : 'medium',
            link: '/finance/receivable',
        })
    })

    // 排序并限制数量
    const sortedTodos = todos
        .sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 }
            return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]
        })
        .slice(0, pageSize)

    return success({
        list: sortedTodos,
        total: todos.length,
    })
})
