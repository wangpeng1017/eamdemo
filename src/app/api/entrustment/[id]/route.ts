import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const entrustment = await prisma.entrustment.findUnique({ where: { id } })
  return NextResponse.json(entrustment)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const data = await request.json()
  const entrustment = await prisma.entrustment.update({ where: { id }, data })
  return NextResponse.json(entrustment)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.entrustment.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
