import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success, notFound, badRequest } from '@/lib/api-handler'

// 获取单个易耗品 - 需要登录
export const GET = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
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
    stockQuantity: Number(consumable.stockQuantity),
    minStock: consumable.minStock ? Number(consumable.minStock) : null,
  })
})

// 更新易耗品 - 需要登录
export const PUT = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const data = await request.json()

  const existing = await prisma.consumable.findUnique({ where: { id } })
  if (!existing) {
    notFound('易耗品不存在')
  }

  // 只提取 schema 中存在的字段，忽略前端多余字段（如 unitPrice, maxStock, supplier, expiryDate）
  const updateData: Record<string, unknown> = {}
  if (data.code !== undefined) updateData.code = data.code
  if (data.name !== undefined) updateData.name = data.name
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId || null
  if (data.specification !== undefined) updateData.specification = data.specification || null
  if (data.unit !== undefined) updateData.unit = data.unit
  // 兼容前端可能传 currentStock 或 stockQuantity
  if (data.stockQuantity !== undefined) updateData.stockQuantity = data.stockQuantity
  else if (data.currentStock !== undefined) updateData.stockQuantity = data.currentStock
  if (data.minStock !== undefined) updateData.minStock = data.minStock
  if (data.location !== undefined) updateData.location = data.location || null
  if (data.remark !== undefined) updateData.remark = data.remark || null
  // status 兼容字符串和数字：字符串值映射为 Int，数字直接使用
  if (data.status !== undefined) {
    if (typeof data.status === 'string') {
      const statusMap: Record<string, number> = { normal: 1, low: 1, out: 0, expired: 0 }
      updateData.status = statusMap[data.status] ?? (parseInt(data.status) || 1)
    } else {
      updateData.status = parseInt(data.status)
    }
  }

  const consumable = await prisma.consumable.update({
    where: { id },
    data: updateData,
    include: { category: true },
  })

  return success({
    ...consumable,
    stockQuantity: Number(consumable.stockQuantity),
    minStock: consumable.minStock ? Number(consumable.minStock) : null,
  })
})

// 删除易耗品 - 需要登录，检查关联数据
export const DELETE = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params

  const existing = await prisma.consumable.findUnique({ where: { id } })
  if (!existing) {
    notFound('易耗品不存在')
  }

  // 检查是否有关联的出入库记录
  const transactionCount = await prisma.consumableTransaction.count({
    where: { consumableId: id }
  })
  if (transactionCount > 0) {
    badRequest(`无法删除：该易耗品有 ${transactionCount} 条出入库记录`)
  }

  await prisma.consumable.delete({ where: { id } })

  return success({ success: true })
})
