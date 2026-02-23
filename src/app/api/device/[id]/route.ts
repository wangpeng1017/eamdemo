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

// 更新设备 - 需要登录，字段白名单过滤
export const PUT = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const data = await request.json()

  // 字段白名单过滤，防止修改 deviceNo 等关键字段
  const device = await prisma.device.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.model !== undefined && { model: data.model }),
      ...(data.manufacturer !== undefined && { manufacturer: data.manufacturer }),
      ...(data.serialNo !== undefined && { serialNo: data.serialNo }),
      ...(data.location !== undefined && { location: data.location }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.purchaseDate !== undefined && { purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null }),
      ...(data.warrantyExpiry !== undefined && { warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null }),
      ...(data.nextCalibrationDate !== undefined && { nextCalibrationDate: data.nextCalibrationDate ? new Date(data.nextCalibrationDate) : null }),
      ...(data.lastCalibrationDate !== undefined && { lastCalibrationDate: data.lastCalibrationDate ? new Date(data.lastCalibrationDate) : null }),
      ...(data.calibrationCycle !== undefined && { calibrationCycle: data.calibrationCycle }),
      ...(data.operatingHours !== undefined && { operatingHours: data.operatingHours }),
      ...(data.remark !== undefined && { remark: data.remark }),
    }
  })
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
