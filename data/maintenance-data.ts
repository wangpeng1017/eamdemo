
/**
 * @file maintenance-data.ts
 * @desc 维护保养模拟数据 - 食用油加工设备维护保养
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
const responsiblePeople = ['张工', '李工', '王工', '赵工', '孙工']

const maintenanceContents = [
  '检查榨油机主轴温度，检查润滑系统',
  '清理过滤机滤布，检查过滤效果',
  '检查真空泵抽气能力，清洁泵体',
  '检查脱臭塔真空度，检查密封系统',
  '检查导热油炉燃烧系统，清理换热器',
  '检查离心机振动情况，校准动平衡',
  '检查精炼罐搅拌器，检查轴承润滑',
  '检查白土添加系统，清理添加管道',
  '检查冬化分离机油温控制系统',
  '检查储油罐液位计和安全阀',
  '检查蒸汽管道阀门，修复泄漏点',
  '检查所有温度传感器，校准仪表',
  '检查液压系统压力，更换液压油',
  '检查电气控制柜，紧固接线端子',
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
    standard: '符合食用油加工设备技术规范要求',
    estimatedHours: Math.floor(1 + Math.random() * 8),
    responsiblePerson: responsiblePeople[i % responsiblePeople.length],
    priority: priorities[i % priorities.length],
    nextDate: nextDate.toISOString(),
    lastDate: i > 10 ? randomDate(new Date(2024, 0, 1), new Date()) : undefined,
    active: true,
    description: `食用油加工设备保养计划-${i + 1}`,
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
    result: status === 'completed' ? '保养完成，食用油加工设备运行正常' : undefined,
    findings: status === 'completed' && Math.random() > 0.7 ? '发现榨螺轻微磨损，已记录并计划更换' : undefined,
    spareParts: status === 'completed' && Math.random() > 0.5 ? '润滑油 x1, 滤芯 x2, 密封圈 x5' : undefined,
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
    { item: '设备外观', standard: '无损坏、无变形、无油污', method: '目视检查', result: Math.random() > 0.2 ? 'normal' : 'abnormal', value: undefined, remark: '' },
    { item: '运行声音', standard: '无异响、无异常摩擦声', method: '听觉检查', result: Math.random() > 0.2 ? 'normal' : 'abnormal', value: undefined, remark: '' },
    { item: '主轴温度', standard: '≤80℃', method: '温度计测量', result: 'normal', value: `${Math.floor(50 + Math.random() * 25)}℃`, remark: '' },
    { item: '振动情况', standard: '≤4.5mm/s', method: '振动仪测量', result: Math.random() > 0.3 ? 'normal' : 'abnormal', value: `${(Math.random() * 5).toFixed(1)}mm/s`, remark: '' },
    { item: '润滑油位', standard: '在刻度范围内', method: '目视检查', result: 'normal', value: '正常', remark: '' },
    { item: '液压压力', standard: '20-25MPa', method: '压力表读数', result: 'normal', value: `${(20 + Math.random() * 5).toFixed(1)}MPa`, remark: '' },
    { item: '真空度', standard: '≤-0.095MPa', method: '真空表读数', result: Math.random() > 0.2 ? 'normal' : 'abnormal', value: `${(-0.09 - Math.random() * 0.01).toFixed(3)}MPa`, remark: '' },
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
    summary: hasAbnormal ? '发现异常，已安排维修' : '食用油加工设备运行正常，无异常发现',
    status: hasAbnormal ? 'abnormal' : 'normal',
    createdAt: randomDate(new Date(2024, 0, 1), now),
  }
})
