import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, unauthorized } from '@/lib/api-handler'
import { auth } from '@/lib/auth'

// 获取当前用户的样品领用列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const session = await auth()
  if (!session?.user) {
    return unauthorized('未登录')
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const status = searchParams.get('status')

  const where: Record<string, unknown> = {
    requisitionBy: session.user.name
  }
  if (status) where.status = status

  const [list, total] = await Promise.all([
    prisma.sampleRequisition.findMany({
      where,
      include: {
        sample: {
          select: {
            sampleNo: true,
            name: true,
            specification: true,
            unit: true,
          }
        }
      },
      orderBy: { requisitionDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.sampleRequisition.count({ where }),
  ])

  // 统计各状态数量
  const stats = await prisma.sampleRequisition.groupBy({
    by: ['status'],
    where: { requisitionBy: session.user.name || undefined },
    _count: true
  })

  return success({
    list,
    total,
    page,
    pageSize,
    stats: stats.reduce((acc: any, item: any) => {
      acc[item.status] = item._count
      return acc
    }, {} as Record<string, number>)
  })
})
