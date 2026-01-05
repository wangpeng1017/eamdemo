import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const receivable = await prisma.financeReceivable.findUnique({ where: { id } })
  return NextResponse.json(receivable)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const data = await request.json()
  const receivable = await prisma.financeReceivable.update({ where: { id }, data })
  return NextResponse.json(receivable)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.financeReceivable.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
