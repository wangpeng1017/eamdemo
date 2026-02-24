import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success, badRequest } from '@/lib/api-handler'
import { getEntrustmentBasedFilter } from '@/lib/data-permission'
import { generateReportNo } from '@/lib/generate-no'

// 获取检测报告列表 - 需要登录 + 数据权限过滤
export const GET = withAuth(async (request: NextRequest, user) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')

  // 注入数据权限过滤（委托链路）
  const permissionFilter = await getEntrustmentBasedFilter(user.id)

  // 组合过滤：委托链路 OR 任务分配给当前用户的报告
  let where: Record<string, unknown>
  if (Object.keys(permissionFilter).length === 0) {
    // 全部权限，不过滤
    where = {}
  } else {
    // 委托链路 + 任务链路（覆盖 entrustmentId 为 null 的场景）
    where = {
      OR: [
        permissionFilter,
        { task: { assignedToId: user.id } },
      ]
    }
  }

  const [list, total] = await Promise.all([
    prisma.testReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { task: true }
    }),
    prisma.testReport.count({ where }),
  ])

  return success({ list, total, page, pageSize })
})

// 创建检测报告 - 需要登录（使用统一编号生成）
export const POST = withAuth(async (request: NextRequest, user) => {
  const data = await request.json()

  // 字段验证
  if (!data.taskId) {
    badRequest('缺少 taskId')
  }

  // 使用统一的编号生成函数（前缀 RWBG）
  const reportNo = await generateReportNo()

  // 字段白名单过滤
  const report = await prisma.testReport.create({
    data: {
      reportNo,
      taskId: data.taskId,
      entrustmentId: data.entrustmentId || null,
      clientName: data.clientName || null,
      projectName: data.projectName || null,
      standardName: data.standardName || null,
      sampleNo: data.sampleNo || null,
      sampleName: data.sampleName || null,
      specification: data.specification || null,
      sampleQuantity: data.sampleQuantity || null,
      testParameters: data.testParameters || null,
      testResults: data.testResults || null,
      overallConclusion: data.overallConclusion || null,
      tester: data.tester || user.name || null,
      status: 'draft',
    }
  })
  return success(report)
})
