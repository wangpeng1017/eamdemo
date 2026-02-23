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

// 更新供应商 - 需要登录，字段白名单
export const PUT = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const data = await request.json()

  // 字段白名单过滤
  const supplier = await prisma.supplier.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.contact !== undefined && { contact: data.contact }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.qualification !== undefined && { qualification: data.qualification }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.remark !== undefined && { remark: data.remark }),
    }
  })
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
