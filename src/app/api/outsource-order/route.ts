import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, validateRequired } from '@/lib/api-handler'
import { generateNo, NumberPrefixes } from '@/lib/generate-no'

// 获取委外订单列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const status = searchParams.get('status')
  const supplierId = searchParams.get('supplierId')
  const keyword = searchParams.get('keyword')
  const createdBy = searchParams.get('createdBy')

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (supplierId) where.supplierId = supplierId
  if (createdBy) where.createdBy = createdBy
  if (keyword) {
    where.OR = [
      { orderNo: { contains: keyword } },
      { sampleName: { contains: keyword } },
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
  const totalCost = await prisma.outsourceOrder.aggregate({
    _sum: { cost: true },
  })

  return success({
    list: list.map(item => ({
      ...item,
      cost: Number(item.cost || 0),
    })),
    total,
    page,
    pageSize,
    stats: {
      ...stats.reduce((acc, item) => {
        acc[item.status] = item._count
        return acc
      }, {} as Record<string, number>),
      totalCost: Number(totalCost._sum.cost || 0),
    },
  })
})

// 创建委外订单
export const POST = withErrorHandler(async (request: NextRequest) => {
  const data = await request.json()

  validateRequired(data, ['supplierId', 'sampleName', 'testItems'])

  const orderNo = await generateNo(NumberPrefixes.OUTSOURCE, 4)

  const order = await prisma.outsourceOrder.create({
    data: {
      orderNo,
      supplierId: data.supplierId,
      entrustmentNo: data.entrustmentNo || null,
      clientName: data.clientName || null,
      sampleName: data.sampleName,
      testItems: data.testItems,
      status: 'pending',
      sendDate: data.sendDate ? new Date(data.sendDate) : null,
      expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
      actualDate: null,
      cost: data.cost || 0,
      progress: 0,
      createdBy: data.createdBy || '系统',
      remark: data.remark || null,
    },
    include: { supplier: true },
  })

  return success({
    ...order,
    cost: Number(order.cost),
  })
})
