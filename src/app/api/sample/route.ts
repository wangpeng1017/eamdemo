import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import {
  withAuth,
  success,
  validateRequired,
  badRequest,
} from '@/lib/api-handler'
import { generateNo, NumberPrefixes } from '@/lib/generate-no'
import { getDataFilter } from '@/lib/data-permission'

// 获取样品列表（含筛选和关联数据）- 需要登录
export const GET = withAuth(async (request: NextRequest, user) => {
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

  // 注入数据权限过滤
  const permissionFilter = await getDataFilter()
  Object.assign(where, permissionFilter)

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
            sampleName: true,
            client: {
              select: {
                id: true,
                name: true,
              },
            },
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

// 创建样品 - 需要登录
export const POST = withAuth(async (request: NextRequest, user) => {
  const data = await request.json()

  // 验证必填字段：testItems
  validateRequired(data, ['testItems'])

  // 验证testItems是非空数组
  if (!Array.isArray(data.testItems) || data.testItems.length === 0) {
    badRequest('testItems不能为空')
  }

  const { testItems, ...otherFields } = data

  // 从检测项计算Sample字段
  const firstItem = testItems[0]

  // 计算totalQuantity：所有检测项的quantity总和
  const totalQuantity = testItems.reduce((sum: number, item: any) => {
    return sum + (Number(item.quantity) || 0)
  }, 0)

  // 生成样品编号
  const sampleNo = await generateNo(NumberPrefixes.SAMPLE, 3)

  const sample = await prisma.sample.create({
    data: {
      ...otherFields,
      sampleNo,
      // 从第一个检测项自动计算的字段
      name: firstItem.sampleName,
      specification: firstItem.material || null,
      quantity: String(firstItem.quantity || 1),
      totalQuantity: String(totalQuantity),
      // 状态和日期
      status: data.status || 'received',
      receiptDate: data.receiptDate ? new Date(data.receiptDate) : new Date(),
      createdById: user.id,
    },
    include: {
      entrustment: true,
      createdBy: true,
    },
  })

  // 自动关联任务：如果有基于此委托单创建的、且尚未关联样品的任务，自动关联此样品
  if (data.entrustmentId) {
    await prisma.testTask.updateMany({
      where: {
        entrustmentId: data.entrustmentId,
        sampleId: null,
      },
      data: {
        sampleId: sample.id,
        sampleName: sample.name, // 同时更新冗余字段，虽然前端主要用关联字段，但为了兼容性
      },
    })
  }

  return success(sample)
})
