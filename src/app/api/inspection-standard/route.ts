import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success } from '@/lib/api-handler'

// 获取检测标准列表 - 需要登录
export const GET = withAuth(async (request: NextRequest, user) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const validity = searchParams.get('validity')

  const where: Record<string, unknown> = {}
  if (validity) where.validity = validity

  const [list, total] = await Promise.all([
    prisma.inspectionStandard.findMany({
      where,
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
  })

  return success(standard)
})
