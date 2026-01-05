import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const report = await prisma.testReport.findUnique({ where: { id }, include: { task: true } })
  return NextResponse.json(report)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const data = await request.json()
  const report = await prisma.testReport.update({ where: { id }, data })
  return NextResponse.json(report)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.testReport.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
