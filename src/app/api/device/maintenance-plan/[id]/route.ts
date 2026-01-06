import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// 获取单个保养计划
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const plan = await prisma.deviceMaintenance.findUnique({
    where: { id },
    include: {
      device: true,
    },
  })

  if (!plan) {
    return NextResponse.json({ error: '保养计划不存在' }, { status: 404 })
  }

  const formatted = {
    id: plan.id,
    deviceId: plan.deviceId,
    deviceName: plan.device?.name,
    planName: plan.planName,
    planType: plan.planType,
    interval: plan.intervalDays,
    nextDate: plan.nextDate,
    responsiblePerson: plan.maintenanceBy,
    maintenanceItems: plan.maintenanceItems,
    status: plan.status,
  }

  return NextResponse.json(formatted)
}

// 更新保养计划
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const data = await request.json()

  const updateData: any = {}
  if (data.deviceId !== undefined) updateData.deviceId = data.deviceId
  if (data.planName !== undefined) updateData.planName = data.planName
  if (data.planType !== undefined) updateData.planType = data.planType
  if (data.interval !== undefined) updateData.intervalDays = data.interval
  if (data.nextDate !== undefined) updateData.nextDate = data.nextDate ? new Date(data.nextDate) : null
  if (data.responsiblePerson !== undefined) updateData.maintenanceBy = data.responsiblePerson
  if (data.maintenanceItems !== undefined) updateData.maintenanceItems = data.maintenanceItems
  if (data.status !== undefined) updateData.status = data.status

  const plan = await prisma.deviceMaintenance.update({
    where: { id },
    data: updateData,
  })

  return NextResponse.json(plan)
}

// 删除保养计划
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  await prisma.deviceMaintenance.delete({
    where: { id },
  })

  return NextResponse.json({ success: true })
}
