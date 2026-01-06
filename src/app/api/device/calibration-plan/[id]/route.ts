import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// 获取单个定检计划
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const plan = await prisma.calibrationPlan.findUnique({
    where: { id },
    include: {
      device: true,
    },
  })

  if (!plan) {
    return NextResponse.json({ error: '定检计划不存在' }, { status: 404 })
  }

  const formatted = {
    id: plan.id,
    deviceId: plan.deviceId,
    deviceName: plan.device?.name,
    planName: plan.planName,
    cycleType: plan.planType,
    cycleMonths: plan.cycleMonths,
    lastCalibrationDate: plan.lastCalibrationDate,
    nextCalibrationDate: plan.nextCalibrationDate,
    responsiblePerson: plan.responsiblePerson,
    calibratingOrganization: plan.calibratingOrganization,
    status: plan.status,
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

  const updateData: any = {}
  if (data.deviceId !== undefined) updateData.deviceId = data.deviceId
  if (data.planName !== undefined) updateData.planName = data.planName
  if (data.cycleType !== undefined) updateData.planType = data.cycleType
  if (data.cycleMonths !== undefined) updateData.cycleMonths = data.cycleMonths
  if (data.lastCalibrationDate !== undefined) updateData.lastCalibrationDate = data.lastCalibrationDate ? new Date(data.lastCalibrationDate) : null
  if (data.nextCalibrationDate !== undefined) updateData.nextCalibrationDate = data.nextCalibrationDate ? new Date(data.nextCalibrationDate) : null
  if (data.responsiblePerson !== undefined) updateData.responsiblePerson = data.responsiblePerson
  if (data.calibratingOrganization !== undefined) updateData.calibratingOrganization = data.calibratingOrganization
  if (data.status !== undefined) updateData.status = data.status

  const plan = await prisma.calibrationPlan.update({
    where: { id },
    data: updateData,
  })

  return NextResponse.json(plan)
}

// 删除定检计划
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  await prisma.calibrationPlan.delete({
    where: { id },
  })

  return NextResponse.json({ success: true })
}
