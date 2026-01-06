import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, notFound, validateEnum } from '@/lib/api-handler'

// 获取单个委外订单
export const GET = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<{ id: string }> }
) => {
  const { id } = await context!.params

  const order = await prisma.outsourceOrder.findUnique({
    where: { id },
    include: {
      supplier: { select: { id: true, name: true } },
    },
  })

  if (!order) {
    notFound('委外订单不存在')
  }

  return success({
    ...order,
    cost: Number(order!.cost),
  })
})

// 更新委外订单
export const PUT = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<{ id: string }> }
) => {
  const { id } = await context!.params
  const data = await request.json()

  const existing = await prisma.outsourceOrder.findUnique({ where: { id } })
  if (!existing) {
    notFound('委外订单不存在')
  }

  // 验证状态
  if (data.status) {
    validateEnum(data.status, ['pending', 'sent', 'testing', 'completed', 'returned'], 'status')
  }

  const order = await prisma.outsourceOrder.update({
    where: { id },
    data: {
      ...(data.supplierId && { supplierId: data.supplierId }),
      ...(data.entrustmentNo !== undefined && { entrustmentNo: data.entrustmentNo }),
      ...(data.clientName !== undefined && { clientName: data.clientName }),
      ...(data.sampleName && { sampleName: data.sampleName }),
      ...(data.testItems && { testItems: data.testItems }),
      ...(data.status && { status: data.status }),
      ...(data.sendDate !== undefined && { sendDate: data.sendDate ? new Date(data.sendDate) : null }),
      ...(data.expectedDate !== undefined && { expectedDate: data.expectedDate ? new Date(data.expectedDate) : null }),
      ...(data.actualDate !== undefined && { actualDate: data.actualDate ? new Date(data.actualDate) : null }),
      ...(data.cost !== undefined && { cost: data.cost }),
      ...(data.progress !== undefined && { progress: data.progress }),
      ...(data.remark !== undefined && { remark: data.remark }),
    },
    include: { supplier: true },
  })

  return success({
    ...order,
    cost: Number(order.cost),
  })
})

// 删除委外订单
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<{ id: string }> }
) => {
  const { id } = await context!.params

  const existing = await prisma.outsourceOrder.findUnique({ where: { id } })
  if (!existing) {
    notFound('委外订单不存在')
  }

  await prisma.outsourceOrder.delete({ where: { id } })

  return success({ message: '删除成功' })
})
