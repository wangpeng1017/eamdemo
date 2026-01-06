import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, notFound, badRequest, validateEnum } from '@/lib/api-handler'

// 获取单个评价
export const GET = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<{ id: string }> }
) => {
  const { id } = await context!.params

  const performance = await prisma.supplierPerformance.findUnique({
    where: { id },
    include: {
      supplier: { select: { id: true, name: true, code: true, category: true } },
    },
  })

  if (!performance) {
    notFound('评价不存在')
  }

  return success({
    ...performance,
    scores: performance.scores ? JSON.parse(performance.scores) : [],
    totalScore: Number(performance.totalScore),
  })
})

// 更新评价
export const PUT = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<{ id: string }> }
) => {
  const { id } = await context!.params
  const data = await request.json()

  const existing = await prisma.supplierPerformance.findUnique({ where: { id } })
  if (!existing) {
    notFound('评价不存在')
  }

  if (existing.status === 'approved') {
    badRequest('已审批的评价不能修改')
  }

  // 如果更新了评分，重新计算总分和等级
  let updateData: Record<string, unknown> = {}

  if (data.scores) {
    const scores = data.scores as { itemName: string; weight: number; score: number }[]
    const totalScore = scores.reduce((sum, s) => sum + (s.score * s.weight / 100), 0)

    let level = 'D'
    if (totalScore >= 90) level = 'A'
    else if (totalScore >= 80) level = 'B'
    else if (totalScore >= 70) level = 'C'

    updateData = {
      scores: JSON.stringify(scores),
      totalScore,
      level,
    }
  }

  if (data.comment !== undefined) updateData.comment = data.comment
  if (data.period !== undefined) updateData.period = data.period
  if (data.evaluator !== undefined) updateData.evaluator = data.evaluator

  const performance = await prisma.supplierPerformance.update({
    where: { id },
    data: updateData,
    include: { supplier: true },
  })

  return success({
    ...performance,
    scores: performance.scores ? JSON.parse(performance.scores) : [],
    totalScore: Number(performance.totalScore),
  })
})

// 审批操作
export const PATCH = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<{ id: string }> }
) => {
  const { id } = await context!.params
  const data = await request.json()

  const action = validateEnum(data.action, ['submit', 'approve', 'reject'] as const, 'action')

  const existing = await prisma.supplierPerformance.findUnique({ where: { id } })
  if (!existing) {
    notFound('评价不存在')
  }

  let newStatus = existing.status

  switch (action) {
    case 'submit':
      if (existing.status !== 'draft') {
        badRequest('只有草稿状态可以提交')
      }
      newStatus = 'submitted'
      break
    case 'approve':
      if (existing.status !== 'submitted') {
        badRequest('只有已提交状态可以审批')
      }
      newStatus = 'approved'
      break
    case 'reject':
      if (existing.status !== 'submitted') {
        badRequest('只有已提交状态可以驳回')
      }
      newStatus = 'draft'
      break
  }

  const performance = await prisma.supplierPerformance.update({
    where: { id },
    data: { status: newStatus },
    include: { supplier: true },
  })

  return success({
    ...performance,
    scores: performance.scores ? JSON.parse(performance.scores) : [],
    totalScore: Number(performance.totalScore),
  })
})

// 删除评价
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<{ id: string }> }
) => {
  const { id } = await context!.params

  const existing = await prisma.supplierPerformance.findUnique({ where: { id } })
  if (!existing) {
    notFound('评价不存在')
  }

  if (existing.status === 'approved') {
    badRequest('已审批的评价不能删除')
  }

  await prisma.supplierPerformance.delete({ where: { id } })

  return success({ success: true })
})
