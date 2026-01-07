import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const standard = await prisma.inspectionStandard.findUnique({
    where: { id }
  })

  if (!standard) {
    return NextResponse.json({ error: '记录不存在' }, { status: 404 })
  }

  // 解析 JSON 字段
  const parsed = {
    ...standard,
    devices: standard.devices ? JSON.parse(standard.devices) : [],
    parameters: standard.parameters ? JSON.parse(standard.parameters) : [],
    personnel: standard.personnel ? JSON.parse(standard.personnel) : [],
  }

  return NextResponse.json(parsed)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const data = await request.json()

  const standard = await prisma.inspectionStandard.update({
    where: { id },
    data: {
      ...data,
      devices: data.devices ? JSON.stringify(data.devices) : null,
      parameters: data.parameters ? JSON.stringify(data.parameters) : null,
      personnel: data.personnel ? JSON.stringify(data.personnel) : null,
    }
  })

  return NextResponse.json(standard)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.inspectionStandard.delete({
    where: { id }
  })

  return NextResponse.json({ success: true })
}
