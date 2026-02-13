/**
 * @file 业务单位审批功能
 * @desc Client（业务单位）的审批流程管理
 * @see PRD: docs/plans/2026-01-28-business-workflow-enhancement-design.md#模块4
 */

import { prisma } from '@/lib/prisma'
import { approvalEngine } from '@/lib/approval/engine'

/**
 * 业务单位审批状态
 */
export type ClientApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected'

/**
 * 提交审批参数
 */
export interface SubmitClientParams {
  comment?: string  // 提交备注（可选）
}

/**
 * 审批通过参数
 */
export interface ApproveClientParams {
  comment?: string  // 审批备注（可选）
}

/**
 * 审批结果
 */
export interface ApprovalResult {
  success: boolean
  status: ClientApprovalStatus
  message: string
}

/**
 * 业务单位审批状态配置
 */
export const CLIENT_STATUS_CONFIG: Record<ClientApprovalStatus, {
  text: string
  color: string
  canSubmit: boolean   // 是否可以提交审批
  canApprove: boolean  // 是否可以审批通过
}> = {
  draft: {
    text: '草稿',
    color: 'default',
    canSubmit: true,
    canApprove: false
  },
  pending: {
    text: '审批中',
    color: 'processing',
    canSubmit: false,
    canApprove: true
  },
  approved: {
    text: '已通过',
    color: 'success',
    canSubmit: false,
    canApprove: false
  },
  rejected: {
    text: '已驳回',
    color: 'error',
    canSubmit: true,
    canApprove: false
  }
}

/**
 * 提交业务单位审批
 *
 * 通过审批引擎创建审批实例，引擎会自动更新 Client 表的
 * status、approvalStep、approvalInstanceId 字段。
 *
 * @param clientId - 业务单位ID
 * @param params - 提交参数
 * @param submittedBy - 提交人ID
 * @returns 提交结果
 *
 * @example
 * ```typescript
 * const result = await submitClientForApproval('client-123', {
 *   comment: '请审批'
 * }, 'user-456')
 * ```
 */
export async function submitClientForApproval(
  clientId: string,
  params: SubmitClientParams,
  submittedBy: string
): Promise<ApprovalResult> {
  // 查询业务单位
  const client = await prisma.client.findUnique({
    where: { id: clientId }
  })

  if (!client) {
    throw new Error('业务单位不存在')
  }

  // 验证状态
  const status = client.status as ClientApprovalStatus
  const config = CLIENT_STATUS_CONFIG[status]

  if (!config.canSubmit) {
    throw new Error('当前状态无法提交审批')
  }

  // 查询提交人姓名
  const submitter = await prisma.user.findUnique({
    where: { id: submittedBy },
    select: { name: true }
  })

  // 通过审批引擎创建审批实例
  // 引擎内部 updateBizStatus 会自动更新 Client.status='pending'、approvalStep=1、approvalInstanceId
  await approvalEngine.submit({
    bizType: 'client',
    bizId: clientId,
    flowCode: 'CLIENT_APPROVAL',
    submitterId: submittedBy,
    submitterName: submitter?.name || '提交人',
  })

  // 补充更新提交时间和提交人字段（审批引擎不处理这些业务字段）
  await prisma.client.update({
    where: { id: clientId },
    data: {
      submittedAt: new Date(),
      submittedBy: submittedBy,
    }
  })

  return {
    success: true,
    status: 'pending',
    message: '提交审批成功'
  }
}

/**
 * 审批通过业务单位
 *
 * @param clientId - 业务单位ID
 * @param params - 审批参数
 * @param approvedBy - 审批人ID
 * @returns 审批结果
 *
 * @example
 * ```typescript
 * const result = await approveClient('client-123', {
 *   comment: '审批通过'
 * }, 'admin-456')
 * ```
 */
export async function approveClient(
  clientId: string,
  params: ApproveClientParams,
  approvedBy: string
): Promise<ApprovalResult> {
  // 查询业务单位
  const client = await prisma.client.findUnique({
    where: { id: clientId }
  })

  if (!client) {
    throw new Error('业务单位不存在')
  }

  // 验证状态
  const status = client.status as ClientApprovalStatus
  const config = CLIENT_STATUS_CONFIG[status]

  if (!config.canApprove) {
    throw new Error('当前状态无法审批通过')
  }

  // 更新状态为 approved
  const now = new Date()
  await prisma.client.update({
    where: { id: clientId },
    data: {
      status: 'approved',
      approvedAt: now,
      approvedBy: approvedBy
    }
  })

  return {
    success: true,
    status: 'approved',
    message: '审批通过'
  }
}
