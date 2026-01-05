import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const order = await prisma.outsourceOrder.findUnique({ where: { id }, include: { supplier: true } })
  return NextResponse.json(order)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const data = await request.json()
  const order = await prisma.outsourceOrder.update({ where: { id }, data })
  return NextResponse.json(order)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.outsourceOrder.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
