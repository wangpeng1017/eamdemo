import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// 获取咨询的跟进记录列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const followUps = await prisma.consultationFollowUp.findMany({
    where: { consultationId: id },
    orderBy: { date: 'desc' },
  })

  return NextResponse.json(followUps)
}

// 创建跟进记录
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const data = await request.json()

  const followUp = await prisma.consultationFollowUp.create({
    data: {
      ...data,
      consultationId: id,
    },
  })

  return NextResponse.json(followUp)
}
