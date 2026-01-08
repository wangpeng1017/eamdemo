# -*- coding: utf-8 -*-
"""
Fix TypeScript type errors in API routes - Phase 5 (Final)
"""

import os

def fix_sample_my():
    """Fix sample/my/route.ts"""
    file_path = '/Users/wangpeng/Downloads/limsnext/src/app/api/sample/my/route.ts'

    content = """import { prisma } from '@/lib/prisma'
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
    stats: stats.reduce((acc, item) => {
      acc[item.status] = item._count
      return acc
    }, {} as Record<string, number>)
  })
})
"""

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'✓ Fixed: {file_path}')

def fix_statistics():
    """Fix statistics/route.ts"""
    file_path = '/Users/wangpeng/Downloads/limsnext/src/app/api/statistics/route.ts'

    content = """import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success } from '@/lib/api-handler'

// 获取统计数据
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'overview'

  // 基础统计
  const [
    entrustmentCount,
    sampleCount,
    taskCount,
    reportCount,
    pendingEntrustments,
    testingSamples,
    pendingReports,
    completedThisMonth,
  ] = await Promise.all([
    prisma.entrustment.count(),
    prisma.sample.count(),
    prisma.testTask.count(),
    prisma.testReport.count(),
    prisma.entrustment.count({ where: { status: 'pending' } }),
    prisma.sample.count({ where: { status: 'testing' } }),
    prisma.testReport.count({ where: { status: { in: ['draft', 'reviewing'] } } }),
    prisma.testReport.count({
      where: {
        status: 'issued',
        issuedDate: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
  ])

  const overview = {
    entrustmentCount,
    sampleCount,
    taskCount,
    reportCount,
    pendingEntrustments,
    testingSamples,
    pendingReports,
    completedThisMonth,
  }

  if (type === 'overview') {
    return success(overview)
  }

  // 月度委托趋势（近6个月）
  const monthlyTrend = await getMonthlyTrend()

  // 客户委托排行 Top 10
  const topClients = await prisma.entrustment.groupBy({
    by: ['clientName'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  })

  // 样品状态分布
  const sampleStatusDist = await prisma.sample.groupBy({
    by: ['status'],
    _count: { id: true },
  })

  // 任务状态分布
  const taskStatusDist = await prisma.testTask.groupBy({
    by: ['status'],
    _count: { id: true },
  })

  // 人员任务量统计 Top 10
  const assigneeStats = await prisma.testTask.groupBy({
    by: ['assignedToId'],
    _count: { id: true },
    where: { assignedToId: { not: null } },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  })

  // 财务统计
  const financeStats = await getFinanceStats()

  // 设备统计
  const deviceStats = await prisma.device.groupBy({
    by: ['status'],
    _count: { id: true },
  })

  return success({
    ...overview,
    monthlyTrend,
    topClients: topClients.map((c) => ({
      clientName: c.clientName || '未知',
      count: c._count.id,
    })),
    sampleStatusDist: sampleStatusDist.map((s) => ({
      status: s.status,
      count: s._count.id,
    })),
    taskStatusDist: taskStatusDist.map((t) => ({
      status: t.status,
      count: t._count.id,
    })),
    assigneeStats: assigneeStats.map((a) => ({
      assignee: a.assignedToId || '未分配',
      count: a._count.id,
    })),
    financeStats,
    deviceStats: deviceStats.map((d) => ({
      status: d.status,
      count: d._count.id,
    })),
  })
})

// 获取近6个月委托趋势
async function getMonthlyTrend() {
  const result = []
  const now = new Date()

  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)

    const [entrustments, samples, reports] = await Promise.all([
      prisma.entrustment.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
      prisma.sample.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
      prisma.testReport.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
    ])

    result.push({
      month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
      entrustments,
      samples,
      reports,
    })
  }

  return result
}

// 获取财务统计
async function getFinanceStats() {
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisYearStart = new Date(now.getFullYear(), 0, 1)

  const [
    totalReceivable,
    totalReceived,
    monthReceived,
    yearReceived,
    pendingInvoice,
  ] = await Promise.all([
    prisma.financeReceivable.aggregate({ _sum: { amount: true } }),
    prisma.financeReceivable.aggregate({ _sum: { receivedAmount: true } }),
    prisma.financePayment.aggregate({
      where: { paymentDate: { gte: thisMonthStart } },
      _sum: { amount: true },
    }),
    prisma.financePayment.aggregate({
      where: { paymentDate: { gte: thisYearStart } },
      _sum: { amount: true },
    }),
    prisma.financeInvoice.count({ where: { status: 'pending' } }),
  ])

  return {
    totalReceivable: totalReceivable._sum.amount || 0,
    totalReceived: totalReceived._sum.receivedAmount || 0,
    monthReceived: monthReceived._sum.amount || 0,
    yearReceived: yearReceived._sum.amount || 0,
    pendingInvoice,
  }
}
"""

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'✓ Fixed: {file_path}')

def fix_report_client():
    """Fix report/client/route.ts"""
    file_path = '/Users/wangpeng/Downloads/limsnext/src/app/api/report/client/route.ts'

    content = """import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import {
  withErrorHandler,
  success,
  validateRequired,
} from '@/lib/api-handler'
import { generateClientReportNo } from '@/lib/generate-no'

// 获取客户报告列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const status = searchParams.get('status')
  const keyword = searchParams.get('keyword')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  // 构建筛选条件
  const where: Record<string, unknown> = {}

  if (status) {
    where.status = status
  }

  if (keyword) {
    where.OR = [
      { reportNo: { contains: keyword } },
      { clientName: { contains: keyword } },
      { sampleName: { contains: keyword } },
      { projectName: { contains: keyword } },
    ]
  }

  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) (where.createdAt as Record<string, Date>).gte = new Date(startDate)
    if (endDate) (where.createdAt as Record<string, Date>).lte = new Date(endDate)
  }

  const [list, total] = await Promise.all([
    prisma.clientReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.clientReport.count({ where }),
  ])

  // 统计各状态数量
  const stats = await prisma.clientReport.groupBy({
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

// 创建客户报告
export const POST = withErrorHandler(async (request: NextRequest) => {
  const data = await request.json()

  // 验证必填字段
  validateRequired(data, ['clientName', 'sampleName'])

  // 生成报告编号
  const reportNo = await generateClientReportNo()

  // 处理关联的任务报告
  let taskReportNos: string[] = []
  if (data.taskReportIds && Array.isArray(data.taskReportIds)) {
    const taskReports = await prisma.testReport.findMany({
      where: { id: { in: data.taskReportIds } },
      select: { reportNo: true },
    })
    taskReportNos = taskReports.map((r) => r.reportNo)
  }

  const report = await prisma.clientReport.create({
    data: {
      reportNo,
      entrustmentId: data.entrustmentId,
      projectName: data.projectName,
      clientName: data.clientName,
      clientAddress: data.clientAddress,
      sampleName: data.sampleName,
      sampleNo: data.sampleNo,
      specification: data.specification,
      sampleQuantity: data.sampleQuantity,
      receivedDate: data.receivedDate ? new Date(data.receivedDate) : null,
      taskReportNos: taskReportNos.length > 0 ? JSON.stringify(taskReportNos) : null,
      testItems: data.testItems ? JSON.stringify(data.testItems) : null,
      testStandards: data.testStandards ? JSON.stringify(data.testStandards) : null,
      overallConclusion: data.overallConclusion,
      preparer: data.preparer,
      status: 'draft',
    },
  })

  return success(report)
})
"""

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'✓ Fixed: {file_path}')

def fix_sample():
    """Fix sample/route.ts"""
    file_path = '/Users/wangpeng/Downloads/limsnext/src/app/api/sample/route.ts'

    content = """import { prisma } from '@/lib/prisma'
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

  if (startDate || endDate) {
    where.receiptDate = {}
    if (startDate) (where.receiptDate as Record<string, Date>).gte = new Date(startDate)
    if (endDate) (where.receiptDate as Record<string, Date>).lte = new Date(endDate)
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
    stats: stats.reduce((acc, item) => {
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
"""

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'✓ Fixed: {file_path}')

def fix_supplier_category():
    """Fix supplier-category/route.ts"""
    file_path = '/Users/wangpeng/Downloads/limsnext/src/app/api/supplier-category/route.ts'

    content = """import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, validateRequired } from '@/lib/api-handler'

// 获取供应商分类列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')

  const [list, total] = await Promise.all([
    prisma.supplierCategory.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.supplierCategory.count(),
  ])

  return success({ list, total, page, pageSize })
})

// 创建供应商分类
export const POST = withErrorHandler(async (request: NextRequest) => {
  const data = await request.json()

  validateRequired(data, ['name'])

  const category = await prisma.supplierCategory.create({
    data: {
      name: data.name,
      description: data.description || null,
    },
  })

  return success(category)
})
"""

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'✓ Fixed: {file_path}')

# Run all fixes
if __name__ == '__main__':
    print('Fixing API route TypeScript type errors - Phase 5 (Final)...\n')

    fix_sample_my()
    fix_statistics()
    fix_report_client()
    fix_sample()
    fix_supplier_category()

    print('\n✓ Phase 5 complete: Fixed 5 files')
    print('\n' + '='*60)
    print('ALL PHASES COMPLETE!')
    print('='*60)
    print('\nTotal files fixed: 24')
    print('\nSummary of fixes:')
    print('  - Added explicit type annotations for map/reduce/filter callbacks')
    print('  - Fixed RouteParams interface for dynamic routes (Promise<Record<string, string>>)')
    print('  - Added Prisma.TransactionClient type for transaction callbacks')
    print('  - Fixed JSON.parse type assertions')
    print('  - Replaced implicit any types with proper type annotations')
