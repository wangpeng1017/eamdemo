import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthUser } from '@/lib/api-handler'
import { getEntrustmentBasedFilter } from '@/lib/data-permission'

// 获取全部任务（需要登录 + 数据权限过滤）
export const GET = withAuth(async (request: NextRequest, user: AuthUser) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const status = searchParams.get('status')
  const keyword = searchParams.get('keyword')
  const assignedTo = searchParams.get('assignedTo')

  // 注入数据权限过滤
  // 除委托单链路过滤外，还需包含直接分配给当前用户的任务
  const permissionFilter = await getEntrustmentBasedFilter(user.id)
  let where: any = { isOutsourced: false }

  if (Object.keys(permissionFilter).length > 0) {
    // 有权限过滤条件（非 all 权限），增加 OR：委托单链路 或 直接分配给我
    where.OR = [
      permissionFilter,
      { assignedToId: user.id }
    ]
  }
  // 如果 permissionFilter 为空（all 权限），where 保持空对象=无过滤
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
        testData: true,  // 添加检测数据
        entrustmentProject: {
          select: {
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

  // 批量查询委托编号
  const entrustmentIds = [...new Set(list.map((t: any) => t.entrustmentId).filter(Boolean))]
  let entrustmentMap: Record<string, string> = {}
  if (entrustmentIds.length > 0) {
    const entrustments = await prisma.entrustment.findMany({
      where: { id: { in: entrustmentIds } },
      select: { id: true, entrustmentNo: true },
    })
    entrustmentMap = entrustments.reduce((acc: Record<string, string>, e: any) => {
      acc[e.id] = e.entrustmentNo
      return acc
    }, {})
  }

  // 批量回填样品数据：sampleId 为空时通过 entrustmentId + sampleName 匹配
  const tasksNeedSample = list.filter((t: any) => !t.sampleId && t.entrustmentId)
  const needSampleEntrustmentIds = [...new Set(tasksNeedSample.map((t: any) => t.entrustmentId))]
  let samplesByEntrustment: Record<string, any[]> = {}
  if (needSampleEntrustmentIds.length > 0) {
    const samples = await prisma.sample.findMany({
      where: { entrustmentId: { in: needSampleEntrustmentIds } },
      select: { id: true, sampleNo: true, name: true, entrustmentId: true, specification: true },
    })
    for (const s of samples) {
      if (!samplesByEntrustment[s.entrustmentId!]) samplesByEntrustment[s.entrustmentId!] = []
      samplesByEntrustment[s.entrustmentId!].push(s)
    }
  }

  const enrichedList = list.map((task: any) => {
    const enriched = {
      ...task,
      entrustmentNo: task.entrustmentId ? entrustmentMap[task.entrustmentId] || null : null,
    }
    if (!enriched.sample && task.entrustmentId) {
      const candidates = samplesByEntrustment[task.entrustmentId] || []
      const matched = candidates.find((s: any) => s.name === task.sampleName) || candidates[0]
      if (matched) {
        enriched.sample = { sampleNo: matched.sampleNo, name: matched.name, specification: matched.specification }
      }
    }
    return enriched
  })

  // 统计各状态数量
  const stats = await prisma.testTask.groupBy({
    by: ['status'],
    _count: true
  })

  return NextResponse.json({
    list: enrichedList,
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
  const taskNo = await generateNo(NumberPrefixes.TASK)

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
