import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import {
  withErrorHandler,
  success,
  validateRequired,
} from '@/lib/api-handler'
import { generateNo, NumberPrefixes } from '@/lib/generate-no'

// 获取委托单列表（含筛选和关联数据）
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const status = searchParams.get('status')
  const keyword = searchParams.get('keyword')
  const follower = searchParams.get('follower')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const sourceType = searchParams.get('sourceType')

  // 构建筛选条件
  const where: Record<string, unknown> = {}

  if (status) {
    where.status = status
  }

  if (follower) {
    where.follower = follower
  }

  if (sourceType) {
    where.sourceType = sourceType
  }

  if (keyword) {
    where.OR = [
      { entrustmentNo: { contains: keyword } },
      { clientName: { contains: keyword } },
      { sampleName: { contains: keyword } },
      { contractNo: { contains: keyword } },
    ]
  }

  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) (where.createdAt as Record<string, Date>).gte = new Date(startDate)
    if (endDate) (where.createdAt as Record<string, Date>).lte = new Date(endDate)
  }

  const [list, total] = await Promise.all([
    prisma.entrustment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            contact: true,
            phone: true,
          },
        },
        contract: {
          select: {
            id: true,
            contractNo: true,
            contractName: true,
            status: true,
          },
        },
        projects: {
          select: {
            id: true,
            name: true,
            status: true,
            assignTo: true,
            subcontractor: true,
          },
        },
        samples: {
          select: {
            id: true,
            sampleNo: true,
            name: true,
            status: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    }),
    prisma.entrustment.count({ where }),
  ])

  // 统计各状态数量
  const stats = await prisma.entrustment.groupBy({
    by: ['status'],
    _count: true,
  })

  return success({
    list,
    total,
    page,
    pageSize,
    stats: stats.reduce((acc, item) => {
      acc[item.status] = item._count
      return acc
    }, {} as Record<string, number>),
  })
})

// 创建委托单
export const POST = withErrorHandler(async (request: NextRequest) => {
  const data = await request.json()

  // 验证必填字段
  validateRequired(data, ['clientName', 'sampleName'])

  // 生成委托单号
  const entrustmentNo = await generateNo(NumberPrefixes.ENTRUSTMENT, 4)

  const entrustment = await prisma.entrustment.create({
    data: {
      ...data,
      entrustmentNo,
      status: data.status || 'pending',
      sampleDate: data.sampleDate ? new Date(data.sampleDate) : new Date(),
    },
    include: {
      client: true,
      contract: true,
      projects: true,
      samples: true,
    },
  })

  return success(entrustment)
})
