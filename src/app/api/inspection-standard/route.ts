import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success } from '@/lib/api-handler'

// 获取检测标准列表 - 需要登录
export const GET = withAuth(async (request: NextRequest, user) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const validity = searchParams.get('validity')
  const categoryId = searchParams.get('categoryId')

  const where: Record<string, unknown> = {}
  if (validity) where.validity = validity
  if (categoryId) where.categoryId = categoryId

  const [list, total] = await Promise.all([
    prisma.inspectionStandard.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.inspectionStandard.count({ where }),
  ])

  return success({ list, total, page, pageSize })
})

// 创建检测标准 - 需要登录
export const POST = withAuth(async (request: NextRequest, user) => {
  const data = await request.json()

  const standard = await prisma.inspectionStandard.create({
    data,
    include: {
      category: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  })

  return success(standard)
})
