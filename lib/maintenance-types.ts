/**
 * @file maintenance-types.ts
 * @desc 维护保养类型定义
 */

// 保养类型
export type MaintenanceType = 'preventive' | 'predictive' | 'corrective' | 'routine'

// 保养状态
export type MaintenanceStatus = 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'overdue' | 'cancelled'

// 保养周期类型
export type MaintenancePeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'runtime' | 'custom'

// 任务优先级
export type MaintenancePriority = 'urgent' | 'high' | 'normal' | 'low'

// 保养计划
export interface MaintenancePlan {
  id: string
  planNo: string
  name: string
  equipmentId: string
  equipmentCode: string
  equipmentName: string
  type: MaintenanceType
  period: MaintenancePeriod
  periodValue?: number
  content: string
  standard: string
  estimatedHours: number
  responsiblePerson: string
  priority: MaintenancePriority
  nextDate: string
  lastDate?: string
  active: boolean
  description?: string
  createdAt: string
  updatedAt: string
}

// 保养工单/任务
export interface MaintenanceTask {
  id: string
  taskNo: string
  planId: string
  planName: string
  equipmentId: string
  equipmentCode: string
  equipmentName: string
  type: MaintenanceType
  content: string
  standard: string
  scheduledDate: string
  responsiblePerson: string
  priority: MaintenancePriority
  status: MaintenanceStatus
  startTime?: string
  endTime?: string
  actualHours?: number
  result?: string
  findings?: string
  spareParts?: string
  verifier?: string
  verifyTime?: string
  verifyResult?: 'pass' | 'fail'
  createdAt: string
  updatedAt: string
}

// 点检记录
export interface InspectionRecord {
  id: string
  recordNo: string
  equipmentId: string
  equipmentCode: string
  equipmentName: string
  inspectionDate: string
  inspector: string
  items: InspectionItem[]
  summary: string
  status: 'normal' | 'abnormal'
  createdAt: string
}

// 点检项目
export interface InspectionItem {
  item: string
  standard: string
  method: string
  result: 'normal' | 'abnormal'
  value?: string
  remark?: string
}

// 状态映射
export const maintenanceTypeMap: Record<MaintenanceType, string> = {
  preventive: '预防性保养',
  predictive: '预测性保养',
  corrective: '纠正性保养',
  routine: '日常保养',
}

export const maintenanceStatusMap: Record<MaintenanceStatus, { label: string; color: string }> = {
  pending: { label: '待排程', color: '#999999' },
  scheduled: { label: '已排程', color: '#0097BA' },
  in_progress: { label: '进行中', color: '#00405C' },
  completed: { label: '已完成', color: '#2BA471' },
  overdue: { label: '已逾期', color: '#D54941' },
  cancelled: { label: '已取消', color: '#999999' },
}

export const maintenancePeriodMap: Record<MaintenancePeriod, string> = {
  daily: '每日',
  weekly: '每周',
  monthly: '每月',
  quarterly: '每季度',
  yearly: '每年',
  runtime: '按运行时间',
  custom: '自定义',
}

export const maintenancePriorityMap: Record<MaintenancePriority, { label: string; color: string }> = {
  urgent: { label: '紧急', color: '#D54941' },
  high: { label: '高', color: '#E37318' },
  normal: { label: '普通', color: '#0097BA' },
  low: { label: '低', color: '#999999' },
}
