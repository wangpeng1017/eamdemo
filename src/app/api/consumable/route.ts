import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, validateRequired } from '@/lib/api-handler'

// 获取易耗品列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const categoryId = searchParams.get('categoryId')
  const status = searchParams.get('status')
  const keyword = searchParams.get('keyword')

  const where: Record<string, unknown> = {}
  if (categoryId) where.categoryId = categoryId
  if (status) where.status = status
  if (keyword) {
    where.OR = [
      { code: { contains: keyword } },
      { name: { contains: keyword } },
    ]
  }

  const [list, total] = await Promise.all([
    prisma.consumable.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        category: { select: { id: true, name: true } },
      },
    }),
    prisma.consumable.count({ where }),
  ])

  // 统计各状态数量
  const stats = await prisma.consumable.groupBy({
    by: ['status'],
    _count: true,
  })

  // 计算库存总值
  const totalValue = await prisma.consumable.aggregate({
    _sum: {
      currentStock: true,
    },
  })

  return success({
    list: list.map(item => ({
      ...item,
      unitPrice: Number(item.unitPrice),
    })),
    total,
    page,
    pageSize,
    stats: stats.reduce((acc, item) => {
      acc[item.status] = item._count
      return acc
    }, {} as Record<string, number>),
  })
})

// 创建易耗品
export const POST = withErrorHandler(async (request: NextRequest) => {
  const data = await request.json()

  validateRequired(data, ['code', 'name', 'unit'])

  // 计算状态
  let status = 'normal'
  if (data.currentStock === 0) {
    status = 'out'
  } else if (data.currentStock < (data.minStock || 0)) {
    status = 'low'
  }
  if (data.expiryDate && new Date(data.expiryDate) < new Date()) {
    status = 'expired'
  }

  const consumable = await prisma.consumable.create({
    data: {
      code: data.code,
      name: data.name,
      categoryId: data.categoryId || null,
      specification: data.specification || null,
      unit: data.unit,
      currentStock: data.currentStock || 0,
      minStock: data.minStock || 0,
      maxStock: data.maxStock || 0,
      unitPrice: data.unitPrice || 0,
      supplier: data.supplier || null,
      location: data.location || null,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      status,
      remark: data.remark || null,
    },
    include: { category: true },
  })

  return success({
    ...consumable,
    unitPrice: Number(consumable.unitPrice),
  })
})
