/**
 * @file maintenance-data.ts
 * @desc 维护保养模拟数据 - 15条保养计划、20条保养任务、10条点检记录
 */
import { MaintenancePlan, MaintenanceTask, InspectionRecord, InspectionItem, MaintenanceType, MaintenanceStatus, MaintenancePeriod, MaintenancePriority } from '@/lib/maintenance-types'
import { mockEquipments } from './mock-data'

const now = new Date()

function randomDate(start: Date, end: Date): string {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  return date.toISOString()
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

const maintenanceTypes: MaintenanceType[] = ['preventive', 'preventive', 'preventive', 'routine', 'predictive']
const periods: MaintenancePeriod[] = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']
const priorities: MaintenancePriority[] = ['urgent', 'high', 'normal', 'normal', 'low']
const responsiblePeople = ['张三', '李四', '王五', '赵六', '孙七']

const maintenanceContents = [
  '检查设备运行状态，清洁设备表面',
  '检查润滑系统，更换润滑油',
  '检查电气系统，紧固接线端子',
  '检查液压系统，更换液压油',
  '检查传动系统，调整皮带张力',
  '检查安全装置，测试急停按钮',
  '清洁设备内部，更换滤芯',
  '校准传感器，检查仪表准确性',
  '检查冷却系统，清洁散热器',
  '全面检查设备，记录运行参数',
]

// 生成15条保养计划
export const mockMaintenancePlans: MaintenancePlan[] = Array.from({ length: 15 }, (_, i) => {
  const equipment = mockEquipments[i % mockEquipments.length]
  const type = maintenanceTypes[i % maintenanceTypes.length]
  const period = periods[i % periods.length]
  const nextDate = addDays(now, Math.floor(Math.random() * 30))

  return {
    id: `MP${String(i + 1).padStart(4, '0')}`,
    planNo: `MP-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`,
    name: `${equipment.name} - ${type === 'preventive' ? '预防性保养' : type === 'routine' ? '日常保养' : '预测性保养'}`,
    equipmentId: equipment.id,
    equipmentCode: equipment.code,
    equipmentName: equipment.name,
    type,
    period,
    periodValue: period === 'runtime' ? Math.floor(100 + Math.random() * 500) : undefined,
    content: maintenanceContents[i % maintenanceContents.length],
    standard: '符合设备技术规范要求',
    estimatedHours: Math.floor(1 + Math.random() * 8),
    responsiblePerson: responsiblePeople[i % responsiblePeople.length],
    priority: priorities[i % priorities.length],
    nextDate: nextDate.toISOString(),
    lastDate: i > 10 ? randomDate(new Date(2024, 0, 1), new Date()) : undefined,
    active: true,
    description: `保养计划备注-${i + 1}`,
    createdAt: randomDate(new Date(2024, 0, 1), now),
    updatedAt: randomDate(new Date(2024, 0, 1), now),
  }
})

// 生成20条保养任务
const taskStatuses: MaintenanceStatus[] = ['pending', 'scheduled', 'in_progress', 'completed', 'completed', 'overdue', 'cancelled']
export const mockMaintenanceTasks: MaintenanceTask[] = Array.from({ length: 20 }, (_, i) => {
  const plan = mockMaintenancePlans[i % mockMaintenancePlans.length]
  const status = taskStatuses[i % taskStatuses.length]
  const scheduledDate = addDays(now, -Math.floor(Math.random() * 20))

  return {
    id: `MT${String(i + 1).padStart(4, '0')}`,
    taskNo: `MT-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`,
    planId: plan.id,
    planName: plan.name,
    equipmentId: plan.equipmentId,
    equipmentCode: plan.equipmentCode,
    equipmentName: plan.equipmentName,
    type: plan.type,
    content: plan.content,
    standard: plan.standard,
    scheduledDate: scheduledDate.toISOString(),
    responsiblePerson: plan.responsiblePerson,
    priority: plan.priority,
    status,
    startTime: ['in_progress', 'completed'].includes(status) ? randomDate(scheduledDate, now) : undefined,
    endTime: status === 'completed' ? randomDate(scheduledDate, now) : undefined,
    actualHours: status === 'completed' ? Math.floor(1 + Math.random() * 8) : undefined,
    result: status === 'completed' ? '保养完成，设备运行正常' : undefined,
    findings: status === 'completed' && Math.random() > 0.7 ? '发现部分零件磨损，已记录' : undefined,
    spareParts: status === 'completed' && Math.random() > 0.5 ? '润滑油 x1, 滤芯 x2' : undefined,
    verifier: status === 'completed' && Math.random() > 0.3 ? '设备管理员' : undefined,
    verifyTime: status === 'completed' && Math.random() > 0.3 ? randomDate(new Date(2024, 0, 1), now) : undefined,
    verifyResult: status === 'completed' && Math.random() > 0.3 ? 'pass' : undefined,
    createdAt: randomDate(new Date(2024, 0, 1), now),
    updatedAt: randomDate(new Date(2024, 0, 1), now),
  }
})

// 生成10条点检记录
export const mockInspectionRecords: InspectionRecord[] = Array.from({ length: 10 }, (_, i) => {
  const equipment = mockEquipments[i % mockEquipments.length]
  const inspectionDate = addDays(now, -Math.floor(Math.random() * 30))

  const items: InspectionItem[] = [
    { item: '设备外观', standard: '无损坏、无变形', method: '目视检查', result: Math.random() > 0.2 ? 'normal' : 'abnormal', value: undefined, remark: '' },
    { item: '运行声音', standard: '无异响', method: '听觉检查', result: Math.random() > 0.2 ? 'normal' : 'abnormal', value: undefined, remark: '' },
    { item: '设备温度', standard: '≤60℃', method: '温度计测量', result: 'normal', value: `${Math.floor(40 + Math.random() * 15)}℃`, remark: '' },
    { item: '振动情况', standard: '≤3mm/s', method: '振动仪测量', result: Math.random() > 0.3 ? 'normal' : 'abnormal', value: `${(Math.random() * 4).toFixed(1)}mm/s`, remark: '' },
    { item: '润滑油位', standard: '在刻度范围内', method: '目视检查', result: 'normal', value: '正常', remark: '' },
  ]

  const hasAbnormal = items.some(item => item.result === 'abnormal')

  return {
    id: `IR${String(i + 1).padStart(4, '0')}`,
    recordNo: `IR-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`,
    equipmentId: equipment.id,
    equipmentCode: equipment.code,
    equipmentName: equipment.name,
    inspectionDate: inspectionDate.toISOString(),
    inspector: responsiblePeople[i % responsiblePeople.length],
    items,
    summary: hasAbnormal ? '发现异常，已安排维修' : '设备运行正常，无异常发现',
    status: hasAbnormal ? 'abnormal' : 'normal',
    createdAt: randomDate(new Date(2024, 0, 1), now),
  }
})
