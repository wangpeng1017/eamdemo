import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-handler'

// 获取当前用户的任务列表 - 需要登录
export const GET = withAuth(async (request: NextRequest, user) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const status = searchParams.get('status')

  const where: Record<string, unknown> = {
    assignedToId: user.id
  }
  if (status) where.status = status

  const [list, total] = await Promise.all([
    prisma.testTask.findMany({
      where,
      include: {
        sample: {
          select: {
            sampleNo: true,
            name: true,
            specification: true,
          }
        },
        device: {
          select: {
            deviceNo: true,
            name: true,
          }
        },
        entrustmentProject: {
          select: {
            name: true,
          }
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.testTask.count({ where }),
  ])

  // 统计各状态数量
  const stats = await prisma.testTask.groupBy({
    by: ['status'],
    where: { assignedToId: user.id },
    _count: true
  })

  return NextResponse.json({
    list,
    total,
    page,
    pageSize,
    stats: stats.reduce((acc: Record<string, number>, item: { status: string; _count: number }) => {
      acc[item.status] = item._count
      return acc
    }, {} as Record<string, number>)
  })
})
