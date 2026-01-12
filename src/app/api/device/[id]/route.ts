import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success, notFound, badRequest } from '@/lib/api-handler'

// 获取设备详情 - 需要登录
export const GET = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const device = await prisma.device.findUnique({ where: { id } })

  if (!device) {
    notFound('设备不存在')
  }

  return success(device)
})

// 更新设备 - 需要登录
export const PUT = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const data = await request.json()
  const device = await prisma.device.update({ where: { id }, data })
  return success(device)
})

// 删除设备 - 需要登录，检查关联数据
export const DELETE = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params

  // 检查是否有关联的检测任务
  const taskCount = await prisma.testTask.count({
    where: { deviceId: id }
  })
  if (taskCount > 0) {
    badRequest(`无法删除：该设备有 ${taskCount} 个关联检测任务`)
  }

  await prisma.device.delete({ where: { id } })
  return success({ success: true })
})
