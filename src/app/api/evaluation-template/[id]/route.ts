import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, notFound, validateRequired } from '@/lib/api-handler'

// 获取单个模板
export const GET = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params

  const template = await prisma.evaluationTemplate.findUnique({
    where: { id },
    include: {
      category: true,
      items: { orderBy: { sort: 'asc' } },
    },
  })

  if (!template) {
    notFound('模板不存在')
  }

  return success(template)
})

// 更新模板
export const PUT = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const data = await request.json()

  const existing = await prisma.evaluationTemplate.findUnique({ where: { id } })
  if (!existing) {
    notFound('模板不存在')
  }

  // 使用事务更新模板和评价项
  const template = await prisma.$transaction(async (tx) => {
    // 更新模板基本信息
    await tx.evaluationTemplate.update({
      where: { id },
      data: {
        name: data.name,
        code: data.code,
        categoryId: data.categoryId,
        description: data.description,
        status: data.status,
      },
    })

    // 如果提供了评价项，先删除旧的再创建新的
    if (data.items) {
      await tx.evaluationTemplateItem.deleteMany({ where: { templateId: id } })
      await tx.evaluationTemplateItem.createMany({
        data: data.items.map((item: { name: string; weight: number; maxScore?: number; description?: string }, index: number) => ({
          templateId: id,
          name: item.name,
          weight: item.weight,
          maxScore: item.maxScore || 100,
          description: item.description || null,
          sort: index,
        })),
      })
    }

    return tx.evaluationTemplate.findUnique({
      where: { id },
      include: { category: true, items: { orderBy: { sort: 'asc' } } },
    })
  })

  return success(template)
})

// 删除模板
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params

  const existing = await prisma.evaluationTemplate.findUnique({ where: { id } })
  if (!existing) {
    notFound('模板不存在')
  }

  await prisma.evaluationTemplate.delete({ where: { id } })

  return success({ success: true })
})
