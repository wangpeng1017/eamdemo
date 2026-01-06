import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// 获取定检记录列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const records = await prisma.calibrationRecord.findMany({
    where: { calibrationPlanId: id },
    orderBy: { calibrationDate: 'desc' },
  })

  return NextResponse.json({ list: records })
}

// 添加定检记录
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const data = await request.json()

  const record = await prisma.calibrationRecord.create({
    data: {
      calibrationPlanId: id,
      calibrationDate: data.calibrationDate ? new Date(data.calibrationDate) : new Date(),
      result: data.result || 'qualified',
      certificateNo: data.certificateNo,
      nextCalibrationDate: data.nextDate ? new Date(data.nextDate) : null,
      operator: data.operator,
      remark: data.remark,
    },
  })

  return NextResponse.json(record)
}
