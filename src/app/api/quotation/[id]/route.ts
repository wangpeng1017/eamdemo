import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const quotation = await prisma.quotation.findUnique({ where: { id } })
  return NextResponse.json(quotation)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const data = await request.json()
  const quotation = await prisma.quotation.update({ where: { id }, data })
  return NextResponse.json(quotation)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.quotation.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
