# -*- coding: utf-8 -*-
content = """
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
  planNo: string                    // 计划编号
  name: string                      // 计划名称
  equipmentId: string               // 设备ID
  equipmentCode: string             // 设备编码
  equipmentName: string             // 设备名称
  type: MaintenanceType             // 保养类型
  period: MaintenancePeriod         // 周期类型
  periodValue?: number              // 周期值（如运行小时数）
  content: string                   // 保养内容
  standard: string                  // 保养标准
  estimatedHours: number            // 预计工时
  responsiblePerson: string         // 负责人
  priority: MaintenancePriority     // 优先级
  nextDate: string                  // 下次保养日期
  lastDate?: string                 // 上次保养日期
  active: boolean                   // 是否激活
  description?: string              // 备注
  createdAt: string
  updatedAt: string
}

// 保养工单/任务
export interface MaintenanceTask {
  id: string
  taskNo: string                    // 任务编号
  planId: string                    // 计划ID
  planName: string                  // 计划名称
  equipmentId: string               // 设备ID
  equipmentCode: string             // 设备编码
  equipmentName: string             // 设备名称
  type: MaintenanceType             // 保养类型
  content: string                   // 保养内容
  standard: string                  // 保养标准
  scheduledDate: string             // 计划日期
  responsiblePerson: string         // 负责人
  priority: MaintenancePriority     // 优先级
  status: MaintenanceStatus         // 状态
  startTime?: string                // 开始时间
  endTime?: string                  // 完成时间
  actualHours?: number              // 实际工时
  result?: string                   // 保养结果
  findings?: string                 // 发现问题
  spareParts?: string               // 使用备件
  verifier?: string                 // 验收人
  verifyTime?: string               // 验收时间
  verifyResult?: 'pass' | 'fail'    // 验收结果
  createdAt: string
  updatedAt: string
}

// 点检记录
export interface InspectionRecord {
  id: string
  recordNo: string                  // 记录编号
  equipmentId: string               // 设备ID
  equipmentCode: string             // 设备编码
  equipmentName: string             // 设备名称
  inspectionDate: string            // 点检日期
  inspector: string                 // 点检人
  items: InspectionItem[]           // 点检项目
  summary: string                   // 点检总结
  status: 'normal' | 'abnormal'     // 状态
  createdAt: string
}

// 点检项目
export interface InspectionItem {
  item: string                      // 项目名称
  standard: string                  // 检查标准
  method: string                    // 检查方法
  result: 'normal' | 'abnormal'     // 检查结果
  value?: string                    // 实测值
  remark?: string                   // 备注
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
"""

with open('/Users/wangpeng/Downloads/eamdemo/eam-demo/lib/maintenance-types.ts', 'w', encoding='utf-8') as f:
    f.write(content)
print('OK: maintenance-types.ts')
