import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success } from '@/lib/api-handler'

// 获取待办事项列表
export const GET = withErrorHandler(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const pageSize = parseInt(searchParams.get('pageSize') || '10')

    const todos: any[] = []

    // 1. 待审批的报价单
    const pendingQuotations = await prisma.quotation.findMany({
        where: { status: { in: ['pending_sales', 'pending_finance', 'pending_lab'] } },
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
        include: { entrustment: true },
    })
    pendingProjects.forEach(p => {
        todos.push({
            id: `project-${p.id}`,
            type: 'entrustment',
            title: `检测项目 ${p.name} 待分配`,
            description: p.entrustment?.clientName || '未知客户',
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
