import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// 获取定检计划列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const status = searchParams.get('status')
  const cycleType = searchParams.get('cycleType')

  const where: any = {}
  if (status) where.status = status
  if (cycleType) where.planType = cycleType

  const [list, total] = await Promise.all([
    prisma.calibrationPlan.findMany({
      where,
      include: {
        device: {
          select: { name: true },
        },
      },
      orderBy: { nextCalibrationDate: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.calibrationPlan.count({ where }),
  ])

  // 格式化数据
  const formattedList = list.map((item: any) => ({
    id: item.id,
    deviceId: item.deviceId,
    deviceName: item.device?.name,
    planName: item.planName,
    cycleType: item.planType,
    cycleMonths: item.cycleMonths,
    lastCalibrationDate: item.lastCalibrationDate,
    nextCalibrationDate: item.nextCalibrationDate,
    responsiblePerson: item.responsiblePerson,
    calibratingOrganization: item.calibratingOrganization,
    status: item.status,
  }))

  return NextResponse.json({ list: formattedList, total, page, pageSize })
}

// 创建定检计划
export async function POST(request: NextRequest) {
  const data = await request.json()

  const plan = await prisma.calibrationPlan.create({
    data: {
      deviceId: data.deviceId,
      planName: data.planName,
      planType: data.cycleType,
      cycleMonths: data.cycleMonths,
      lastCalibrationDate: data.lastCalibrationDate ? new Date(data.lastCalibrationDate) : null,
      nextCalibrationDate: data.nextCalibrationDate ? new Date(data.nextCalibrationDate) : null,
      responsiblePerson: data.responsiblePerson,
      calibratingOrganization: data.calibratingOrganization,
      status: data.status || 'pending',
    },
  })

  return NextResponse.json(plan)
}
