import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success } from '@/lib/api-handler'

// 获取保养计划列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const status = searchParams.get('status')
  const planType = searchParams.get('planType')

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (planType) where.planType = planType

  const [list, total] = await Promise.all([
    prisma.deviceMaintenance.findMany({
      where,
      include: {
        device: {
          select: { id: true, name: true, deviceNo: true },
        },
      },
      orderBy: { nextMaintenanceDate: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.deviceMaintenance.count({ where }),
  ])

  // 格式化数据
  const formattedList = list.map((item: any) => ({
    id: item.id,
    deviceId: item.deviceId,
    deviceName: item.device?.name,
    deviceNo: item.device?.deviceNo,
    planName: item.planName,
    planType: item.planType,
    interval: item.interval,
    nextMaintenanceDate: item.nextMaintenanceDate,
    lastMaintenanceDate: item.lastMaintenanceDate,
    responsiblePerson: item.responsiblePerson,
    maintenanceItems: item.maintenanceItems,
    status: item.status,
    createdAt: item.createdAt,
  }))

  return success({ list: formattedList, total, page, pageSize })
})

// 创建保养计划
export const POST = withErrorHandler(async (request: NextRequest) => {
  const data = await request.json()

  const plan = await prisma.deviceMaintenance.create({
    data: {
      deviceId: data.deviceId,
      planName: data.planName,
      planType: data.planType,
      interval: data.interval,
      nextMaintenanceDate: data.nextMaintenanceDate ? new Date(data.nextMaintenanceDate) : null,
      lastMaintenanceDate: data.lastMaintenanceDate ? new Date(data.lastMaintenanceDate) : null,
      responsiblePerson: data.responsiblePerson,
      maintenanceItems: data.maintenanceItems,
      status: data.status || 'active',
    },
  })

  return success(plan)
})
