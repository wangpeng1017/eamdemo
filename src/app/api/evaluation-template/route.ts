import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, validateRequired } from '@/lib/api-handler'

// 获取评价模板列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const categoryId = searchParams.get('categoryId')
  const status = searchParams.get('status')

  const where: Record<string, unknown> = {}
  if (categoryId) where.categoryId = categoryId
  if (status !== null && status !== '') where.status = status === 'true'

  const [list, total] = await Promise.all([
    prisma.evaluationTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        category: { select: { id: true, name: true } },
        items: { orderBy: { sort: 'asc' } },
      },
    }),
    prisma.evaluationTemplate.count({ where }),
  ])

  return success({ list, total, page, pageSize })
})

// 创建评价模板
export const POST = withErrorHandler(async (request: NextRequest) => {
  const data = await request.json()

  validateRequired(data, ['name', 'code'])

  const template = await prisma.evaluationTemplate.create({
    data: {
      name: data.name,
      code: data.code,
      categoryId: data.categoryId || null,
      description: data.description || null,
      status: data.status ?? true,
      items: data.items ? {
        create: data.items.map((item: { name: string; weight: number; maxScore?: number; description?: string }, index: number) => ({
          name: item.name,
          weight: item.weight,
          maxScore: item.maxScore || 100,
          description: item.description || null,
          sort: index,
        })),
      } : undefined,
    },
    include: {
      category: true,
      items: true,
    },
  })

  return success(template)
})
