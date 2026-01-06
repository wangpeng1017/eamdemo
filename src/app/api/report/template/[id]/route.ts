import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// 获取单个报告模板
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const template = await prisma.reportTemplate.findUnique({
    where: { id: params.id }
  })

  if (!template) {
    return NextResponse.json({ error: '模板不存在' }, { status: 404 })
  }

  return NextResponse.json(template)
}

// 更新报告模板
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const data = await request.json()

  const template = await prisma.reportTemplate.update({
    where: { id: params.id },
    data
  })

  return NextResponse.json(template)
}

// 删除报告模板
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.reportTemplate.delete({
    where: { id: params.id }
  })

  return NextResponse.json({ success: true })
}
