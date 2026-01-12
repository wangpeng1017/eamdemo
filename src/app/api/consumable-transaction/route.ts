import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success, badRequest } from '@/lib/api-handler'
import { generateNo } from '@/lib/generate-no'
import { Prisma } from '@prisma/client'
import { validate, validatePagination, createConsumableTransactionSchema } from '@/lib/validation'

// 获取出入库记录列表 - 需要登录
export const GET = withAuth(async (request: NextRequest, user) => {
  const { searchParams } = new URL(request.url)
  const { page, pageSize } = validatePagination(searchParams)
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
    list: list.map((item: any) => ({
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

// 创建出入库记录 - 需要登录
export const POST = withAuth(async (request: NextRequest, user) => {
  const data = await request.json()

  // 使用 Zod 验证输入
  const validated = validate(createConsumableTransactionSchema, data)

  // 获取易耗品信息
  const consumable = await prisma.consumable.findUnique({
    where: { id: validated.consumableId },
  })

  if (!consumable) {
    badRequest('易耗品不存在')
  }

  const currentStock = Number(consumable!.stockQuantity)

  // 检查出库数量
  if (validated.type === 'out' && validated.quantity > currentStock) {
    badRequest(`库存不足，当前库存: ${currentStock}`)
  }

  // 生成单据编号
  const prefix = validated.type === 'in' ? 'RK' : 'CK'
  const transactionNo = await generateNo(prefix, 4)

  // 使用默认单价（如果没有提供）
  const unitPrice = validated.unitPrice || 0
  const totalAmount = validated.quantity * unitPrice

  // 使用事务创建记录并更新库存
  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // 创建出入库记录
    const transaction = await tx.consumableTransaction.create({
      data: {
        transactionNo,
        type: validated.type,
        consumableId: validated.consumableId,
        quantity: validated.quantity,
        unitPrice,
        totalAmount,
        reason: validated.reason,
        relatedOrder: validated.relatedOrder || null,
        operator: validated.operator,
        transactionDate: validated.transactionDate ? new Date(validated.transactionDate) : new Date(),
        remark: validated.remark || null,
      },
      include: { consumable: true },
    })

    // 更新库存
    const newStock = validated.type === 'in'
      ? currentStock + validated.quantity
      : currentStock - validated.quantity

    // 计算新状态
    let status = 1 // 正常
    if (newStock === 0) {
      status = 0 // 缺货
    } else if (consumable!.minStock && newStock < Number(consumable!.minStock)) {
      status = 2 // 低库存
    }

    await tx.consumable.update({
      where: { id: validated.consumableId },
      data: { stockQuantity: newStock, status },
    })

    return transaction
  })

  return success({
    ...result,
    unitPrice: Number(result.unitPrice),
    totalAmount: Number(result.totalAmount),
  })
})
