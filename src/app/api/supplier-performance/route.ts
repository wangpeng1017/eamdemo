import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, validateRequired } from '@/lib/api-handler'

// 获取绩效评价列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const supplierId = searchParams.get('supplierId')
  const period = searchParams.get('period')
  const level = searchParams.get('level')
  const status = searchParams.get('status')

  const where: Record<string, unknown> = {}
  if (supplierId) where.supplierId = supplierId
  if (period) where.period = period
  if (level) where.level = level
  if (status) where.status = status

  const [list, total] = await Promise.all([
    prisma.supplierPerformance.findMany({
      where,
      orderBy: { evaluateDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        supplier: { select: { id: true, name: true, code: true, category: true } },
      },
    }),
    prisma.supplierPerformance.count({ where }),
  ])

  // 统计各等级数量
  const stats = await prisma.supplierPerformance.groupBy({
    by: ['level'],
    _count: true,
  })

  return success({
    list: list.map(item => ({
      ...item,
      scores: item.scores ? JSON.parse(item.scores) : [],
      totalScore: Number(item.totalScore),
    })),
    total,
    page,
    pageSize,
    stats: stats.reduce((acc, item) => {
      acc[item.level] = item._count
      return acc
    }, {} as Record<string, number>),
  })
})

// 创建绩效评价
export const POST = withErrorHandler(async (request: NextRequest) => {
  const data = await request.json()

  validateRequired(data, ['supplierId', 'period', 'scores', 'evaluator'])

  // 计算总分和等级
  const scores = data.scores as { itemName: string; weight: number; score: number }[]
  const totalScore = scores.reduce((sum, s) => sum + (s.score * s.weight / 100), 0)

  let level = 'D'
  if (totalScore >= 90) level = 'A'
  else if (totalScore >= 80) level = 'B'
  else if (totalScore >= 70) level = 'C'

  const performance = await prisma.supplierPerformance.create({
    data: {
      supplierId: data.supplierId,
      templateId: data.templateId || null,
      period: data.period,
      scores: JSON.stringify(scores),
      totalScore,
      level,
      evaluator: data.evaluator,
      evaluateDate: data.evaluateDate ? new Date(data.evaluateDate) : new Date(),
      comment: data.comment || null,
      status: data.status || 'draft',
    },
    include: {
      supplier: true,
    },
  })

  return success({
    ...performance,
    scores,
    totalScore: Number(performance.totalScore),
  })
})
