import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const capability = await prisma.personnelCapability.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true } },
      standard: { select: { id: true, standardNo: true, name: true } },
    },
  })

  if (!capability) {
    return NextResponse.json({ error: '记录不存在' }, { status: 404 })
  }

  return NextResponse.json(capability)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const data = await request.json()

  const capability = await prisma.personnelCapability.update({
    where: { id },
    data: {
      userId: data.userId,
      standardId: data.standardId,
      parameter: data.parameter,
      certificate: data.certificate,
      expiryDate: new Date(data.expiryDate),
    }
  })

  return NextResponse.json(capability)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.personnelCapability.delete({
    where: { id }
  })

  return NextResponse.json({ success: true })
}
