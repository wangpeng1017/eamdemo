import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success } from '@/lib/api-handler'

// 获取单个定检计划 - 需要登录
export const GET = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params

  const calibration = await prisma.deviceCalibration.findUnique({
    where: { id },
    include: {
      device: true,
    },
  })

  if (!calibration) {
    return new Response(JSON.stringify({ success: false, error: '定检计划不存在' }), { status: 404 })
  }

  const formatted = {
    id: calibration.id,
    deviceId: calibration.deviceId,
    deviceName: calibration.device?.name,
    deviceNo: calibration.device?.deviceNo,
    lastDate: calibration.lastDate,
    nextDate: calibration.nextDate,
    interval: calibration.interval,
    status: calibration.status,
    result: calibration.result,
  }

  return success(formatted)
})

// 更新定检计划 - 需要登录
export const PUT = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const data = await request.json()

  const updateData: Record<string, unknown> = {}
  if (data.deviceId !== undefined) updateData.deviceId = data.deviceId
  if (data.lastDate !== undefined) updateData.lastDate = data.lastDate ? new Date(data.lastDate) : null
  if (data.nextDate !== undefined) updateData.nextDate = data.nextDate ? new Date(data.nextDate) : null
  if (data.interval !== undefined) updateData.interval = data.interval
  if (data.status !== undefined) updateData.status = data.status
  if (data.result !== undefined) updateData.result = data.result

  const calibration = await prisma.deviceCalibration.update({
    where: { id },
    data: updateData,
  })

  return success(calibration)
})

// 删除定检计划 - 需要登录
export const DELETE = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params

  await prisma.deviceCalibration.delete({
    where: { id },
  })

  return success({ success: true })
})
