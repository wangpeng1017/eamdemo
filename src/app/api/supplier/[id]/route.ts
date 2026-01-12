import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success, notFound, badRequest } from '@/lib/api-handler'

// 获取供应商详情 - 需要登录
export const GET = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const supplier = await prisma.supplier.findUnique({ where: { id } })

  if (!supplier) {
    notFound('供应商不存在')
  }

  return success(supplier)
})

// 更新供应商 - 需要登录
export const PUT = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const data = await request.json()
  const supplier = await prisma.supplier.update({ where: { id }, data })
  return success(supplier)
})

// 删除供应商 - 需要登录，检查关联数据
export const DELETE = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params

  // 检查是否有关联的委外订单
  const orderCount = await prisma.outsourceOrder.count({
    where: { supplierId: id }
  })
  if (orderCount > 0) {
    badRequest(`无法删除：该供应商有 ${orderCount} 个关联委外订单`)
  }

  await prisma.supplier.delete({ where: { id } })
  return success({ success: true })
})
