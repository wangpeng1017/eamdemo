import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// 获取单个定检计划
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const calibration = await prisma.deviceCalibration.findUnique({
    where: { id },
    include: {
      device: true,
    },
  })

  if (!calibration) {
    return NextResponse.json({ error: '定检计划不存在' }, { status: 404 })
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

  return NextResponse.json(formatted)
}

// 更新定检计划
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

  return NextResponse.json(calibration)
}

// 删除定检计划
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  await prisma.deviceCalibration.delete({
    where: { id },
  })

  return NextResponse.json({ success: true })
}
