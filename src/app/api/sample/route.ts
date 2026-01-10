import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import {
  withErrorHandler,
  success,
  validateRequired,
} from '@/lib/api-handler'
import { generateNo, NumberPrefixes } from '@/lib/generate-no'

// 获取样品列表（含筛选和关联数据）
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const status = searchParams.get('status')
  const keyword = searchParams.get('keyword')
  const entrustmentId = searchParams.get('entrustmentId')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const type = searchParams.get('type')

  // 构建筛选条件
  const where: Record<string, unknown> = {}

  if (status) {
    where.status = status
  }

  if (entrustmentId) {
    where.entrustmentId = entrustmentId
  }

  if (type) {
    where.type = type
  }

  if (keyword) {
    where.OR = [
      { sampleNo: { contains: keyword } },
      { name: { contains: keyword } },
      { specification: { contains: keyword } },
      { storageLocation: { contains: keyword } },
    ]
  }

  if ((startDate && startDate.trim()) || (endDate && endDate.trim())) {
    where.receiptDate = {}
    if (startDate && startDate.trim()) (where.receiptDate as Record<string, Date>).gte = new Date(startDate)
    if (endDate && endDate.trim()) (where.receiptDate as Record<string, Date>).lte = new Date(endDate)
  }

  const [list, total] = await Promise.all([
    prisma.sample.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        entrustment: {
          select: {
            id: true,
            entrustmentNo: true,
            clientName: true,
            sampleName: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        testTasks: {
          select: {
            id: true,
            taskNo: true,
            status: true,
          },
        },
        requisitions: {
          select: {
            id: true,
            requisitionNo: true,
            status: true,
            requisitionBy: true,
          },
        },
      },
    }),
    prisma.sample.count({ where }),
  ])

  // 统计各状态数量
  const stats = await prisma.sample.groupBy({
    by: ['status'],
    _count: true,
  })

  return success({
    list,
    total,
    page,
    pageSize,
    stats: stats.reduce((acc: any, item: any) => {
      acc[item.status] = item._count
      return acc
    }, {} as Record<string, number>),
  })
})

// 创建样品
export const POST = withErrorHandler(async (request: NextRequest) => {
  const data = await request.json()

  // 验证必填字段
  validateRequired(data, ['name'])

  // 生成样品编号
  const sampleNo = await generateNo(NumberPrefixes.SAMPLE, 3)

  const sample = await prisma.sample.create({
    data: {
      ...data,
      sampleNo,
      status: data.status || 'received',
      receiptDate: data.receiptDate ? new Date(data.receiptDate) : new Date(),
    },
    include: {
      entrustment: true,
      createdBy: true,
    },
  })

  return success(sample)
})
