import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, notFound } from '@/lib/api-handler'

// 获取单个易耗品
export const GET = withErrorHandler(async (
  request: NextRequest,
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

// 更新易耗品
export const PUT = withErrorHandler(async (
  request: NextRequest,
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

// 删除易耗品
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params

  const existing = await prisma.consumable.findUnique({ where: { id } })
  if (!existing) {
    notFound('易耗品不存在')
  }

  await prisma.consumable.delete({ where: { id } })

  return success({ success: true })
})
