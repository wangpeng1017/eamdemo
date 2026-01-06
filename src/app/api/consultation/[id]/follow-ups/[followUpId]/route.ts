import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// 更新跟进记录
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; followUpId: string }> }
) {
  const { followUpId } = await params
  const data = await request.json()

  const followUp = await prisma.consultationFollowUp.update({
    where: { id: followUpId },
    data,
  })

  return NextResponse.json(followUp)
}

// 删除跟进记录
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; followUpId: string }> }
) {
  const { followUpId } = await params

  await prisma.consultationFollowUp.delete({
    where: { id: followUpId },
  })

  return NextResponse.json({ success: true })
}
