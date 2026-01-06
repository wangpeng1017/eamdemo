import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// 获取单个咨询（含跟进记录）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const consultation = await prisma.consultation.findUnique({
    where: { id },
    include: {
      followUps: {
        orderBy: { date: 'desc' },
      },
    },
  })
  return NextResponse.json(consultation)
}

// 更新咨询
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const data = await request.json()

  const consultation = await prisma.consultation.update({
    where: { id },
    data: {
      ...data,
      testItems: data.testItems !== undefined ? data.testItems : undefined,
    },
  })
  return NextResponse.json(consultation)
}

// 删除咨询
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.consultation.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
