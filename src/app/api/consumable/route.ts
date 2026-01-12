import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success, validateRequired } from '@/lib/api-handler'

// 获取易耗品列表 - 需要登录
export const GET = withAuth(async (request: NextRequest, user) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const categoryId = searchParams.get('categoryId')
  const status = searchParams.get('status')
  const keyword = searchParams.get('keyword')

  const where: Record<string, unknown> = {}
  if (categoryId) where.categoryId = categoryId
  if (status) where.status = parseInt(status)
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

  // 计算库存总量
  const totalStock = await prisma.consumable.aggregate({
    _sum: {
      stockQuantity: true,
    },
  })

  return success({
    list: list.map((item: any) => ({
      ...item,
      stockQuantity: Number(item.stockQuantity),
      minStock: item.minStock ? Number(item.minStock) : null,
    })),
    total,
    page,
    pageSize,
    totalStock: Number(totalStock._sum.stockQuantity || 0),
    stats: stats.reduce((acc: any, item: any) => {
      acc[item.status] = item._count
      return acc
    }, {} as Record<number, number>),
  })
})

// 创建易耗品 - 需要登录
export const POST = withAuth(async (request: NextRequest, user) => {
  const data = await request.json()

  validateRequired(data, ['code', 'name', 'unit'])

  // 计算状态: 1=正常, 0=禁用
  const status = data.status !== undefined ? parseInt(data.status) : 1

  const consumable = await prisma.consumable.create({
    data: {
      code: data.code,
      name: data.name,
      categoryId: data.categoryId || null,
      specification: data.specification || null,
      unit: data.unit,
      stockQuantity: data.stockQuantity || 0,
      minStock: data.minStock || null,
      location: data.location || null,
      status,
      remark: data.remark || null,
    },
    include: { category: true },
  })

  return success({
    ...consumable,
    stockQuantity: Number(consumable.stockQuantity),
    minStock: consumable.minStock ? Number(consumable.minStock) : null,
  })
})
