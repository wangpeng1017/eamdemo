import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// 获取单个报告模板
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const template = await prisma.reportTemplate.findUnique({
    where: { id }
  })

  if (!template) {
    return NextResponse.json({ error: '模板不存在' }, { status: 404 })
  }

  return NextResponse.json(template)
}

// 更新报告模板
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const data = await request.json()

  const template = await prisma.reportTemplate.update({
    where: { id },
    data
  })

  return NextResponse.json(template)
}

// 删除报告模板
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.reportTemplate.delete({
    where: { id }
  })

  return NextResponse.json({ success: true })
}
