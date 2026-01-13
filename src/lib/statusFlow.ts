/**
 * @file statusFlow
 * @desc 状态流转规则定义
 */

// ==================== 咨询状态流转 ====================
export const consultationStatusFlow = {
  following: ['quoted', 'closed'],
  quoted: ['closed'],
  closed: [],
  rejected: [],
} as const

/**
 * 检查咨询状态是否可以转换
 */
export function canChangeConsultationStatus(from: string, to: string): boolean {
  const flow = consultationStatusFlow[from as keyof typeof consultationStatusFlow]
  return flow ? (flow as readonly string[]).includes(to) : false
}

// ==================== 报价状态流转 ====================
export const quotationStatusFlow = {
  draft: ['pending_sales', 'rejected'],
  pending_sales: ['pending_finance', 'rejected'],
  pending_finance: ['pending_lab', 'rejected'],
  pending_lab: ['approved', 'rejected'],
  approved: ['archived'],
  rejected: ['archived'],
  archived: [],
} as const

/**
 * 检查报价状态是否可以转换
 */
export function canChangeQuotationStatus(from: string, to: string): boolean {
  const flow = quotationStatusFlow[from as keyof typeof quotationStatusFlow]
  return flow ? (flow as readonly string[]).includes(to) : false
}

/**
 * 获取报价审批的下一状态
 */
export function getNextQuotationApprovalStatus(currentStatus: string): string | null {
  const flow: Record<string, string> = {
    draft: 'pending_sales',
    pending_sales: 'pending_finance',
    pending_finance: 'pending_lab',
  }
  return flow[currentStatus] || null
}

// ==================== 合同状态流转 ====================
export const contractStatusFlow = {
  draft: ['signed', 'terminated'],
  signed: ['executing', 'terminated'],
  executing: ['completed', 'terminated'],
  completed: [],
  terminated: [],
} as const

/**
 * 检查合同状态是否可以转换
 */
export function canChangeContractStatus(from: string, to: string): boolean {
  const flow = contractStatusFlow[from as keyof typeof contractStatusFlow]
  return flow ? (flow as readonly string[]).includes(to) : false
}

// ==================== 样品状态流转 ====================
export const sampleStatusFlow = {
  '待收样': ['已收样'],
  '已收样': ['已分配', '已归还', '已销毁'],
  '已分配': ['检测中', '已外包'],
  '检测中': ['已完成', '已归还'],
  '已完成': ['已归还', '已销毁'],
  '已外包': ['已完成', '已归还'],
  '已归还': [],
  '已销毁': [],
} as const

/**
 * 检查样品状态是否可以转换
 */
export function canChangeSampleStatus(from: string, to: string): boolean {
  const flow = sampleStatusFlow[from as keyof typeof sampleStatusFlow]
  return flow ? (flow as readonly string[]).includes(to) : false
}

// ==================== 任务状态流转 ====================
export const taskStatusFlow = {
  pending: ['in_progress', 'transferred'],
  in_progress: ['pending_review', 'transferred'],
  pending_review: ['completed', 'in_progress'],  // 审核通过 → completed，驳回 → in_progress
  completed: [],
  transferred: ['pending'],
} as const

/**
 * 检查任务状态是否可以转换
 */
export function canChangeTaskStatus(from: string, to: string): boolean {
  const flow = taskStatusFlow[from as keyof typeof taskStatusFlow]
  return flow ? (flow as readonly string[]).includes(to) : false
}

// ==================== 检测项目状态流转 ====================
export const projectStatusFlow = {
  pending: ['assigned', 'subcontracted'],
  assigned: ['completed'],
  subcontracted: ['completed'],
  completed: [],
} as const

/**
 * 检查检测项目状态是否可以转换
 */
export function canChangeProjectStatus(from: string, to: string): boolean {
  const flow = projectStatusFlow[from as keyof typeof projectStatusFlow]
  return flow ? (flow as readonly string[]).includes(to) : false
}

// ==================== 报告状态流转 ====================
export const reportStatusFlow = {
  draft: ['reviewing'],
  reviewing: ['approved', 'draft'], // approved means both reviewed and approved
  approved: ['issued'],
  issued: [],
} as const

/**
 * 检查报告状态是否可以转换
 */
export function canChangeReportStatus(from: string, to: string): boolean {
  const flow = reportStatusFlow[from as keyof typeof reportStatusFlow]
  return flow ? (flow as readonly string[]).includes(to) : false
}

// ==================== 设备状态流转 ====================
export const deviceStatusFlow = {
  Running: ['Maintenance', 'Idle', 'Scrapped'],
  Maintenance: ['Running', 'Scrapped'],
  Idle: ['Running', 'Maintenance', 'Scrapped'],
  Scrapped: [],
} as const

/**
 * 检查设备状态是否可以转换
 */
export function canChangeDeviceStatus(from: string, to: string): boolean {
  const flow = deviceStatusFlow[from as keyof typeof deviceStatusFlow]
  return flow ? (flow as readonly string[]).includes(to) : false
}

// ==================== 财务应收状态流转 ====================
export const receivableStatusFlow = {
  pending: ['partial', 'completed'],
  partial: ['completed'],
  completed: [],
} as const

/**
 * 检查应收状态是否可以转换
 */
export function canChangeReceivableStatus(from: string, to: string): boolean {
  const flow = receivableStatusFlow[from as keyof typeof receivableStatusFlow]
  return flow ? (flow as readonly string[]).includes(to) : false
}

// ==================== 发票状态流转 ====================
export const invoiceStatusFlow = {
  pending: ['issued'],
  issued: [],
} as const

/**
 * 检查发票状态是否可以转换
 */
export function canChangeInvoiceStatus(from: string, to: string): boolean {
  const flow = invoiceStatusFlow[from as keyof typeof invoiceStatusFlow]
  return flow ? (flow as readonly string[]).includes(to) : false
}

// ==================== 样品领用状态流转 ====================
export const sampleRequisitionStatusFlow = {
  requisitioned: ['returned', 'overdue'],
  returned: [],
  overdue: ['returned'],
} as const

/**
 * 检查样品领用状态是否可以转换
 */
export function canChangeSampleRequisitionStatus(from: string, to: string): boolean {
  const flow = sampleRequisitionStatusFlow[from as keyof typeof sampleRequisitionStatusFlow]
  return flow ? (flow as readonly string[]).includes(to) : false
}

// ==================== 审批级别定义 ====================
export const quotationApprovalLevels = [
  { level: 1, role: 'sales_manager', name: '销售经理' },
  { level: 2, role: 'finance', name: '财务' },
  { level: 3, role: 'lab_director', name: '实验室负责人' },
] as const

/**
 * 获取当前审批级别
 */
export function getQuotationApprovalLevel(status: string): number {
  const levels: Record<string, number> = {
    pending_sales: 1,
    pending_finance: 2,
    pending_lab: 3,
  }
  return levels[status] || 0
}

/**
 * 检查用户是否有审批权限
 */
export function hasQuotationApprovalPermission(userRole: string, quotationStatus: string): boolean {
  const level = getQuotationApprovalLevel(quotationStatus)
  if (level === 0) return false

  const levelConfig = quotationApprovalLevels.find(l => l.level === level)
  return levelConfig?.role === userRole
}
