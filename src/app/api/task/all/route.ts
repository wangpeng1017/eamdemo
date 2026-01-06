import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// 获取全部任务
export async function GET(request: NextRequest) {
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
    _count: true
  })

  return NextResponse.json({
    list,
    total,
    page,
    pageSize,
    stats: stats.reduce((acc, item) => {
      acc[item.status] = item._count
      return acc
    }, {} as Record<string, number>)
  })
}

// 创建任务
export async function POST(request: NextRequest) {
  const data = await request.json()
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')

  // 新 PRD 编号规则: T + 年月日 + 序号
  const count = await prisma.testTask.count({
    where: { taskNo: { startsWith: `T${today}` } }
  })
  const taskNo = `T${today}${String(count + 1).padStart(3, '0')}`

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
}
