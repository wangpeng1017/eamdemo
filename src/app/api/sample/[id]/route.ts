import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success, notFound, badRequest } from '@/lib/api-handler'
import { validateSampleStatusTransition } from '@/lib/status-flow'

// 获取样品详情 - 需要登录
export const GET = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const sample = await prisma.sample.findUnique({
    where: { id },
    include: {
      entrustment: true,
      createdBy: { select: { id: true, name: true } },
      testTasks: true,
      requisitions: true,
    }
  })

  if (!sample) {
    notFound('样品不存在')
  }

  return success(sample)
})

// 更新样品 - 需要登录，验证状态流转
export const PUT = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const data = await request.json()

  // 获取当前样品
  const current = await prisma.sample.findUnique({ where: { id } })
  if (!current) {
    notFound('样品不存在')
  }

  // 如果状态发生变化，验证状态流转
  if (data.status && data.status !== current.status) {
    validateSampleStatusTransition(current.status, data.status)
  }

  const sample = await prisma.sample.update({ where: { id }, data })
  return success(sample)
})

// 删除样品 - 需要登录，检查关联数据
export const DELETE = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params

  // 检查是否有关联的检测任务
  const taskCount = await prisma.testTask.count({
    where: { sampleId: id }
  })
  if (taskCount > 0) {
    badRequest(`无法删除：该样品有 ${taskCount} 个关联检测任务`)
  }

  // 检查是否有关联的领用记录
  const requisitionCount = await prisma.sampleRequisition.count({
    where: { sampleId: id }
  })
  if (requisitionCount > 0) {
    badRequest(`无法删除：该样品有 ${requisitionCount} 个关联领用记录`)
  }

  await prisma.sample.delete({ where: { id } })
  return success({ success: true })
})
