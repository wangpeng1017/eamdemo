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
import { Prisma } from '@prisma/client'

/**
 * 报价单状态流转规则
 * draft -> pending_sales -> pending_finance -> pending_lab -> approved
 */
const STATUS_FLOW = {
  draft: 'pending_sales',
  pending_sales: 'pending_finance',
  pending_finance: 'pending_lab',
  pending_lab: 'approved',
} as const

/**
 * 状态对应的审批级别和角色
 */
const STATUS_APPROVAL_CONFIG = {
  pending_sales: { level: 1, role: 'sales_manager' },
  pending_finance: { level: 2, role: 'finance' },
  pending_lab: { level: 3, role: 'lab_director' },
} as const

// 获取单个报价（含明细和审批记录）
export const GET = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { params } = context!
  const { id } = await params

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      items: true,
      quotationSamples: true,
      approvals: {
        orderBy: { timestamp: 'desc' },
      },
      client: true,  // 添加客户关联查询
    },
  })

  if (!quotation) {
    notFound('报价单不存在')
  }

  // 格式化数据以匹配前端期望的字段名
  const formatted = {
    ...quotation,
    // 客户信息从关联对象获取
    clientResponse: quotation.clientStatus,
    sampleModel: quotation.sampleModel,
    sampleMaterial: quotation.sampleMaterial,
    sampleQuantity: quotation.sampleQuantity,
    follower: quotation.follower,
  }

  return success(formatted)
})

// 更新报价
export const PUT = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { params } = context!
  const { id } = await params
  const data = await request.json()

  // 检查报价是否存在
  const existing = await prisma.quotation.findUnique({ where: { id } })
  if (!existing) {
    notFound('报价单不存在')
  }

  // 如果是归档操作，只允许已批准或已拒绝的报价单归档
  const isArchiveOnly = Object.keys(data).length === 1 && data.status === 'archived'
  if (isArchiveOnly) {
    if (!['approved', 'rejected'].includes(existing.status)) {
      badRequest('只有已批准或已拒绝的报价单可以归档')
    }
  }
  // 如果不是归档操作，只有草稿状态才能编辑
  else if (existing.status !== 'draft' && data.clientResponse === undefined) {
    // allow updating clientResponse even if not draft, but other edits blocked
    badRequest('只有草稿状态的报价单可以编辑')
  }

  // 如果更新了明细项，需要重新计算金额
  if (data.items) {
    const subtotal = data.items.reduce((sum: number, item: { quantity?: number; unitPrice?: number }) => {
      return sum + (item.quantity || 1) * (item.unitPrice || 0)
    }, 0)
    const taxTotal = subtotal * 1.06
    const discountTotal = data.finalAmount || taxTotal

    data.subtotal = subtotal
    data.taxTotal = taxTotal
    data.discountTotal = discountTotal

    // 删除旧明细，创建新明细
    await prisma.quotationItem.deleteMany({
      where: { quotationId: id },
    })
  }

  // 处理样品更新
  if (data.samples) {
    await prisma.quotationSample.deleteMany({
      where: { quotationId: id }
    })
  }

  // 映射前端字段名到数据库字段名
  const updateData: Record<string, unknown> = {}
  if (data.clientId !== undefined) updateData.clientId = data.clientId
  if (data.clientContactPerson !== undefined) updateData.clientContactPerson = data.clientContactPerson
  if (data.subtotal !== undefined) updateData.subtotal = data.subtotal
  if (data.taxTotal !== undefined) updateData.taxTotal = data.taxTotal
  if (data.discountTotal !== undefined) updateData.discountTotal = data.discountTotal
  if (data.paymentTerms !== undefined) updateData.clientRemark = data.paymentTerms
  if (data.clientResponse !== undefined) updateData.clientStatus = data.clientResponse
  if (data.sampleName !== undefined) updateData.sampleName = data.sampleName
  if (data.sampleModel !== undefined) updateData.sampleModel = data.sampleModel
  if (data.sampleMaterial !== undefined) updateData.sampleMaterial = data.sampleMaterial
  if (data.sampleQuantity !== undefined) updateData.sampleQuantity = data.sampleQuantity
  if (data.follower !== undefined) updateData.follower = data.follower
  // 归档操作允许修改 status
  if (isArchiveOnly && data.status === 'archived') updateData.status = 'archived'

  const quotation = await prisma.quotation.update({
    where: { id },
    data: {
      ...updateData,
      items: data.items ? {
        create: data.items.map((item: { serviceItem: string; methodStandard: string; quantity?: number; unitPrice?: number }) => ({
          serviceItem: item.serviceItem,
          methodStandard: item.methodStandard,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          totalPrice: (item.quantity || 1) * (item.unitPrice || 0),
        })),
      } : undefined,
      quotationSamples: data.samples ? {
        create: data.samples.map((sample: any) => ({
          name: sample.name,
          model: sample.model,
          material: sample.material,
          quantity: parseInt(sample.quantity, 10) || 1,
          remark: sample.remark,
        }))
      } : undefined
    },
    include: {
      items: true,
      quotationSamples: true
    },
  })

  return success(quotation)
})

// 删除报价
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { params } = context!
  const { id } = await params

  // 检查报价是否存在
  const existing = await prisma.quotation.findUnique({ where: { id } })
  if (!existing) {
    notFound('报价单不存在')
  }

  // 只有草稿状态才能删除
  if (existing.status !== 'draft') {
    badRequest('只有草稿状态的报价单可以删除')
  }

  await prisma.quotation.delete({
    where: { id },
  })

  return success({ success: true })
})

/**
 * 提交审批 / 审批操作
 *
 * 支持的操作：
 * 1. submit - 提交审批（draft -> pending_sales）
 * 2. approve - 审批通过（流转到下一状态）
 * 3. reject - 审批驳回（回到 rejected 状态）
 */
export const PATCH = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { params } = context!
  const { id } = await params
  const data = await request.json()

  // 验证必填字段
  validateRequired(data, ['action'])

  const action = validateEnum(
    data.action,
    ['submit', 'approve', 'reject'] as const,
    'action'
  )

  const { comment, approver, submitterName } = data

  // 获取当前报价
  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: { approvals: true },
  })

  if (!quotation) {
    notFound('报价单不存在')
  }

  let newStatus = quotation.status
  let approvalLevel = 0
  let approvalRole = ''

  switch (action) {
    case 'submit':
      // 提交审批：使用统一审批引擎
      if (quotation.status !== 'draft') {
        badRequest('只有草稿状态的报价单可以提交审批')
      }

      if (!approver) {
        badRequest('提交人信息缺失')
      }

      const { approvalEngine } = await import('@/lib/approval/engine')
      const instance = await approvalEngine.submit({
        bizType: 'quotation',
        bizId: id,
        flowCode: 'QUOTATION_APPROVAL',
        submitterId: approver,
        submitterName: submitterName || '未知用户',
      })

      newStatus = 'pending_sales' // 保持冗余状态同步
      approvalLevel = 0
      approvalRole = 'submitter'
      break

    case 'approve':
      // 审批通过：根据当前状态流转到下一状态
      if (!['pending_sales', 'pending_finance', 'pending_lab'].includes(quotation.status)) {
        badRequest(`当前状态 ${quotation.status} 不能执行审批操作`)
      }

      const currentConfig = STATUS_APPROVAL_CONFIG[quotation.status as keyof typeof STATUS_APPROVAL_CONFIG]
      approvalLevel = currentConfig.level
      approvalRole = currentConfig.role
      newStatus = STATUS_FLOW[quotation.status as keyof typeof STATUS_FLOW]
      break

    case 'reject':
      // 审批驳回
      if (!['pending_sales', 'pending_finance', 'pending_lab'].includes(quotation.status)) {
        badRequest(`当前状态 ${quotation.status} 不能执行驳回操作`)
      }

      const rejectConfig = STATUS_APPROVAL_CONFIG[quotation.status as keyof typeof STATUS_APPROVAL_CONFIG]
      approvalLevel = rejectConfig.level
      approvalRole = rejectConfig.role
      newStatus = 'rejected'
      break
  }

  // 使用事务确保数据一致性
  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // 创建审批记录（submit 操作也记录）
    await tx.quotationApproval.create({
      data: {
        quotationId: id,
        level: approvalLevel,
        role: approvalRole,
        approver: approver || '当前用户',
        action: action,
        comment: comment || '',
      },
    })

    // 更新状态
    return tx.quotation.update({
      where: { id },
      data: { status: newStatus },
      include: {
        items: true,
        approvals: {
          orderBy: { timestamp: 'desc' },
        },
      },
    })
  })

  return success(updated)
})
