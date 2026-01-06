import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import {
  withErrorHandler,
  success,
  notFound,
  badRequest,
  validateRequired,
  validateEnum,
} from '@/lib/api-handler'

/**
 * 客户报告状态流转规则
 * draft -> pending_review -> pending_approve -> approved -> issued
 */
const STATUS_FLOW = {
  draft: 'pending_review',
  pending_review: 'pending_approve',
  pending_approve: 'approved',
  approved: 'issued',
} as const

// 获取单个客户报告
export const GET = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params

  const report = await prisma.clientReport.findUnique({
    where: { id },
  })

  if (!report) {
    notFound('客户报告不存在')
  }

  // 解析 JSON 字段
  const formatted = {
    ...report,
    taskReportNos: report.taskReportNos ? JSON.parse(report.taskReportNos) : [],
    testItems: report.testItems ? JSON.parse(report.testItems) : [],
    testStandards: report.testStandards ? JSON.parse(report.testStandards) : [],
    approvalFlow: report.approvalFlow ? JSON.parse(report.approvalFlow) : [],
  }

  return success(formatted)
})

// 更新客户报告
export const PUT = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const data = await request.json()

  // 检查报告是否存在
  const existing = await prisma.clientReport.findUnique({ where: { id } })
  if (!existing) {
    notFound('客户报告不存在')
  }

  // 只有草稿状态才能编辑
  if (existing.status !== 'draft') {
    badRequest('只有草稿状态的报告可以编辑')
  }

  // 构建更新数据
  const updateData: Record<string, unknown> = {}

  if (data.projectName !== undefined) updateData.projectName = data.projectName
  if (data.clientName !== undefined) updateData.clientName = data.clientName
  if (data.clientAddress !== undefined) updateData.clientAddress = data.clientAddress
  if (data.sampleName !== undefined) updateData.sampleName = data.sampleName
  if (data.sampleNo !== undefined) updateData.sampleNo = data.sampleNo
  if (data.specification !== undefined) updateData.specification = data.specification
  if (data.sampleQuantity !== undefined) updateData.sampleQuantity = data.sampleQuantity
  if (data.receivedDate !== undefined) updateData.receivedDate = data.receivedDate ? new Date(data.receivedDate) : null
  if (data.testItems !== undefined) updateData.testItems = JSON.stringify(data.testItems)
  if (data.testStandards !== undefined) updateData.testStandards = JSON.stringify(data.testStandards)
  if (data.overallConclusion !== undefined) updateData.overallConclusion = data.overallConclusion
  if (data.preparer !== undefined) updateData.preparer = data.preparer

  const report = await prisma.clientReport.update({
    where: { id },
    data: updateData,
  })

  return success(report)
})

// 删除客户报告
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params

  // 检查报告是否存在
  const existing = await prisma.clientReport.findUnique({ where: { id } })
  if (!existing) {
    notFound('客户报告不存在')
  }

  // 只有草稿状态才能删除
  if (existing.status !== 'draft') {
    badRequest('只有草稿状态的报告可以删除')
  }

  await prisma.clientReport.delete({ where: { id } })

  return success({ success: true })
})

/**
 * 报告审批操作
 *
 * 支持的操作：
 * 1. submit - 提交审核（draft -> pending_review）
 * 2. review - 审核通过（pending_review -> pending_approve）
 * 3. approve - 批准通过（pending_approve -> approved）
 * 4. issue - 发放报告（approved -> issued）
 * 5. reject - 驳回（回到 draft）
 */
export const PATCH = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const data = await request.json()

  // 验证必填字段
  validateRequired(data, ['action'])

  const action = validateEnum(
    data.action,
    ['submit', 'review', 'approve', 'issue', 'reject'] as const,
    'action'
  )

  const { comment, operator } = data

  // 获取当前报告
  const report = await prisma.clientReport.findUnique({
    where: { id },
  })

  if (!report) {
    notFound('客户报告不存在')
  }

  let newStatus = report.status
  let updateData: Record<string, unknown> = {}

  // 解析现有审批流程
  const approvalFlow = report.approvalFlow ? JSON.parse(report.approvalFlow) : []

  switch (action) {
    case 'submit':
      // 提交审核
      if (report.status !== 'draft') {
        badRequest('只有草稿状态的报告可以提交审核')
      }
      newStatus = 'pending_review'
      approvalFlow.push({
        action: 'submit',
        operator: operator || '提交人',
        comment: comment || '',
        timestamp: new Date().toISOString(),
      })
      break

    case 'review':
      // 审核通过
      if (report.status !== 'pending_review') {
        badRequest('当前状态不能执行审核操作')
      }
      validateRequired(data, ['operator'])
      newStatus = 'pending_approve'
      updateData.reviewer = operator
      approvalFlow.push({
        action: 'review',
        operator,
        comment: comment || '',
        timestamp: new Date().toISOString(),
      })
      break

    case 'approve':
      // 批准通过
      if (report.status !== 'pending_approve') {
        badRequest('当前状态不能执行批准操作')
      }
      validateRequired(data, ['operator'])
      newStatus = 'approved'
      updateData.approver = operator
      approvalFlow.push({
        action: 'approve',
        operator,
        comment: comment || '',
        timestamp: new Date().toISOString(),
      })
      break

    case 'issue':
      // 发放报告
      if (report.status !== 'approved') {
        badRequest('只有已批准的报告才能发放')
      }
      newStatus = 'issued'
      updateData.issuedDate = new Date()
      approvalFlow.push({
        action: 'issue',
        operator: operator || '发放人',
        comment: comment || '',
        timestamp: new Date().toISOString(),
      })
      break

    case 'reject':
      // 驳回
      if (!['pending_review', 'pending_approve'].includes(report.status)) {
        badRequest('当前状态不能执行驳回操作')
      }
      validateRequired(data, ['comment'])
      newStatus = 'draft'
      approvalFlow.push({
        action: 'reject',
        operator: operator || '审批人',
        comment,
        timestamp: new Date().toISOString(),
      })
      break
  }

  const updated = await prisma.clientReport.update({
    where: { id },
    data: {
      ...updateData,
      status: newStatus,
      approvalFlow: JSON.stringify(approvalFlow),
    },
  })

  return success({
    ...updated,
    approvalFlow,
  })
})
