import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, notFound, badRequest } from '@/lib/api-handler'

// 获取单个分类
export const GET = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params

  const category = await prisma.supplierCategory.findUnique({
    where: { id },
  })

  if (!category) {
    notFound('分类不存在')
  }

  return success(category)
})

// 更新分类
export const PUT = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const data = await request.json()

  const existing = await prisma.supplierCategory.findUnique({ where: { id } })
  if (!existing) {
    notFound('分类不存在')
  }

  const category = await prisma.supplierCategory.update({
    where: { id },
    data: {
      name: data.name,
      code: data.code,
      parentId: data.parentId,
      description: data.description,
      sort: data.sort,
      status: data.status,
    },
  })

  return success(category)
})

// 删除分类
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params

  // 检查是否有子分类
  const children = await prisma.supplierCategory.count({ where: { parentId: id } })
  if (children > 0) {
    badRequest('请先删除子分类')
  }

  // 检查是否有关联的供应商
  const suppliers = await prisma.supplier.count({ where: { categoryId: id } })
  if (suppliers > 0) {
    badRequest('该分类下有供应商，无法删除')
  }

  await prisma.supplierCategory.delete({ where: { id } })

  return success({ success: true })
})
