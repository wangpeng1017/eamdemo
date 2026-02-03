/**
 * 审批流类型定义
 * @desc 统一审批流系统的类型定义
 */

// ==================== 审批节点类型 ====================

/**
 * 审批节点
 */
export interface ApprovalNode {
  step: number // 步骤序号
  order?: number // 步骤序号 (兼容字段)
  name: string // 节点名称
  type: 'role' | 'user' | 'department' // 审批类型
  targetId: string // 审批对象ID(角色编码/用户ID/部门ID)
  targetName: string // 审批对象名称
  required: boolean // 是否必须
}

/**
 * 审批流程配置
 */
export interface ApprovalFlowConfig {
  id: string
  name: string
  code: string
  businessType: string // 业务类型: quotation/contract/client
  description?: string
  nodes: ApprovalNode[] // 审批节点列表
  status: boolean
  createdAt: Date
  updatedAt: Date
}

// ==================== 审批实例类型 ====================

/**
 * 审批实例状态
 */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

/**
 * 审批动作
 */
export type ApprovalAction = 'approve' | 'reject' | 'cancel'

/**
 * 审批实例
 */
export interface ApprovalInstance {
  id: string
  bizType: string // 业务类型: quotation/contract/client
  bizId: string // 业务ID
  flowCode: string // 流程编码
  currentStep: number // 当前步骤(0=未提交,1=第一级...)
  status: ApprovalStatus
  submitterId: string // 提交人ID
  submitterName: string // 提交人姓名
  submittedAt?: Date // 提交时间
  completedAt?: Date // 完成时间
  createdAt: Date
  updatedAt: Date
  records?: ApprovalRecord[] // 审批记录
}

// ==================== 审批记录类型 ====================

/**
 * 审批记录
 */
export interface ApprovalRecord {
  id: string
  instanceId: string
  step: number // 审批步骤(1/2/3...)
  nodeType: string // role/user/department
  targetType: string // 审批对象(角色编码/用户ID/部门ID)
  targetName: string // 审批人/角色名称
  approverId?: string // 实际审批人ID
  approverName?: string // 实际审批人姓名
  action: ApprovalAction // approve/reject/cancel
  comment?: string // 审批意见
  actedAt?: Date // 操作时间
  createdAt: Date
}

// ==================== 审批日志类型 ====================

/**
 * 审批日志
 */
export interface ApprovalLog {
  id: string
  bizType: string
  bizId: string
  action: string // submit/approve/reject/cancel
  comment?: string
  operatorId: string
  operatorName: string
  createdAt: Date
}

// ==================== 提交审批参数 ====================

/**
 * 提交审批参数
 */
export interface SubmitApprovalParams {
  bizType: string // 业务类型
  bizId: string // 业务ID
  flowCode: string // 流程编码
  submitterId: string // 提交人ID
  submitterName: string // 提交人姓名
}

/**
 * 审批操作参数
 */
export interface ApproveParams {
  instanceId: string
  action: 'approve' | 'reject'
  approverId: string
  approverName: string
  comment?: string
}

/**
 * 撤回审批参数
 */
export interface CancelApprovalParams {
  instanceId: string
  operatorId: string
}

// ==================== 业务类型映射 ====================

/**
 * 支持的业务类型
 */
export const APPROVAL_BUSINESS_TYPES = {
  QUOTATION: 'quotation', // 报价单
  CONTRACT: 'contract', // 合同
  CLIENT: 'client', // 客户单位
} as const

export type BusinessType = keyof typeof APPROVAL_BUSINESS_TYPES

// ==================== 状态文本映射 ====================

/**
 * 审批状态文本映射
 */
export const APPROVAL_STATUS_TEXT: Record<ApprovalStatus, string> = {
  pending: '审批中',
  approved: '已通过',
  rejected: '已驳回',
  cancelled: '已撤回',
}

/**
 * 审批动作文本映射
 */
export const APPROVAL_ACTION_TEXT: Record<ApprovalAction, string> = {
  approve: '通过',
  reject: '驳回',
  cancel: '撤回',
}
