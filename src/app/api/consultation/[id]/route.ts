import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// 获取单个咨询（含跟进记录）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const consultation = await prisma.consultation.findUnique({
    where: { id },
    include: {
      followUps: {
        orderBy: { date: 'desc' },
      },
      client: true,  // 添加客户关联查询
    },
  })

  if (!consultation) {
    return NextResponse.json({ error: 'Consultation not found' }, { status: 404 })
  }

  // 解析 JSON 字符串字段为数组
  const parsed = {
    ...consultation,
    testItems: consultation.testItems ? JSON.parse(consultation.testItems) : [],
  }

  return NextResponse.json(parsed)
}

// 更新咨询
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const data = await request.json()

  // 如果 testItems 是数组，转换为 JSON 字符串
  const updateData: any = { ...data }
  if (data.testItems && Array.isArray(data.testItems)) {
    updateData.testItems = JSON.stringify(data.testItems)
  }

  const consultation = await prisma.consultation.update({
    where: { id },
    data: updateData,
  })

  // 返回时也要解析为数组
  const parsed = {
    ...consultation,
    testItems: consultation.testItems ? JSON.parse(consultation.testItems) : [],
  }

  return NextResponse.json(parsed)
}

// 删除咨询
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.consultation.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
