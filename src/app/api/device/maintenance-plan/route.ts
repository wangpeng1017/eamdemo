import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// 获取保养计划列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const status = searchParams.get('status')
  const planType = searchParams.get('planType')

  const where: any = {}
  if (status) where.status = status
  if (planType) where.planType = planType

  const [list, total] = await Promise.all([
    prisma.deviceMaintenance.findMany({
      where,
      include: {
        device: {
          select: { name: true },
        },
      },
      orderBy: { nextDate: 'asc' },
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
    planName: item.planName,
    planType: item.planType,
    interval: item.intervalDays,
    nextDate: item.nextDate,
    responsiblePerson: item.maintenanceBy,
    maintenanceItems: item.maintenanceItems,
    status: item.status,
    createdAt: item.createdAt,
  }))

  return NextResponse.json({ list: formattedList, total, page, pageSize })
}

// 创建保养计划
export async function POST(request: NextRequest) {
  const data = await request.json()

  const plan = await prisma.deviceMaintenance.create({
    data: {
      deviceId: data.deviceId,
      planName: data.planName,
      planType: data.planType,
      intervalDays: data.interval,
      nextDate: data.nextDate ? new Date(data.nextDate) : null,
      maintenanceBy: data.responsiblePerson,
      maintenanceItems: data.maintenanceItems,
      status: data.status || 'active',
    },
  })

  return NextResponse.json(plan)
}
