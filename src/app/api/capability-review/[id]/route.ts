import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const review = await prisma.capabilityReview.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true } },
      capability: { select: { id: true, parameter: true, certificate: true } },
    },
  })

  if (!review) {
    return NextResponse.json({ error: '记录不存在' }, { status: 404 })
  }

  return NextResponse.json(review)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const data = await request.json()

  const review = await prisma.capabilityReview.update({
    where: { id },
    data: {
      userId: data.userId,
      capabilityId: data.capabilityId,
      trainingContent: data.trainingContent,
      examDate: new Date(data.examDate),
      examResult: data.examResult,
    }
  })

  return NextResponse.json(review)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.capabilityReview.delete({
    where: { id }
  })

  return NextResponse.json({ success: true })
}
