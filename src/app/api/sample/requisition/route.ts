import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// 获取样品领用记录列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const sampleId = searchParams.get('sampleId')
  const status = searchParams.get('status')
  const requisitionBy = searchParams.get('requisitionBy')

  const where: any = {}
  if (sampleId) where.sampleId = sampleId
  if (status) where.status = status
  if (requisitionBy) where.requisitionBy = requisitionBy

  const [list, total] = await Promise.all([
    prisma.sampleRequisition.findMany({
      where,
      include: {
        sample: {
          select: {
            sampleNo: true,
            name: true,
            specification: true,
            unit: true,
          }
        }
      },
      orderBy: { requisitionDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.sampleRequisition.count({ where }),
  ])

  return NextResponse.json({ list, total, page, pageSize })
}

// 创建样品分配记录（预约模式：不扣减库存，状态为 pending）
export async function POST(request: NextRequest) {
  const data = await request.json()
  const { sampleId, quantity, purpose, remark, expectedReturnDate, requisitionBy } = data

  const reqQty = parseFloat(quantity)
  if (isNaN(reqQty) || reqQty <= 0) {
    return NextResponse.json({ error: '分配数量必须大于0' }, { status: 400 })
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 验证样品是否存在
      const sample = await tx.sample.findUnique({ where: { id: sampleId } })
      if (!sample) {
        throw new Error('样品不存在')
      }

      // 校验：只有已收样及之后的状态才允许分配
      if (sample.status === 'pending') {
        throw new Error('该样品尚未完成收样，请先在「样品收样」中确认收样后再分配')
      }

      // 生成领用单号
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const count = await tx.sampleRequisition.count({
        where: { requisitionNo: { startsWith: `LY${today}` } }
      })
      const requisitionNo = `LY${today}${String(count + 1).padStart(4, '0')}`

      // 创建分配记录，状态为 pending（待接收），不扣减库存
      const requisition = await tx.sampleRequisition.create({
        data: {
          sampleId,
          requisitionNo,
          quantity: String(reqQty),
          purpose,
          remark,
          expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : null,
          requisitionBy,
          status: 'pending', // 待接收
        }
      })

      return requisition
    })

    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '分配失败' }, { status: 400 })
  }
}

// 接收样品（互斥检查：同一样品同时只能一人持有）
export async function PATCH(request: NextRequest) {
  const data = await request.json()
  const { id } = data // requisition ID

  if (!id) {
    return NextResponse.json({ error: '缺少记录ID' }, { status: 400 })
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. 获取分配记录
      const requisition = await tx.sampleRequisition.findUnique({
        where: { id },
        include: { sample: true }
      })

      if (!requisition) {
        throw new Error('分配记录不存在')
      }

      if (requisition.status !== 'pending') {
        throw new Error('只有待接收状态的记录才能接收')
      }

      // 2. 互斥检查：同一样品是否有人正在使用
      const activeUser = await tx.sampleRequisition.findFirst({
        where: {
          sampleId: requisition.sampleId,
          status: 'requisitioned', // 使用中
          id: { not: id },
        },
        select: { requisitionBy: true }
      })

      if (activeUser) {
        throw new Error(`${activeUser.requisitionBy} 正在使用该样品，请等待归还后再接收`)
      }

      // 3. 扣减库存
      const sample = requisition.sample
      const totalQtyStr = sample.totalQuantity || sample.quantity || '0'
      const totalQty = parseFloat(totalQtyStr)
      let currentRemaining = parseFloat(sample.remainingQuantity ?? String(totalQty))
      if (sample.remainingQuantity === null) {
        currentRemaining = totalQty
      }
      if (isNaN(currentRemaining)) {
        currentRemaining = 0
      }

      const reqQty = parseFloat(requisition.quantity)
      if (reqQty > currentRemaining) {
        throw new Error(`库存不足，当前可用: ${currentRemaining}`)
      }

      const newRemaining = currentRemaining - reqQty
      await tx.sample.update({
        where: { id: requisition.sampleId },
        data: { remainingQuantity: String(newRemaining) }
      })

      // 4. 更新状态为使用中
      const updated = await tx.sampleRequisition.update({
        where: { id },
        data: { status: 'requisitioned' }
      })

      return updated
    })

    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '接收失败' }, { status: 400 })
  }
}

// 归还/更新领用记录
export async function PUT(request: NextRequest) {
  const data = await request.json()
  const { id, returnDate, status } = data // id is requisitionId

  if (!id) {
    return NextResponse.json({ error: '缺少记录ID' }, { status: 400 })
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. 获取领用记录
      const requisition = await tx.sampleRequisition.findUnique({
        where: { id },
        include: { sample: true }
      })

      if (!requisition) {
        throw new Error('领用记录不存在')
      }

      if (requisition.status === 'returned') {
        throw new Error('该记录已归还，请勿重复操作')
      }

      // 2. 更新领用记录状态
      const updatedRequisition = await tx.sampleRequisition.update({
        where: { id },
        data: {
          status: 'returned',
          actualReturnDate: returnDate ? new Date(returnDate) : new Date(),
        }
      })

      // 3. 归还库存
      // 增加样品的 remainingQuantity
      const returnQty = parseFloat(requisition.quantity)
      const currentRemaining = parseFloat(requisition.sample.remainingQuantity || '0')
      // 注意：这里我们假设 sample.remainingQuantity 肯定有值（因为领用时已初始化）。
      // 防御性编程：
      const newRemaining = currentRemaining + returnQty

      // 确保不超过总量? (虽然理论上不会，除非数据被篡改)
      const totalQty = parseFloat(requisition.sample.totalQuantity || requisition.sample.quantity || '0')
      const finalRemaining = newRemaining > totalQty ? totalQty : newRemaining

      await tx.sample.update({
        where: { id: requisition.sampleId },
        data: {
          remainingQuantity: String(finalRemaining)
        }
      })

      return updatedRequisition
    })

    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '归还失败' }, { status: 400 })
  }
}
