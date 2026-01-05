import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const task = await prisma.testTask.findUnique({ where: { id }, include: { sample: true, device: true } })
  return NextResponse.json(task)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const data = await request.json()
  const task = await prisma.testTask.update({ where: { id }, data })
  return NextResponse.json(task)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.testTask.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
