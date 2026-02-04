/**
 * @file monitoring-types.ts
 * @desc 状态监测与故障诊断类型定义
 */

// 监测点类型
export type MonitorPointType = 'temperature' | 'vibration' | 'pressure' | 'current' | 'voltage' | 'flow' | 'speed' | 'other'

// 监测状态
export type MonitorStatus = 'normal' | 'warning' | 'alarm' | 'offline' | 'maintenance'

// 报警级别
export type AlarmLevel = 'info' | 'warning' | 'critical' | 'emergency'

// 诊断结果
export type DiagnosisResult = 'normal' | 'degraded' | 'fault' | 'failure'

// 监测点类型映射
export const monitorPointTypeMap = {
  temperature: { label: '温度', unit: '℃', icon: '🌡️' },
  vibration: { label: '振动', unit: 'mm/s', icon: '📳' },
  pressure: { label: '压力', unit: 'MPa', icon: '💨' },
  current: { label: '电流', unit: 'A', icon: '⚡' },
  voltage: { label: '电压', unit: 'V', icon: '🔌' },
  flow: { label: '流量', unit: 'm³/h', icon: '💧' },
  speed: { label: '转速', unit: 'rpm', icon: '🔄' },
  other: { label: '其他', unit: '-', icon: '📊' },
} as const

// 监测状态映射
export const monitorStatusMap = {
  normal: { label: '正常', color: 'green' },
  warning: { label: '预警', color: 'orange' },
  alarm: { label: '报警', color: 'red' },
  offline: { label: '离线', color: 'gray' },
  maintenance: { label: '维护中', color: 'blue' },
} as const

// 报警级别映射
export const alarmLevelMap = {
  info: { label: '提示', color: 'blue', priority: 1 },
  warning: { label: '预警', color: 'orange', priority: 2 },
  critical: { label: '严重', color: 'red', priority: 3 },
  emergency: { label: '紧急', color: 'magenta', priority: 4 },
} as const

// 监测点接口
export interface MonitorPoint {
  id: string
  pointNo: string // 监测点编号
  pointName: string // 监测点名称
  pointType: MonitorPointType // 监测类型
  equipmentId: string // 关联设备ID
  equipmentName: string // 关联设备名称
  equipmentCode: string // 关联设备编号
  location: string // 安装位置

  // 阈值设置
  lowerLimit: number // 下限值
  upperLimit: number // 上限值
  warningLower: number // 预警下限
  warningUpper: number // 预警上限
  alarmLower: number // 报警下限
  alarmUpper: number // 报警上限

  // 当前状态
  currentValue: number // 当前值
  status: MonitorStatus // 监测状态
  lastUpdate: string // 最后更新时间

  // 传感器信息
  sensorModel: string // 传感器型号
  sensorManufacturer: string // 传感器制造商
  installDate: string // 安装日期
  calibrationDate: string // 校准日期
  nextCalibrationDate: string // 下次校准日期

  // 其他信息
  description: string // 描述
  remark: string // 备注
  active: boolean // 是否启用

  createdAt: string
  updatedAt: string
}

// 监测数据记录
export interface MonitorData {
  id: string
  pointId: string // 监测点ID
  pointName: string // 监测点名称
  pointType: MonitorPointType // 监测类型
  equipmentId: string // 设备ID
  equipmentName: string // 设备名称

  value: number // 监测值
  status: MonitorStatus // 状态
  unit: string // 单位

  collectTime: string // 采集时间
  collector: string // 采集方式（auto/manual）

  createdAt: string
}

// 报警记录
export interface AlarmRecord {
  id: string
  alarmNo: string // 报警编号
  pointId: string // 监测点ID
  pointName: string // 监测点名称
  pointType: MonitorPointType // 监测类型
  equipmentId: string // 设备ID
  equipmentName: string // 设备名称

  level: AlarmLevel // 报警级别
  alarmValue: number // 报警值
  thresholdValue: number // 阈值
  alarmType: 'upper' | 'lower' | 'offline' // 报警类型（超上限/超下限/离线）

  status: 'active' | 'acknowledged' | 'resolved' // 报警状态
  alarmTime: string // 报警时间
  acknowledgeTime?: string // 确认时间
  acknowledgedBy?: string // 确认人
  resolveTime?: string // 恢复时间
  resolveValue?: number // 恢复值

  description: string // 报警描述
  remark: string // 备注

  createdAt: string
}

// 故障诊断记录
export interface DiagnosisRecord {
  id: string
  diagnosisNo: string // 诊断编号
  equipmentId: string // 设备ID
  equipmentName: string // 设备名称
  equipmentCode: string // 设备编号

  diagnosisTime: string // 诊断时间
  diagnosisMethod: 'ai' | 'expert' | 'manual' // 诊断方法
  diagnosisResult: DiagnosisResult // 诊断结果
  confidence: number // 置信度（0-100）

  // 故障信息
  faultLocation?: string // 故障部位
  faultType?: string // 故障类型
  faultCause?: string // 故障原因
  faultDescription: string // 故障描述

  // 建议
  recommendation: string // 处理建议
  priority: 'urgent' | 'high' | 'normal' | 'low' // 优先级

  // 诊断依据
  evidences: string[] // 诊断依据
  attachments?: string[] // 附件

  // 处理结果
  handled: boolean // 是否已处理
  handleResult?: string // 处理结果
  handler?: string // 处理人
  handleTime?: string // 处理时间

  createdBy: string // 创建人
  createdAt: string
  updatedAt: string
}

// 趋势分析数据
export interface TrendAnalysis {
  pointId: string // 监测点ID
  pointName: string // 监测点名称
  pointType: MonitorPointType // 监测类型
  equipmentName: string // 设备名称

  period: string // 分析周期（hour/day/week/month）
  startTime: string // 开始时间
  endTime: string // 结束时间

  // 统计数据
  avgValue: number // 平均值
  maxValue: number // 最大值
  minValue: number // 最小值
  stdValue: number // 标准差

  // 趋势判断
  trend: 'stable' | 'rising' | 'falling' | 'fluctuating' // 趋势
  trendRate: number // 变化率
  prediction?: number // 预测值

  // 数据点
  dataPoints: Array<{
    time: string
    value: number
  }>

  createdAt: string
}
