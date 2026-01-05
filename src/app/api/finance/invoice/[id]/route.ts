import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const invoice = await prisma.financeInvoice.findUnique({ where: { id } })
  return NextResponse.json(invoice)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const data = await request.json()
  const invoice = await prisma.financeInvoice.update({ where: { id }, data })
  return NextResponse.json(invoice)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.financeInvoice.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
