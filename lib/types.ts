/**
 * @file types.ts
 * @desc 数据类型定义
 */

// 设备状态
export type EquipmentStatus = 'running' | 'standby' | 'maintenance' | 'repair' | 'scrapped'

// 设备关键性
export type EquipmentCriticality = 'core' | 'important' | 'normal'

// 设备信息
export interface Equipment {
  id: string
  code: string                    // 设备编码
  name: string                    // 设备名称
  model: string                   // 型号规格
  manufacturer: string            // 制造商
  category: string                // 设备分类
  location: string                // 安装位置
  department: string              // 使用部门
  status: EquipmentStatus         // 设备状态
  criticality: EquipmentCriticality // 关键性
  purchaseDate: string            // 购置日期
  installDate: string             // 安装日期
  warrantyDate: string            // 质保到期
  originalValue: number           // 原值
  responsiblePerson: string       // 负责人
  description?: string            // 备注
  createdAt: string
  updatedAt: string
}

// 维修工单状态
export type RepairStatus = 'pending' | 'assigned' | 'processing' | 'completed' | 'closed'

// 维修工单优先级
export type RepairPriority = 'urgent' | 'high' | 'normal' | 'low'

// 故障类型
export type FaultType = 'electrical' | 'mechanical' | 'hydraulic' | 'pneumatic' | 'control' | 'other'

// 维修工单
export interface RepairOrder {
  id: string
  orderNo: string                 // 工单编号
  equipmentId: string             // 设备ID
  equipmentCode: string           // 设备编码
  equipmentName: string           // 设备名称
  faultType: FaultType            // 故障类型
  faultDescription: string        // 故障描述
  priority: RepairPriority        // 优先级
  status: RepairStatus            // 工单状态
  reporter: string                // 报修人
  reportTime: string              // 报修时间
  assignee?: string               // 维修人员
  assignTime?: string             // 派工时间
  startTime?: string              // 开始维修时间
  endTime?: string                // 完成时间
  repairDescription?: string      // 维修描述
  spareParts?: string             // 使用备件
  laborHours?: number             // 工时
  cost?: number                   // 费用
  verifier?: string               // 验收人
  verifyTime?: string             // 验收时间
  verifyResult?: 'pass' | 'fail'  // 验收结果
  createdAt: string
  updatedAt: string
}

// 状态映射
export const equipmentStatusMap: Record<EquipmentStatus, { label: string; color: string }> = {
  running: { label: '运行中', color: '#2BA471' },
  standby: { label: '待机', color: '#0097BA' },
  maintenance: { label: '保养中', color: '#E37318' },
  repair: { label: '维修中', color: '#D54941' },
  scrapped: { label: '已报废', color: '#999999' },
}

export const repairStatusMap: Record<RepairStatus, { label: string; color: string }> = {
  pending: { label: '待派工', color: '#E37318' },
  assigned: { label: '已派工', color: '#0097BA' },
  processing: { label: '维修中', color: '#00405C' },
  completed: { label: '待验收', color: '#2BA471' },
  closed: { label: '已关闭', color: '#999999' },
}

export const repairPriorityMap: Record<RepairPriority, { label: string; color: string }> = {
  urgent: { label: '紧急', color: '#D54941' },
  high: { label: '高', color: '#E37318' },
  normal: { label: '普通', color: '#0097BA' },
  low: { label: '低', color: '#999999' },
}

export const faultTypeMap: Record<FaultType, string> = {
  electrical: '电气故障',
  mechanical: '机械故障',
  hydraulic: '液压故障',
  pneumatic: '气动故障',
  control: '控制故障',
  other: '其他',
}

export const criticalityMap: Record<EquipmentCriticality, { label: string; color: string }> = {
  core: { label: '核心设备', color: '#D54941' },
  important: { label: '重要设备', color: '#E37318' },
  normal: { label: '普通设备', color: '#0097BA' },
}
