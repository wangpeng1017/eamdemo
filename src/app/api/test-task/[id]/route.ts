import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success, notFound, badRequest } from '@/lib/api-handler'
import { validateTaskStatusTransition } from '@/lib/status-flow'

// 获取检测任务详情 - 需要登录
export const GET = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const task = await prisma.testTask.findUnique({
    where: { id },
    include: { sample: true, device: true }
  })

  if (!task) {
    notFound('检测任务不存在')
  }

  return success(task)
})

// 更新检测任务 - 需要登录，验证状态流转
export const PUT = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const data = await request.json()

  // 获取当前任务
  const current = await prisma.testTask.findUnique({ where: { id } })
  if (!current) {
    notFound('检测任务不存在')
  }

  // 如果状态发生变化，验证状态流转
  if (data.status && data.status !== current.status) {
    validateTaskStatusTransition(current.status, data.status)
  }

  const task = await prisma.testTask.update({ where: { id }, data })
  return success(task)
})

// 删除检测任务 - 需要登录，检查关联数据
export const DELETE = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params

  // 检查是否有关联的检测报告
  const reportCount = await prisma.testReport.count({
    where: { taskId: id }
  })
  if (reportCount > 0) {
    badRequest(`无法删除：该任务有 ${reportCount} 个关联检测报告`)
  }

  await prisma.testTask.delete({ where: { id } })
  return success({ success: true })
})
