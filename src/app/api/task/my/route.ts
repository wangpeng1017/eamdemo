import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// 获取当前用户的任务列表
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      // 未登录时返回空数据而不是401，避免前端报错
      return NextResponse.json({
        list: [],
        total: 0,
        page: 1,
        pageSize: 10,
        stats: {}
      })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {
      assignedToId: session.user.id
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
          }
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
      where: { assignedToId: session.user.id },
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
  } catch (error) {
    console.error('获取我的任务失败:', error)
    return NextResponse.json({
      list: [],
      total: 0,
      page: 1,
      pageSize: 10,
      stats: {}
    })
  }
}
