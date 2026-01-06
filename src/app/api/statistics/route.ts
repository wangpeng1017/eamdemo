import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success } from '@/lib/api-handler'

// 获取统计数据
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'overview'

  // 基础统计
  const [
    entrustmentCount,
    sampleCount,
    taskCount,
    reportCount,
    pendingEntrustments,
    testingSamples,
    pendingReports,
    completedThisMonth,
  ] = await Promise.all([
    prisma.entrustment.count(),
    prisma.sample.count(),
    prisma.testTask.count(),
    prisma.testReport.count(),
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

  const overview = {
    entrustmentCount,
    sampleCount,
    taskCount,
    reportCount,
    pendingEntrustments,
    testingSamples,
    pendingReports,
    completedThisMonth,
  }

  if (type === 'overview') {
    return success(overview)
  }

  // 月度委托趋势（近6个月）
  const monthlyTrend = await getMonthlyTrend()

  // 客户委托排行 Top 10
  const topClients = await prisma.entrustment.groupBy({
    by: ['clientName'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  })

  // 样品状态分布
  const sampleStatusDist = await prisma.sample.groupBy({
    by: ['status'],
    _count: { id: true },
  })

  // 任务状态分布
  const taskStatusDist = await prisma.testTask.groupBy({
    by: ['status'],
    _count: { id: true },
  })

  // 人员任务量统计 Top 10
  const assigneeStats = await prisma.testTask.groupBy({
    by: ['assignedToId'],
    _count: { id: true },
    where: { assignedToId: { not: null } },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  })

  // 财务统计
  const financeStats = await getFinanceStats()

  // 设备统计
  const deviceStats = await prisma.device.groupBy({
    by: ['status'],
    _count: { id: true },
  })

  return success({
    ...overview,
    monthlyTrend,
    topClients: topClients.map((c) => ({
      clientName: c.clientName || '未知',
      count: c._count.id,
    })),
    sampleStatusDist: sampleStatusDist.map((s) => ({
      status: s.status,
      count: s._count.id,
    })),
    taskStatusDist: taskStatusDist.map((t) => ({
      status: t.status,
      count: t._count.id,
    })),
    assigneeStats: assigneeStats.map((a) => ({
      assignee: a.assignedToId || '未分配',
      count: a._count.id,
    })),
    financeStats,
    deviceStats: deviceStats.map((d) => ({
      status: d.status,
      count: d._count.id,
    })),
  })
})

// 获取近6个月委托趋势
async function getMonthlyTrend() {
  const result = []
  const now = new Date()

  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)

    const [entrustments, samples, reports] = await Promise.all([
      prisma.entrustment.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
      prisma.sample.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
      prisma.testReport.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
    ])

    result.push({
      month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
      entrustments,
      samples,
      reports,
    })
  }

  return result
}

// 获取财务统计
async function getFinanceStats() {
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisYearStart = new Date(now.getFullYear(), 0, 1)

  const [
    totalReceivable,
    totalReceived,
    monthReceived,
    yearReceived,
    pendingInvoice,
  ] = await Promise.all([
    prisma.financeReceivable.aggregate({ _sum: { amount: true } }),
    prisma.financeReceivable.aggregate({ _sum: { receivedAmount: true } }),
    prisma.financePayment.aggregate({
      where: { paymentDate: { gte: thisMonthStart } },
      _sum: { amount: true },
    }),
    prisma.financePayment.aggregate({
      where: { paymentDate: { gte: thisYearStart } },
      _sum: { amount: true },
    }),
    prisma.financeInvoice.count({ where: { status: 'pending' } }),
  ])

  return {
    totalReceivable: totalReceivable._sum.amount || 0,
    totalReceived: totalReceived._sum.receivedAmount || 0,
    monthReceived: monthReceived._sum.amount || 0,
    yearReceived: yearReceived._sum.amount || 0,
    pendingInvoice,
  }
}
