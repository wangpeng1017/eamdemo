import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, validateRequired } from '@/lib/api-handler'

// 获取供应商分类列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const parentId = searchParams.get('parentId')
  const tree = searchParams.get('tree') === 'true'

  const where: Record<string, unknown> = {}
  if (parentId) {
    where.parentId = parentId
  } else if (!tree) {
    // 默认只返回顶级分类
    where.parentId = null
  }

  const categories = await prisma.supplierCategory.findMany({
    where,
    orderBy: { sort: 'asc' },
  })

  // 如果需要树形结构
  if (tree) {
    const buildTree = (items: typeof categories, parentId: string | null = null): typeof categories => {
      return items
        .filter(item => item.parentId === parentId)
        .map(item => ({
          ...item,
          children: buildTree(items, item.id),
        }))
    }
    return success(buildTree(categories))
  }

  return success({ list: categories, total: categories.length })
})

// 创建供应商分类
export const POST = withErrorHandler(async (request: NextRequest) => {
  const data = await request.json()

  validateRequired(data, ['name', 'code'])

  const category = await prisma.supplierCategory.create({
    data: {
      name: data.name,
      code: data.code,
      parentId: data.parentId || null,
      description: data.description || null,
      sort: data.sort || 0,
      status: data.status ?? true,
    },
  })

  return success(category)
})
