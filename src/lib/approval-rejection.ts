/**
 * @file 审批驳回功能
 * @desc 通用的审批驳回逻辑，适用于所有需要审批的单据
 * @see PRD: docs/plans/2026-01-28-business-workflow-enhancement-design.md#模块2
 */

import { prisma } from '@/lib/prisma'

/**
 * 驳回参数
 */
export interface RejectParams {
  rejectReason: string  // 驳回原因（必填）
}

/**
 * 驳回结果
 */
export interface RejectResult {
  success: boolean
  rejectedCount: number
  lastRejectReason: string
  lastRejectBy: string
  lastRejectAt: Date
}

/**
 * 单据驳回记录（扩展字段）
 */
export interface RejectionRecord {
  rejectedCount: number      // 驳回次数
  lastRejectReason: string   // 最后一次驳回原因
  lastRejectBy: string       // 最后一次驳回人
  lastRejectAt: Date         // 最后一次驳回时间
}

/**
 * 状态类型（支持多种单据）
 */
export type ApprovableStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'archived'

/**
 * 状态配置
 */
export const APPROVAL_STATUS_CONFIG: Record<ApprovableStatus, {
  text: string
  color: string
  canReject: boolean  // 是否可以被驳回
  message: string
}> = {
  draft: {
    text: '草稿',
    color: 'default',
    canReject: false,
    message: '草稿状态的单据无法驳回'
  },
  pending: {
    text: '审批中',
    color: 'processing',
    canReject: true,
    message: ''
  },
  approved: {
    text: '已通过',
    color: 'success',
    canReject: false,  // 已通过的也可以驳回（如果业务需要）
    message: '已通过的单据无法驳回（请先撤销审批）'
  },
  rejected: {
    text: '已驳回',
    color: 'error',
    canReject: false,
    message: '单据已被驳回'
  },
  archived: {
    text: '已归档',
    color: 'default',
    canReject: false,
    message: '已归档的单据无法驳回'
  }
}

/**
 * 驳回单据的通用函数
 *
 * @param bizType - 业务类型（quotation/contract/entrustment/client）
 * @param id - 单据ID
 * @param params - 驳回参数
 * @param rejectedBy - 驳回人ID
 * @returns 驳回结果
 *
 * @example
 * ```typescript
 * const result = await rejectDocument('quotation', 'quotation-123', {
 *   rejectReason: '单价过低'
 * }, 'user-456')
 * ```
 */
export async function rejectDocument<T extends { status: string } & RejectionRecord>(
  bizType: 'quotation' | 'contract' | 'entrustment' | 'client',
  id: string,
  params: RejectParams,
  rejectedBy: string
): Promise<RejectResult> {
  // 验证驳回原因
  if (!params.rejectReason?.trim()) {
    throw new Error('驳回原因不能为空')
  }

  // 获取对应的 Prisma 模型
  const modelMap = {
    quotation: prisma.quotation,
    contract: prisma.contract,
    entrustment: prisma.entrustment,
    client: prisma.client
  }

  const model = modelMap[bizType]

  // 查询单据
  const document = await (model as any).findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      rejectedCount: true,
      rejectedCount: 0
    }
  }) as T & { rejectedCount: number }

  if (!document) {
    throw new Error('单据不存在')
  }

  // 验证状态
  const status = document.status as ApprovableStatus
  if (!APPROVAL_STATUS_CONFIG[status].canReject) {
    throw new Error(APPROVAL_STATUS_CONFIG[status].message)
  }

  // 更新单据状态
  const now = new Date()
  const updated = await (model as any).update({
    where: { id },
    data: {
      status: 'rejected',
      rejectedCount: document.rejectedCount + 1,
      lastRejectReason: params.rejectReason,
      lastRejectBy: rejectedBy,
      lastRejectAt: now
    }
  })

  return {
    success: true,
    rejectedCount: document.rejectedCount + 1,
    lastRejectReason: params.rejectReason,
    lastRejectBy: rejectedBy,
    lastRejectAt: now
  }
}
