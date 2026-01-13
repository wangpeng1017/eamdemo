import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/api-handler'

// 获取全部任务（需要登录）
export const GET = withAuth(async (request: NextRequest, user: AuthUser) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const status = searchParams.get('status')
  const keyword = searchParams.get('keyword')
  const assignedTo = searchParams.get('assignedTo')

  const where: any = {}
  if (status) where.status = status
  if (assignedTo) where.assignedToId = assignedTo
  if (keyword) {
    where.OR = [
      { taskNo: { contains: keyword } },
      { sampleName: { contains: keyword } },
    ]
  }

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
        assignedTo: {
          select: {
            id: true,
            name: true,
            username: true,
          }
        },
        testData: true  // 添加检测数据
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
    _count: true
  })

  return NextResponse.json({
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

// 创建任务（需要登录）
export const POST = withAuth(async (request: NextRequest, user: AuthUser) => {
  const data = await request.json()

  // 使用统一的编号生成函数
  const { generateNo, NumberPrefixes } = await import('@/lib/generate-no')
  const taskNo = await generateNo(NumberPrefixes.TASK, 3)

  const task = await prisma.testTask.create({
    data: {
      ...data,
      taskNo,
      status: 'pending',
    },
    include: {
      sample: true,
      device: true,
      assignedTo: true,
    }
  })

  return NextResponse.json(task)
})
