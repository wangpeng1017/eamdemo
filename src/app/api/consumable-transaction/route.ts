import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, validateRequired, badRequest } from '@/lib/api-handler'
import { generateNo, NumberPrefixes } from '@/lib/generate-no'

// 获取出入库记录列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const type = searchParams.get('type')
  const consumableId = searchParams.get('consumableId')
  const keyword = searchParams.get('keyword')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  const where: Record<string, unknown> = {}
  if (type) where.type = type
  if (consumableId) where.consumableId = consumableId
  if (keyword) {
    where.OR = [
      { transactionNo: { contains: keyword } },
      { consumable: { name: { contains: keyword } } },
    ]
  }
  if (startDate || endDate) {
    where.transactionDate = {}
    if (startDate) (where.transactionDate as Record<string, Date>).gte = new Date(startDate)
    if (endDate) (where.transactionDate as Record<string, Date>).lte = new Date(endDate)
  }

  const [list, total] = await Promise.all([
    prisma.consumableTransaction.findMany({
      where,
      orderBy: { transactionDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        consumable: { select: { id: true, code: true, name: true, unit: true } },
      },
    }),
    prisma.consumableTransaction.count({ where }),
  ])

  // 统计入库和出库总额
  const inTotal = await prisma.consumableTransaction.aggregate({
    where: { type: 'in' },
    _sum: { totalAmount: true },
  })
  const outTotal = await prisma.consumableTransaction.aggregate({
    where: { type: 'out' },
    _sum: { totalAmount: true },
  })

  return success({
    list: list.map(item => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      totalAmount: Number(item.totalAmount),
    })),
    total,
    page,
    pageSize,
    stats: {
      inTotal: Number(inTotal._sum.totalAmount || 0),
      outTotal: Number(outTotal._sum.totalAmount || 0),
    },
  })
})

// 创建出入库记录
export const POST = withErrorHandler(async (request: NextRequest) => {
  const data = await request.json()

  validateRequired(data, ['type', 'consumableId', 'quantity', 'reason', 'operator'])

  // 获取易耗品信息
  const consumable = await prisma.consumable.findUnique({
    where: { id: data.consumableId },
  })

  if (!consumable) {
    badRequest('易耗品不存在')
  }

  // 检查出库数量
  if (data.type === 'out' && data.quantity > consumable!.currentStock) {
    badRequest(`库存不足，当前库存: ${consumable!.currentStock}`)
  }

  // 生成单据编号
  const prefix = data.type === 'in' ? 'RK' : 'CK'
  const transactionNo = await generateNo(prefix, 4)

  const totalAmount = data.quantity * Number(consumable!.unitPrice)

  // 使用事务创建记录并更新库存
  const result = await prisma.$transaction(async (tx) => {
    // 创建出入库记录
    const transaction = await tx.consumableTransaction.create({
      data: {
        transactionNo,
        type: data.type,
        consumableId: data.consumableId,
        quantity: data.quantity,
        unitPrice: consumable!.unitPrice,
        totalAmount,
        reason: data.reason,
        relatedOrder: data.relatedOrder || null,
        operator: data.operator,
        transactionDate: data.transactionDate ? new Date(data.transactionDate) : new Date(),
        remark: data.remark || null,
      },
      include: { consumable: true },
    })

    // 更新库存
    const newStock = data.type === 'in'
      ? consumable!.currentStock + data.quantity
      : consumable!.currentStock - data.quantity

    // 计算新状态
    let status = 'normal'
    if (newStock === 0) {
      status = 'out'
    } else if (newStock < consumable!.minStock) {
      status = 'low'
    }
    if (consumable!.expiryDate && consumable!.expiryDate < new Date()) {
      status = 'expired'
    }

    await tx.consumable.update({
      where: { id: data.consumableId },
      data: { currentStock: newStock, status },
    })

    return transaction
  })

  return success({
    ...result,
    unitPrice: Number(result.unitPrice),
    totalAmount: Number(result.totalAmount),
  })
})
