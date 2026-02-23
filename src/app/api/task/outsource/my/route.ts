import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-handler'

// 获取「我的外包」- 当前用户作为内部负责人（subcontractAssignee）的外包任务
export const GET = withAuth(async (request: NextRequest, user) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const status = searchParams.get('status')
  const keyword = searchParams.get('keyword')

  const where: any = {
    isOutsourced: true,
    entrustmentProject: {
      subcontractAssignee: user.id,
    },
  }

  if (status) where.status = status
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
          },
        },
        device: {
          select: {
            deviceNo: true,
            name: true,
          },
        },
        entrustmentProject: {
          select: {
            name: true,
            subcontractor: true,
            subcontractAssignee: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
          },
        },
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

  // 批量回填样品数据
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
    where: { isOutsourced: true, entrustmentProject: { subcontractAssignee: user.id } },
    _count: true,
  })

  return NextResponse.json({
    list: enrichedList,
    total,
    page,
    pageSize,
    stats: stats.reduce((acc: Record<string, number>, item: { status: string; _count: number }) => {
      acc[item.status] = item._count
      return acc
    }, {} as Record<string, number>),
  })
})
