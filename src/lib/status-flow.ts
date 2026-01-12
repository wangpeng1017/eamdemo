/**
 * @file status-flow.ts
 * @desc 状态流转验证 - 防止非法状态跳转
 */

import { badRequest } from './api-handler'

// ==================== 样品状态流转 ====================

/**
 * 样品状态
 */
export const SampleStatus = {
  RECEIVED: 'received',      // 已接收
  REGISTERED: 'registered',  // 已登记
  TESTING: 'testing',        // 检测中
  COMPLETED: 'completed',    // 已完成
  RETURNED: 'returned',      // 已归还
  DISPOSED: 'disposed',      // 已处置
} as const

type SampleStatusType = typeof SampleStatus[keyof typeof SampleStatus]

/**
 * 样品状态流转规则
 */
const sampleStatusTransitions: Record<SampleStatusType, SampleStatusType[]> = {
  [SampleStatus.RECEIVED]: [SampleStatus.REGISTERED],
  [SampleStatus.REGISTERED]: [SampleStatus.TESTING],
  [SampleStatus.TESTING]: [SampleStatus.COMPLETED],
  [SampleStatus.COMPLETED]: [SampleStatus.RETURNED, SampleStatus.DISPOSED],
  [SampleStatus.RETURNED]: [],
  [SampleStatus.DISPOSED]: [],
}

// ==================== 委托单状态流转 ====================

/**
 * 委托单状态
 */
export const EntrustmentStatus = {
  DRAFT: 'draft',            // 草稿
  PENDING: 'pending',        // 待处理
  ACCEPTED: 'accepted',      // 已受理
  TESTING: 'testing',        // 检测中
  COMPLETED: 'completed',    // 已完成
  CANCELLED: 'cancelled',    // 已取消
} as const

type EntrustmentStatusType = typeof EntrustmentStatus[keyof typeof EntrustmentStatus]

/**
 * 委托单状态流转规则
 */
const entrustmentStatusTransitions: Record<EntrustmentStatusType, EntrustmentStatusType[]> = {
  [EntrustmentStatus.DRAFT]: [EntrustmentStatus.PENDING, EntrustmentStatus.CANCELLED],
  [EntrustmentStatus.PENDING]: [EntrustmentStatus.ACCEPTED, EntrustmentStatus.CANCELLED],
  [EntrustmentStatus.ACCEPTED]: [EntrustmentStatus.TESTING, EntrustmentStatus.CANCELLED],
  [EntrustmentStatus.TESTING]: [EntrustmentStatus.COMPLETED],
  [EntrustmentStatus.COMPLETED]: [],
  [EntrustmentStatus.CANCELLED]: [],
}

// ==================== 检测任务状态流转 ====================

/**
 * 检测任务状态
 */
export const TaskStatus = {
  PENDING: 'pending',        // 待分配
  ASSIGNED: 'assigned',      // 已分配
  IN_PROGRESS: 'in_progress', // 进行中
  COMPLETED: 'completed',    // 已完成
  CANCELLED: 'cancelled',    // 已取消
} as const

type TaskStatusType = typeof TaskStatus[keyof typeof TaskStatus]

/**
 * 检测任务状态流转规则
 */
const taskStatusTransitions: Record<TaskStatusType, TaskStatusType[]> = {
  [TaskStatus.PENDING]: [TaskStatus.ASSIGNED, TaskStatus.CANCELLED],
  [TaskStatus.ASSIGNED]: [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.COMPLETED],
  [TaskStatus.COMPLETED]: [],
  [TaskStatus.CANCELLED]: [],
}

// ==================== 报告状态流转 ====================

/**
 * 报告状态
 */
export const ReportStatus = {
  DRAFT: 'draft',            // 草稿
  REVIEWING: 'reviewing',    // 审核中
  APPROVED: 'approved',      // 已批准
  ISSUED: 'issued',          // 已发布
  REJECTED: 'rejected',      // 已驳回
} as const

type ReportStatusType = typeof ReportStatus[keyof typeof ReportStatus]

/**
 * 报告状态流转规则
 */
const reportStatusTransitions: Record<ReportStatusType, ReportStatusType[]> = {
  [ReportStatus.DRAFT]: [ReportStatus.REVIEWING],
  [ReportStatus.REVIEWING]: [ReportStatus.APPROVED, ReportStatus.REJECTED],
  [ReportStatus.APPROVED]: [ReportStatus.ISSUED],
  [ReportStatus.ISSUED]: [],
  [ReportStatus.REJECTED]: [ReportStatus.DRAFT],
}

// ==================== 审批状态流转 ====================

/**
 * 审批状态
 */
export const ApprovalStatus = {
  DRAFT: 'draft',            // 草稿
  PENDING: 'pending',        // 审批中
  APPROVED: 'approved',      // 已通过
  REJECTED: 'rejected',      // 已驳回
  CANCELLED: 'cancelled',    // 已撤回
} as const

type ApprovalStatusType = typeof ApprovalStatus[keyof typeof ApprovalStatus]

/**
 * 审批状态流转规则
 */
const approvalStatusTransitions: Record<ApprovalStatusType, ApprovalStatusType[]> = {
  [ApprovalStatus.DRAFT]: [ApprovalStatus.PENDING],
  [ApprovalStatus.PENDING]: [ApprovalStatus.APPROVED, ApprovalStatus.REJECTED, ApprovalStatus.CANCELLED],
  [ApprovalStatus.APPROVED]: [],
  [ApprovalStatus.REJECTED]: [ApprovalStatus.DRAFT],
  [ApprovalStatus.CANCELLED]: [ApprovalStatus.DRAFT],
}

// ==================== 通用验证函数 ====================

/**
 * 验证状态流转是否合法
 * @param transitions 状态流转规则
 * @param currentStatus 当前状态
 * @param newStatus 目标状态
 * @param entityName 实体名称（用于错误消息）
 */
function validateTransition<T extends string>(
  transitions: Record<T, T[]>,
  currentStatus: T,
  newStatus: T,
  entityName: string
): void {
  // 如果状态没变，允许
  if (currentStatus === newStatus) {
    return
  }

  const allowedStatuses = transitions[currentStatus]
  if (!allowedStatuses || !allowedStatuses.includes(newStatus)) {
    badRequest(`${entityName}状态不能从 "${currentStatus}" 变更为 "${newStatus}"`)
  }
}

// ==================== 导出验证函数 ====================

/**
 * 验证样品状态流转
 */
export function validateSampleStatusTransition(currentStatus: string, newStatus: string): void {
  validateTransition(
    sampleStatusTransitions,
    currentStatus as SampleStatusType,
    newStatus as SampleStatusType,
    '样品'
  )
}

/**
 * 验证委托单状态流转
 */
export function validateEntrustmentStatusTransition(currentStatus: string, newStatus: string): void {
  validateTransition(
    entrustmentStatusTransitions,
    currentStatus as EntrustmentStatusType,
    newStatus as EntrustmentStatusType,
    '委托单'
  )
}

/**
 * 验证检测任务状态流转
 */
export function validateTaskStatusTransition(currentStatus: string, newStatus: string): void {
  validateTransition(
    taskStatusTransitions,
    currentStatus as TaskStatusType,
    newStatus as TaskStatusType,
    '检测任务'
  )
}

/**
 * 验证报告状态流转
 */
export function validateReportStatusTransition(currentStatus: string, newStatus: string): void {
  validateTransition(
    reportStatusTransitions,
    currentStatus as ReportStatusType,
    newStatus as ReportStatusType,
    '报告'
  )
}

/**
 * 验证审批状态流转
 */
export function validateApprovalStatusTransition(currentStatus: string, newStatus: string): void {
  validateTransition(
    approvalStatusTransitions,
    currentStatus as ApprovalStatusType,
    newStatus as ApprovalStatusType,
    '审批'
  )
}

// ==================== 状态文本映射 ====================

export const StatusText = {
  sample: {
    [SampleStatus.RECEIVED]: '已接收',
    [SampleStatus.REGISTERED]: '已登记',
    [SampleStatus.TESTING]: '检测中',
    [SampleStatus.COMPLETED]: '已完成',
    [SampleStatus.RETURNED]: '已归还',
    [SampleStatus.DISPOSED]: '已处置',
  },
  entrustment: {
    [EntrustmentStatus.DRAFT]: '草稿',
    [EntrustmentStatus.PENDING]: '待处理',
    [EntrustmentStatus.ACCEPTED]: '已受理',
    [EntrustmentStatus.TESTING]: '检测中',
    [EntrustmentStatus.COMPLETED]: '已完成',
    [EntrustmentStatus.CANCELLED]: '已取消',
  },
  task: {
    [TaskStatus.PENDING]: '待分配',
    [TaskStatus.ASSIGNED]: '已分配',
    [TaskStatus.IN_PROGRESS]: '进行中',
    [TaskStatus.COMPLETED]: '已完成',
    [TaskStatus.CANCELLED]: '已取消',
  },
  report: {
    [ReportStatus.DRAFT]: '草稿',
    [ReportStatus.REVIEWING]: '审核中',
    [ReportStatus.APPROVED]: '已批准',
    [ReportStatus.ISSUED]: '已发布',
    [ReportStatus.REJECTED]: '已驳回',
  },
  approval: {
    [ApprovalStatus.DRAFT]: '草稿',
    [ApprovalStatus.PENDING]: '审批中',
    [ApprovalStatus.APPROVED]: '已通过',
    [ApprovalStatus.REJECTED]: '已驳回',
    [ApprovalStatus.CANCELLED]: '已撤回',
  },
}
