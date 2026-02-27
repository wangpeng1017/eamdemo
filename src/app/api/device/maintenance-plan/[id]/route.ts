import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success } from '@/lib/api-handler'

// 获取单个保养计划 - 需要登录
export const GET = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params

  const plan = await prisma.deviceMaintenance.findUnique({
    where: { id },
    include: {
      device: true,
    },
  })

  if (!plan) {
    return new Response(JSON.stringify({ success: false, error: '保养计划不存在' }), { status: 404 })
  }

  const formatted = {
    id: plan.id,
    deviceId: plan.deviceId,
    deviceName: plan.device?.name,
    deviceNo: plan.device?.deviceNo,
    planName: plan.planName,
    planType: plan.planType,
    interval: plan.interval,
    nextMaintenanceDate: plan.nextMaintenanceDate,
    lastMaintenanceDate: plan.lastMaintenanceDate,
    responsiblePerson: plan.responsiblePerson,
    maintenanceItems: plan.maintenanceItems,
    status: plan.status,
  }

  return success(formatted)
})

// 更新保养计划 - 需要登录
export const PUT = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const data = await request.json()

  const updateData: Record<string, unknown> = {}
  if (data.deviceId !== undefined) updateData.deviceId = data.deviceId
  if (data.planName !== undefined) updateData.planName = data.planName
  if (data.planType !== undefined) updateData.planType = data.planType
  if (data.interval !== undefined) updateData.interval = data.interval
  if (data.nextMaintenanceDate !== undefined) updateData.nextMaintenanceDate = data.nextMaintenanceDate ? new Date(data.nextMaintenanceDate) : null
  if (data.lastMaintenanceDate !== undefined) updateData.lastMaintenanceDate = data.lastMaintenanceDate ? new Date(data.lastMaintenanceDate) : null
  if (data.responsiblePerson !== undefined) updateData.responsiblePerson = data.responsiblePerson
  if (data.maintenanceItems !== undefined) updateData.maintenanceItems = data.maintenanceItems
  if (data.status !== undefined) updateData.status = data.status

  const plan = await prisma.deviceMaintenance.update({
    where: { id },
    data: updateData,
  })

  return success(plan)
})

// 删除保养计划 - 需要登录
export const DELETE = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params

  await prisma.deviceMaintenance.delete({
    where: { id },
  })

  return success({ success: true })
})
