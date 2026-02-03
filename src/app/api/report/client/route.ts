import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import {
  withErrorHandler,
  success,
  validateRequired,
} from '@/lib/api-handler'
import { generateClientReportNo } from '@/lib/generate-no'
import { addCurrentApproverInfo } from '@/lib/approval/utils'

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

  // 为每个客户报告添加当前审批人信息
  const listWithApprover = await addCurrentApproverInfo(list, prisma, 'report')

  // 统计各状态数量
  const stats = await prisma.clientReport.groupBy({
    by: ['status'],
    _count: true,
  })

  return success({
    list: listWithApprover,
    total,
    page,
    pageSize,
    stats: stats.reduce((acc: any, item: any) => {
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
    taskReportNos = taskReports.map((r: any) => r.reportNo)
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
