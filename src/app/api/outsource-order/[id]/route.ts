import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, notFound, validateEnum } from '@/lib/api-handler'

// 获取单个委外订单
export const GET = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params

  const order = await prisma.outsourceOrder.findUnique({
    where: { orderNo: id },
    include: {
      supplier: { select: { id: true, name: true } },
    },
  })

  if (!order) {
    notFound('委外订单不存在')
  }

  return success({
    ...order,
    amount: order!.amount ? Number(order!.amount) : 0,
  })
})

// 更新委外订单
export const PUT = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const data = await request.json()

  const existing = await prisma.outsourceOrder.findUnique({ where: { orderNo: id } })
  if (!existing) {
    notFound('委外订单不存在')
  }

  // 验证状态
  if (data.status) {
    validateEnum(data.status, ['pending', 'processing', 'completed'] as const, 'status')
  }

  const order = await prisma.outsourceOrder.update({
    where: { orderNo: id },
    data: {
      ...(data.supplierId && { supplierId: data.supplierId }),
      ...(data.supplierName !== undefined && { supplierName: data.supplierName }),
      ...(data.taskId !== undefined && { taskId: data.taskId }),
      ...(data.items !== undefined && { items: data.items ? JSON.stringify(data.items) : null }),
      ...(data.status && { status: data.status }),
      ...(data.expectedDate !== undefined && { expectedDate: data.expectedDate ? new Date(data.expectedDate) : null }),
      ...(data.completedDate !== undefined && { completedDate: data.completedDate ? new Date(data.completedDate) : null }),
      ...(data.amount !== undefined && { amount: data.amount }),
      ...(data.remark !== undefined && { remark: data.remark }),
    },
    include: { supplier: true },
  })

  return success({
    ...order,
    amount: order.amount ? Number(order.amount) : 0,
  })
})

// 删除委外订单
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params

  const existing = await prisma.outsourceOrder.findUnique({ where: { orderNo: id } })
  if (!existing) {
    notFound('委外订单不存在')
  }

  await prisma.outsourceOrder.delete({ where: { orderNo: id } })

  return success({ message: '删除成功' })
})
