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

  const consumable = await prisma.consumable.update({
    where: { id },
    data: {
      code: data.code,
      name: data.name,
      categoryId: data.categoryId,
      specification: data.specification,
      unit: data.unit,
      stockQuantity: data.stockQuantity !== undefined ? data.stockQuantity : undefined,
      minStock: data.minStock !== undefined ? data.minStock : undefined,
      location: data.location,
      status: data.status !== undefined ? parseInt(data.status) : undefined,
      remark: data.remark,
    },
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
