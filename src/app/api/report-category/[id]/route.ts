import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const category = await prisma.reportCategory.findUnique({
    where: { id }
  })

  if (!category) {
    return NextResponse.json({ error: '记录不存在' }, { status: 404 })
  }

  const parsed = {
    ...category,
    testTypes: category.testTypes ? JSON.parse(category.testTypes) : [],
  }

  return NextResponse.json(parsed)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const data = await request.json()

  const category = await prisma.reportCategory.update({
    where: { id },
    data: {
      ...data,
      testTypes: data.testTypes ? JSON.stringify(data.testTypes) : null,
    }
  })

  return NextResponse.json(category)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.reportCategory.delete({
    where: { id }
  })

  return NextResponse.json({ success: true })
}
