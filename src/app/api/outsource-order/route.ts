import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success, validateRequired } from '@/lib/api-handler'
import { generateNo, NumberPrefixes } from '@/lib/generate-no'

// 获取委外订单列表 - 需要登录
export const GET = withAuth(async (request: NextRequest, user) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const status = searchParams.get('status')
  const supplierId = searchParams.get('supplierId')
  const keyword = searchParams.get('keyword')

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (supplierId) where.supplierId = supplierId
  if (keyword) {
    where.OR = [
      { orderNo: { contains: keyword } },
      { supplierName: { contains: keyword } },
      { supplier: { name: { contains: keyword } } },
    ]
  }

  const [list, total] = await Promise.all([
    prisma.outsourceOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        supplier: { select: { id: true, name: true } },
      },
    }),
    prisma.outsourceOrder.count({ where }),
  ])

  // 统计各状态数量
  const stats = await prisma.outsourceOrder.groupBy({
    by: ['status'],
    _count: true,
  })

  // 统计总费用
  const totalAmount = await prisma.outsourceOrder.aggregate({
    _sum: { amount: true },
  })

  return success({
    list: list.map((item: any) => ({
      ...item,
      amount: item.amount ? Number(item.amount) : 0,
    })),
    total,
    page,
    pageSize,
    stats: {
      ...stats.reduce((acc: any, item: any) => {
        acc[item.status] = item._count
        return acc
      }, {} as Record<string, number>),
      totalAmount: Number(totalAmount._sum?.amount || 0),
    },
  })
})

// 创建委外订单 - 需要登录
export const POST = withAuth(async (request: NextRequest, user) => {
  const data = await request.json()

  validateRequired(data, ['supplierId'])

  const orderNo = await generateNo(NumberPrefixes.ENTRUSTMENT, 4)

  const order = await prisma.outsourceOrder.create({
    data: {
      orderNo,
      supplierId: data.supplierId,
      supplierName: data.supplierName || null,
      taskId: data.taskId || null,
      items: data.items ? JSON.stringify(data.items) : null,
      status: 'pending',
      expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
      amount: data.amount || 0,
      remark: data.remark || null,
    },
    include: { supplier: true },
  })

  return success({
    ...order,
    amount: order.amount ? Number(order.amount) : 0,
  })
})
