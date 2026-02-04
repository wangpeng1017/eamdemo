
/**
 * @file mock-data.ts
 * @desc 模拟数据 - 20条食用油加工设备记录、20条维修工单
 */
import { Equipment, RepairOrder, EquipmentStatus, RepairStatus } from '@/lib/types'

// 当前日期
const now = new Date()

// 生成随机日期
function randomDate(start: Date, end: Date): string {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  return date.toISOString().split('T')[0]
}

// 食用油加工设备分类
const categories = [
  '螺旋榨油机', '液压榨油机', '浸出器', '蒸发器', '蒸汽脱臭塔',
  '脱色塔', '精炼罐', '过滤机', '离心机', '结晶罐',
  '冬化分离机', '脱蜡罐', '磷酸反应罐', '水洗罐', '干燥器',
  '真空泵', '导热油炉', '换热器', '储油罐', '灌装机'
]
const manufacturers = [
  '无锡宝鼎机械', '郑州远洋机械设备', '广州星戈机械制造', '山东国标机械',
  '江苏精诚粮油机械', '河南粮油机械厂', '中粮工程装备', '迈安德集团',
  '江苏牧羊集团', '山东凯斯达机械'
]
const locations = ['预处理车间', '压榨车间', '浸出车间', '精炼车间', '灌装车间', '成品库']
const departments = ['生产部', '设备部', '质量部', '维护部']
const responsiblePeople = ['张工', '李工', '王工', '赵工', '孙工', '周工', '吴工', '郑工']

// 生成20条食用油加工设备数据
export const mockEquipments: Equipment[] = Array.from({ length: 20 }, (_, i) => {
  const purchaseDate = randomDate(new Date(2018, 0, 1), new Date(2023, 11, 31))
  const statusPool: EquipmentStatus[] = ['running', 'running', 'running', 'standby', 'maintenance', 'repair']
  const criticalityPool = ['core', 'important', 'normal', 'normal', 'normal']

  return {
    id: `EQ${String(i + 1).padStart(4, '0')}`,
    code: `EQ-${String(i + 1).padStart(4, '0')}`,
    name: `${categories[i % categories.length]}-${i + 1}号`,
    model: `YZ-${(i % 10) + 1}00`,
    manufacturer: manufacturers[i % manufacturers.length],
    category: categories[i % categories.length],
    location: locations[i % locations.length],
    department: departments[i % departments.length],
    status: statusPool[i % statusPool.length],
    criticality: criticalityPool[i % criticalityPool.length] as any,
    purchaseDate,
    installDate: purchaseDate,
    warrantyDate: randomDate(new Date(2024, 0, 1), new Date(2026, 11, 31)),
    originalValue: Math.floor(100000 + Math.random() * 900000),
    responsiblePerson: responsiblePeople[i % responsiblePeople.length],
    description: `${categories[i % categories.length]}用于食用油加工生产线，日处理能力${50 + (i % 10) * 50}吨`,
    createdAt: purchaseDate,
    updatedAt: randomDate(new Date(2024, 0, 1), now),
  }
})

// 维修人员
const repairPeople = ['维修工-张', '维修工-李', '维修工-王', '维修工-刘', '维修工-陈']
const reporters = ['操作员-A', '操作员-B', '操作员-C', '操作员-D']
const faultTypes = ['electrical', 'mechanical', 'hydraulic', 'pneumatic', 'control', 'other']
const faultDescriptions = [
  '榨油机主轴温度过高，自动停机保护',
  '真空泵抽气能力下降，真空度不足',
  '蒸汽脱臭塔密封泄漏，真空无法维持',
  '过滤机滤布堵塞，过滤速度明显降低',
  '精炼罐搅拌器异响，轴承可能损坏',
  '导热油炉点火失败，无法正常加热',
  '离心机振动超标，转子失衡',
  '换热器结垢严重，换热效率下降',
  '储油罐液位计故障，读数不准确',
  '灌装机计量不准确，灌装量偏差大',
  '液压系统压力波动，压榨压力不稳定',
  '控制系统PLC故障，设备无法启动',
  '脱色塔白土添加系统堵塞，添加不均匀',
  '冬化分离机油温控制系统故障',
  '蒸汽管道泄漏，车间温度异常升高',
  '电机过载保护跳闸，无法复位',
  '传感器信号异常，温度显示错误',
  '气动阀门卡死，无法正常切换',
  '冷凝器冷却效果差，真空度无法保证',
  '输送带跑偏，物料分布不均',
]

// 生成20条维修工单数据
export const mockRepairOrders: RepairOrder[] = Array.from({ length: 20 }, (_, i) => {
  const equipment = mockEquipments[i % mockEquipments.length]
  const reportTime = randomDate(new Date(2024, 0, 1), now)
  const statusPool: RepairStatus[] = ['pending', 'assigned', 'processing', 'completed', 'closed', 'closed']
  const priorityPool = ['urgent', 'high', 'normal', 'normal', 'low']
  const status = statusPool[i % statusPool.length]

  const order: RepairOrder = {
    id: `RO${String(i + 1).padStart(4, '0')}`,
    orderNo: `RO-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`,
    equipmentId: equipment.id,
    equipmentCode: equipment.code,
    equipmentName: equipment.name,
    faultType: faultTypes[i % faultTypes.length] as any,
    faultDescription: faultDescriptions[i % faultDescriptions.length],
    priority: priorityPool[i % priorityPool.length] as any,
    status,
    reporter: reporters[i % reporters.length],
    reportTime,
    createdAt: reportTime,
    updatedAt: randomDate(new Date(reportTime), now),
  }

  // 根据状态设置其他字段
  if (status !== 'pending') {
    order.assignee = repairPeople[i % repairPeople.length]
    order.assignTime = randomDate(new Date(reportTime), now)
  }

  if (status === 'processing' || status === 'completed' || status === 'closed') {
    order.startTime = randomDate(new Date(order.assignTime!), now)
  }

  if (status === 'completed' || status === 'closed') {
    order.endTime = randomDate(new Date(order.startTime!), now)
    order.repairDescription = '维修已完成，更换相关部件，设备恢复正常运行'
    order.spareParts = '轴承 x2, 密封圈 x5, 传感器 x1'
    order.laborHours = Math.floor(2 + Math.random() * 6)
    order.cost = Math.floor(500 + Math.random() * 3000)
  }

  if (status === 'closed') {
    order.verifier = '设备管理员'
    order.verifyTime = randomDate(new Date(order.endTime!), now)
    order.verifyResult = 'pass'
  }

  return order
})
