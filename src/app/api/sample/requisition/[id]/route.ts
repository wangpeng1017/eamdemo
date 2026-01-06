import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// 获取单个领用记录详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requisition = await prisma.sampleRequisition.findUnique({
    where: { id: params.id },
    include: {
      sample: true
    }
  })

  if (!requisition) {
    return NextResponse.json({ error: '领用记录不存在' }, { status: 404 })
  }

  return NextResponse.json(requisition)
}

// 更新领用记录（归还样品）
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const data = await request.json()
  const { actualReturnDate, status, remark } = data

  const requisition = await prisma.sampleRequisition.update({
    where: { id: params.id },
    data: {
      actualReturnDate: actualReturnDate ? new Date(actualReturnDate) : null,
      status: status || 'returned',
      remark,
    }
  })

  return NextResponse.json(requisition)
}

// 删除领用记录
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.sampleRequisition.delete({
    where: { id: params.id }
  })

  return NextResponse.json({ success: true })
}
