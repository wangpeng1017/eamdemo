import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, notFound } from '@/lib/api-handler'

// 获取单个易耗品
export const GET = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<{ id: string }> }
) => {
  const { id } = await context!.params

  const consumable = await prisma.consumable.findUnique({
    where: { id },
    include: { category: true },
  })

  if (!consumable) {
    notFound('易耗品不存在')
  }

  return success({
    ...consumable,
    unitPrice: Number(consumable.unitPrice),
  })
})

// 更新易耗品
export const PUT = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<{ id: string }> }
) => {
  const { id } = await context!.params
  const data = await request.json()

  const existing = await prisma.consumable.findUnique({ where: { id } })
  if (!existing) {
    notFound('易耗品不存在')
  }

  // 计算状态
  const currentStock = data.currentStock ?? existing.currentStock
  const minStock = data.minStock ?? existing.minStock
  const expiryDate = data.expiryDate ? new Date(data.expiryDate) : existing.expiryDate

  let status = 'normal'
  if (currentStock === 0) {
    status = 'out'
  } else if (currentStock < minStock) {
    status = 'low'
  }
  if (expiryDate && expiryDate < new Date()) {
    status = 'expired'
  }

  const consumable = await prisma.consumable.update({
    where: { id },
    data: {
      code: data.code,
      name: data.name,
      categoryId: data.categoryId,
      specification: data.specification,
      unit: data.unit,
      currentStock,
      minStock,
      maxStock: data.maxStock,
      unitPrice: data.unitPrice,
      supplier: data.supplier,
      location: data.location,
      expiryDate,
      status,
      remark: data.remark,
    },
    include: { category: true },
  })

  return success({
    ...consumable,
    unitPrice: Number(consumable.unitPrice),
  })
})

// 删除易耗品
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<{ id: string }> }
) => {
  const { id } = await context!.params

  const existing = await prisma.consumable.findUnique({ where: { id } })
  if (!existing) {
    notFound('易耗品不存在')
  }

  await prisma.consumable.delete({ where: { id } })

  return success({ success: true })
})
