import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const device = await prisma.device.findUnique({ where: { id } })
  return NextResponse.json(device)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const data = await request.json()
  const device = await prisma.device.update({ where: { id }, data })
  return NextResponse.json(device)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.device.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
