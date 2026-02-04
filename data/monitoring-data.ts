
/**
 * @file monitoring-data.ts
 * @desc 状态监测与故障诊断模拟数据 - 食用油加工设备监测
 */
import { MonitorPoint, MonitorData, AlarmRecord, DiagnosisRecord, TrendAnalysis, MonitorPointType, MonitorStatus, AlarmLevel, monitorPointTypeMap } from '@/lib/monitoring-types'
import { mockEquipments } from './mock-data'

const now = new Date()

function randomDate(start: Date, end: Date): string {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  return date.toISOString()
}

function addHours(date: Date, hours: number): Date {
  const result = new Date(date)
  result.setHours(result.getHours() + hours)
  return result
}

const pointTypes: MonitorPointType[] = ['temperature', 'vibration', 'pressure', 'current', 'voltage', 'flow', 'speed']
const statuses: MonitorStatus[] = ['normal', 'normal', 'normal', 'warning', 'alarm', 'offline']
const locations = ['榨油机主轴', '真空泵', '脱臭塔', '导热油炉', '精炼罐', '离心机', '换热器', '过滤机']
const sensorModels = ['S-T100', 'S-V200', 'S-P300', 'S-C400', 'S-FC500', 'S-F600', 'S-S700']
const manufacturers = ['传感器A厂', '传感器B厂', '传感器C厂', '传感器D厂']

// 生成20个监测点
export const mockMonitorPoints: MonitorPoint[] = Array.from({ length: 20 }, (_, i) => {
  const pointType = pointTypes[i % pointTypes.length]
  const equipment = mockEquipments[i % mockEquipments.length]
  const status = statuses[i % statuses.length]

  // 根据类型设置阈值
  let lowerLimit = 0,
    upperLimit = 100,
    warningLower = 10,
    warningUpper = 90,
    alarmLower = 5,
    alarmUpper = 95

  if (pointType === 'temperature') {
    lowerLimit = 0
    upperLimit = 120
    warningLower = 75
    warningUpper = 95
    alarmLower = 65
    alarmUpper = 100
  } else if (pointType === 'vibration') {
    lowerLimit = 0
    upperLimit = 10
    warningLower = 4
    warningUpper = 7
    alarmLower = 5
    alarmUpper = 8
  } else if (pointType === 'pressure') {
    lowerLimit = 0
    upperLimit = 30
    warningLower = 5
    warningUpper = 25
    alarmLower = 3
    alarmUpper = 27
  } else if (pointType === 'current') {
    lowerLimit = 0
    upperLimit = 100
    warningLower = 10
    warningUpper = 90
    alarmLower = 5
    alarmUpper = 95
  } else if (pointType === 'voltage') {
    lowerLimit = 350
    upperLimit = 410
    warningLower = 360
    warningUpper = 400
    alarmLower = 355
    alarmUpper = 405
  } else if (pointType === 'flow') {
    lowerLimit = 0
    upperLimit = 200
    warningLower = 40
    warningUpper = 160
    alarmLower = 20
    alarmUpper = 180
  } else if (pointType === 'speed') {
    lowerLimit = 0
    upperLimit = 3000
    warningLower = 500
    warningUpper = 2800
    alarmLower = 300
    alarmUpper = 2900
  }

  // 根据状态设置当前值
  let currentValue = (lowerLimit + upperLimit) / 2
  if (status === 'warning') {
    currentValue = Math.random() > 0.5 ? warningUpper + (alarmUpper - warningUpper) * 0.3 : warningLower - (warningLower - alarmLower) * 0.3
  } else if (status === 'alarm') {
    currentValue = Math.random() > 0.5 ? alarmUpper + 1 : alarmLower - 1
  }

  const installDate = randomDate(new Date(2023, 0, 1), new Date(2023, 11, 31))
  const calibrationDate = randomDate(new Date(2024, 0, 1), now)

  return {
    id: `MP${String(i + 1).padStart(4, '0')}`,
    pointNo: `MP-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`,
    pointName: `${equipment.name}-${locations[i % locations.length]}`,
    pointType,
    equipmentId: equipment.id,
    equipmentName: equipment.name,
    equipmentCode: equipment.code,
    location: locations[i % locations.length],
    lowerLimit,
    upperLimit,
    warningLower,
    warningUpper,
    alarmLower,
    alarmUpper,
    currentValue: parseFloat(currentValue.toFixed(2)),
    status,
    lastUpdate: randomDate(new Date(2024, 0, 1), now),
    sensorModel: sensorModels[i % sensorModels.length],
    sensorManufacturer: manufacturers[i % manufacturers.length],
    installDate,
    calibrationDate,
    nextCalibrationDate: addHours(new Date(calibrationDate), 8760).toISOString(), // 1年后
    description: `食用油加工设备监测点-${i + 1}`,
    remark: i % 5 === 0 ? '需要定期校准' : '',
    active: true,
    createdAt: installDate,
    updatedAt: randomDate(new Date(2024, 0, 1), now),
  }
})

// 生成50条监测数据
export const mockMonitorData: MonitorData[] = Array.from({ length: 50 }, (_, i) => {
  const point = mockMonitorPoints[i % mockMonitorPoints.length]
  const status = Math.random() > 0.8 ? (Math.random() > 0.5 ? 'warning' : 'alarm') : 'normal'
  let value = (point.lowerLimit + point.upperLimit) / 2

  if (status === 'warning') {
    value = Math.random() > 0.5 ? point.warningUpper + 0.5 : point.warningLower - 0.5
  } else if (status === 'alarm') {
    value = Math.random() > 0.5 ? point.alarmUpper + 0.5 : point.alarmLower - 0.5
  }

  value = parseFloat((value + (Math.random() - 0.5) * (point.upperLimit - point.lowerLimit) * 0.1).toFixed(2))

  return {
    id: `MD${String(i + 1).padStart(4, '0')}`,
    pointId: point.id,
    pointName: point.pointName,
    pointType: point.pointType,
    equipmentId: point.equipmentId,
    equipmentName: point.equipmentName,
    value,
    status,
    unit: monitorPointTypeMap[point.pointType].unit,
    collectTime: randomDate(new Date(2024, 0, 1), now),
    collector: Math.random() > 0.1 ? 'auto' : 'manual',
    createdAt: randomDate(new Date(2024, 0, 1), now),
  }
})

// 生成30条报警记录
export const mockAlarmRecords: AlarmRecord[] = Array.from({ length: 30 }, (_, i) => {
  const point = mockMonitorPoints[i % mockMonitorPoints.length]
  const levels: AlarmLevel[] = ['info', 'warning', 'critical', 'emergency']
  const level = levels[Math.floor(Math.random() * (statuses[i % statuses.length] === 'alarm' ? 4 : 2))]
  const statusOptions: AlarmRecord['status'][] = ['active', 'acknowledged', 'resolved']
  const status = statusOptions[i % statusOptions.length]

  const alarmValue = status === 'resolved' ? (point.lowerLimit + point.upperLimit) / 2 :
                     status === 'acknowledged' ? point.alarmUpper + 0.5 : point.alarmUpper + 1

  const alarmTime = randomDate(new Date(2024, 0, 1), now)

  return {
    id: `AR${String(i + 1).padStart(4, '0')}`,
    alarmNo: `AR-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`,
    pointId: point.id,
    pointName: point.pointName,
    pointType: point.pointType,
    equipmentId: point.equipmentId,
    equipmentName: point.equipmentName,
    level,
    alarmValue: parseFloat(alarmValue.toFixed(2)),
    thresholdValue: point.alarmUpper,
    alarmType: 'upper',
    status,
    alarmTime,
    acknowledgeTime: status !== 'active' ? addHours(new Date(alarmTime), 1).toISOString() : undefined,
    acknowledgedBy: status !== 'active' ? `操作员-${String((i % 5) + 1)}` : undefined,
    resolveTime: status === 'resolved' ? addHours(new Date(alarmTime), 2).toISOString() : undefined,
    resolveValue: status === 'resolved' ? parseFloat(((point.lowerLimit + point.upperLimit) / 2).toFixed(2)) : undefined,
    description: `${point.pointName}数值${level === 'emergency' ? '严重' : level === 'critical' ? '异常' : '超出'}阈值`,
    remark: i % 7 === 0 ? '已通知维修人员' : '',
    createdAt: alarmTime,
  }
})

// 生成10条故障诊断记录
export const mockDiagnosisRecords: DiagnosisRecord[] = Array.from({ length: 10 }, (_, i) => {
  const equipment = mockEquipments[i % mockEquipments.length]
  const diagnosisTime = randomDate(new Date(2024, 0, 1), now)
  const methods: DiagnosisRecord['diagnosisMethod'][] = ['ai', 'expert', 'manual']
  const results: DiagnosisRecord['diagnosisResult'][] = ['normal', 'degraded', 'fault', 'failure']
  const result = results[i % results.length]
  const method = methods[i % methods.length]

  const faultLocations = ['榨油机主轴轴承', '真空泵泵体', '脱臭塔密封系统', '导热油炉燃烧器', '精炼罐搅拌器', '离心机转鼓', '过滤机滤布', '液压系统泵']
  const faultTypes = ['磨损', '过热', '堵塞', '泄漏', '老化', '失衡', '松动', '断裂']
  const faultCauses = ['长期使用磨损', '润滑不足', '负载过大', '温度过高', '维护不当', '物料堵塞']

  return {
    id: `DG${String(i + 1).padStart(4, '0')}`,
    diagnosisNo: `DG-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`,
    equipmentId: equipment.id,
    equipmentName: equipment.name,
    equipmentCode: equipment.code,
    diagnosisTime,
    diagnosisMethod: method,
    diagnosisResult: result,
    confidence: Math.floor(70 + Math.random() * 30),
    faultLocation: result !== 'normal' ? faultLocations[i % faultLocations.length] : undefined,
    faultType: result !== 'normal' ? faultTypes[i % faultTypes.length] : undefined,
    faultCause: result !== 'normal' ? faultCauses[i % faultCauses.length] : undefined,
    faultDescription: result === 'normal' ? '食用油加工设备运行状态良好，未发现异常' :
                       result === 'degraded' ? '设备性能有所下降，建议关注' :
                       result === 'fault' ? '检测到故障隐患，建议尽快检修' : '设备存在严重故障，必须立即停机检修',
    recommendation: result === 'normal' ? '继续正常运行，按计划进行日常维护' :
                     result === 'degraded' ? '建议安排预防性维护，检查关键部件' :
                     result === 'fault' ? '建议尽快安排检修，更换相关部件' : '建议立即停机检修，进行全面检查',
    priority: result === 'failure' ? 'urgent' : result === 'fault' ? 'high' : result === 'degraded' ? 'normal' : 'low',
    evidences: [
      '监测数据显示异常趋势',
      '振动值超出正常范围',
      '温度持续升高',
      '真空度下降明显',
    ].slice(0, Math.floor(Math.random() * 3) + 1),
    handled: i % 3 === 0,
    handleResult: i % 3 === 0 ? '已更换相关部件，设备恢复正常' : undefined,
    handler: i % 3 === 0 ? `维修工-${String((i % 5) + 1)}` : undefined,
    handleTime: i % 3 === 0 ? randomDate(new Date(diagnosisTime), now) : undefined,
    createdBy: `系统诊断-${String((i % 3) + 1)}`,
    createdAt: diagnosisTime,
    updatedAt: randomDate(new Date(2024, 0, 1), now),
  }
})

// 生成20条趋势分析数据
export const mockTrendAnalyses: TrendAnalysis[] = mockMonitorPoints.slice(0, 20).map((point, i) => {
  const startTime = new Date(now)
  startTime.setHours(startTime.getHours() - 24)

  const dataPoints = Array.from({ length: 24 }, (_, j) => {
    const time = new Date(startTime)
    time.setHours(startTime.getHours() + j)
    return {
      time: time.toISOString(),
      value: parseFloat(((point.lowerLimit + point.upperLimit) / 2 + (Math.random() - 0.5) * (point.upperLimit - point.lowerLimit) * 0.3).toFixed(2)),
    }
  })

  const values = dataPoints.map(d => d.value)
  const avgValue = parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2))
  const maxValue = Math.max(...values)
  const minValue = Math.min(...values)
  const stdValue = parseFloat(Math.sqrt(values.map(v => Math.pow(v - avgValue, 2)).reduce((a, b) => a + b, 0) / values.length).toFixed(2))

  const firstValue = values[0]
  const lastValue = values[values.length - 1]
  const trendRate = parseFloat(((lastValue - firstValue) / firstValue * 100).toFixed(2))
  const trend: TrendAnalysis['trend'] = Math.abs(trendRate) < 5 ? 'stable' : trendRate > 0 ? 'rising' : 'falling'

  return {
    pointId: point.id,
    pointName: point.pointName,
    pointType: point.pointType,
    equipmentName: point.equipmentName,
    period: 'hour',
    startTime: startTime.toISOString(),
    endTime: now.toISOString(),
    avgValue,
    maxValue,
    minValue,
    stdValue,
    trend,
    trendRate,
    prediction: trend === 'stable' ? avgValue :
                 trend === 'rising' ? parseFloat((avgValue * (1 + Math.abs(trendRate) / 100)).toFixed(2)) :
                 parseFloat((avgValue * (1 - Math.abs(trendRate) / 100)).toFixed(2)),
    dataPoints,
    createdAt: now.toISOString(),
  }
})
