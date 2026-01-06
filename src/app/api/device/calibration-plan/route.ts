import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// 获取定检计划列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const status = searchParams.get('status')

  const where: Record<string, unknown> = {}
  if (status) where.status = status

  const [list, total] = await Promise.all([
    prisma.deviceCalibration.findMany({
      where,
      include: {
        device: {
          select: { id: true, name: true, deviceNo: true },
        },
      },
      orderBy: { nextDate: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.deviceCalibration.count({ where }),
  ])

  // 格式化数据
  const formattedList = list.map((item) => ({
    id: item.id,
    deviceId: item.deviceId,
    deviceName: item.device?.name,
    deviceNo: item.device?.deviceNo,
    lastDate: item.lastDate,
    nextDate: item.nextDate,
    interval: item.interval,
    status: item.status,
    result: item.result,
  }))

  return NextResponse.json({ list: formattedList, total, page, pageSize })
}

// 创建定检计划
export async function POST(request: NextRequest) {
  const data = await request.json()

  const calibration = await prisma.deviceCalibration.create({
    data: {
      deviceId: data.deviceId,
      lastDate: data.lastDate ? new Date(data.lastDate) : null,
      nextDate: data.nextDate ? new Date(data.nextDate) : null,
      interval: data.interval || null,
      status: data.status || 'pending',
      result: data.result || null,
    },
  })

  return NextResponse.json(calibration)
}
