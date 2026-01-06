import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import {
  withErrorHandler,
  success,
  notFound,
  validateEnum,
} from '@/lib/api-handler'

// 获取维修记录详情
export const GET = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<{ id: string }> }
) => {
  const { id } = await context!.params

  const repair = await prisma.deviceRepair.findUnique({
    where: { id },
    include: {
      device: {
        select: {
          id: true,
          code: true,
          name: true,
          model: true,
          manufacturer: true,
          location: true,
          department: true,
          status: true,
          responsiblePerson: true,
        },
      },
    },
  })

  if (!repair) {
    notFound('维修记录不存在')
  }

  return success(repair)
})

// 更新维修记录
export const PUT = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<{ id: string }> }
) => {
  const { id } = await context!.params
  const data = await request.json()

  const repair = await prisma.deviceRepair.findUnique({
    where: { id },
  })

  if (!repair) {
    notFound('维修记录不存在')
  }

  const updated = await prisma.deviceRepair.update({
    where: { id },
    data: {
      faultDesc: data.faultDesc,
      repairType: data.repairType,
      repairCost: data.repairCost ? parseFloat(data.repairCost) : null,
      repairBy: data.repairBy,
      remark: data.remark,
    },
    include: {
      device: true,
    },
  })

  return success(updated)
})

// 删除维修记录
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<{ id: string }> }
) => {
  const { id } = await context!.params

  const repair = await prisma.deviceRepair.findUnique({
    where: { id },
    include: { device: true },
  })

  if (!repair) {
    notFound('维修记录不存在')
  }

  await prisma.deviceRepair.delete({ where: { id } })

  // 检查设备是否还有其他未完成的维修记录
  const pendingRepairs = await prisma.deviceRepair.count({
    where: {
      deviceId: repair.deviceId,
      status: { not: 'completed' },
    },
  })

  // 如果没有其他未完成的维修，恢复设备状态
  if (pendingRepairs === 0) {
    await prisma.device.update({
      where: { id: repair.deviceId },
      data: { status: 'Running' },
    })
  }

  return success({ success: true })
})

// 更新维修状态
export const PATCH = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<{ id: string }> }
) => {
  const { id } = await context!.params
  const data = await request.json()

  const repair = await prisma.deviceRepair.findUnique({
    where: { id },
  })

  if (!repair) {
    notFound('维修记录不存在')
  }

  const action = validateEnum(data.action, ['start', 'complete'])

  let updateData: Record<string, unknown> = {}

  switch (action) {
    case 'start':
      if (repair.status !== 'pending') {
        throw new Error('只有待维修状态的记录才能开始维修')
      }
      updateData = {
        status: 'in_progress',
        repairBy: data.repairBy || repair.repairBy,
      }
      break

    case 'complete':
      if (repair.status !== 'in_progress') {
        throw new Error('只有维修中状态的记录才能完成')
      }
      updateData = {
        status: 'completed',
        completedDate: new Date(),
        repairCost: data.repairCost ? parseFloat(data.repairCost) : repair.repairCost,
        remark: data.remark || repair.remark,
      }

      // 检查设备是否还有其他未完成的维修记录
      const pendingRepairs = await prisma.deviceRepair.count({
        where: {
          deviceId: repair.deviceId,
          id: { not: id },
          status: { not: 'completed' },
        },
      })

      // 如果没有其他未完成的维修，恢复设备状态
      if (pendingRepairs === 0) {
        await prisma.device.update({
          where: { id: repair.deviceId },
          data: { status: 'Running' },
        })
      }
      break
  }

  const updated = await prisma.deviceRepair.update({
    where: { id },
    data: updateData,
    include: {
      device: true,
    },
  })

  return success(updated)
})
