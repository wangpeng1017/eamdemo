import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// 获取单个领用记录详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const requisition = await prisma.sampleRequisition.findUnique({
    where: { id },
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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const data = await request.json()
  const { actualReturnDate, status, remark } = data

  const requisition = await prisma.sampleRequisition.update({
    where: { id },
    data: {
      actualReturnDate: actualReturnDate ? new Date(actualReturnDate) : null,
      status: status || 'returned',
      remark,
    }
  })

  return NextResponse.json(requisition)
}

// 删除领用记录 - 仅领用中状态可删，删除时回写样品库存
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    await prisma.$transaction(async (tx) => {
      // 1. 获取领用记录
      const requisition = await tx.sampleRequisition.findUnique({
        where: { id },
        include: { sample: true }
      })

      if (!requisition) {
        throw new Error('领用记录不存在')
      }

      // 2. 校验状态：仅领用中可删除
      if (requisition.status !== 'requisitioned') {
        throw new Error('仅"领用中"状态的记录可以删除')
      }

      // 3. 回写样品库存
      const returnQty = parseFloat(requisition.quantity)
      const currentRemaining = parseFloat(requisition.sample.remainingQuantity || '0')
      const totalQty = parseFloat(requisition.sample.totalQuantity || requisition.sample.quantity || '0')
      const newRemaining = Math.min(currentRemaining + returnQty, totalQty)

      await tx.sample.update({
        where: { id: requisition.sampleId },
        data: {
          remainingQuantity: String(newRemaining)
        }
      })

      // 4. 删除领用记录
      await tx.sampleRequisition.delete({
        where: { id }
      })
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '删除失败' }, { status: 400 })
  }
}
