
/**
 * @file mock-data.ts
 * @desc 模拟数据 - 20条设备记录、20条维修工单
 */
import { Equipment, RepairOrder, EquipmentStatus, RepairStatus } from '@/lib/types'

// 当前日期
const now = new Date()

// 生成随机日期
function randomDate(start: Date, end: Date): string {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  return date.toISOString().split('T')[0]
}

// 设备分类
const categories = ['数控机床', '注塑机', '冲压机', '焊接机器人', '热处理炉', '检测设备', '输送线', '包装机']
const manufacturers = ['西门子', '发那科', '三菱', '欧姆龙', 'ABB', '库卡', '大族激光', '华工激光']
const locations = ['一车间', '二车间', '三车间', '精工车间', '装配车间', '包装车间']
const departments = ['生产部', '设备部', '质量部', '维护部']
const responsiblePeople = ['张三', '李四', '王五', '赵六', '孙七', '周八', '吴九', '郑十']

// 生成20条设备数据
export const mockEquipments: Equipment[] = Array.from({ length: 20 }, (_, i) => {
  const purchaseDate = randomDate(new Date(2018, 0, 1), new Date(2023, 11, 31))
  const statusPool: EquipmentStatus[] = ['running', 'running', 'running', 'standby', 'maintenance', 'repair']
  const criticalityPool = ['core', 'important', 'normal', 'normal', 'normal']

  return {
    id: `EQ${String(i + 1).padStart(4, '0')}`,
    code: `EQ-${String(i + 1).padStart(4, '0')}`,
    name: `${categories[i % categories.length]}-${i + 1}号`,
    model: `MOD-${(i % 10) + 1}00`,
    manufacturer: manufacturers[i % manufacturers.length],
    category: categories[i % categories.length],
    location: locations[i % locations.length],
    department: departments[i % departments.length],
    status: statusPool[i % statusPool.length],
    criticality: criticalityPool[i % criticalityPool.length] as any,
    purchaseDate,
    installDate: purchaseDate,
    warrantyDate: randomDate(new Date(2024, 0, 1), new Date(2026, 11, 31)),
    originalValue: Math.floor(50000 + Math.random() * 450000),
    responsiblePerson: responsiblePeople[i % responsiblePeople.length],
    description: `设备描述信息-${i + 1}`,
    createdAt: purchaseDate,
    updatedAt: randomDate(new Date(2024, 0, 1), now),
  }
})

// 维修人员
const repairPeople = ['维修工-张', '维修工-李', '维修工-王', '维修工-刘', '维修工-陈']
const reporters = ['操作员-A', '操作员-B', '操作员-C', '操作员-D']
const faultTypes = ['electrical', 'mechanical', 'hydraulic', 'pneumatic', 'control', 'other']
const faultDescriptions = [
  '设备突然停机，无法启动',
  '运行异响，振动异常',
  '温度过高，报警停机',
  '精度偏差，产品不合格',
  '控制系统故障，参数设置失败',
  '液压系统压力不足',
  '电气元件烧毁',
  '传感器信号异常',
  '电机过热保护',
  '传动部件卡死',
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
    order.spareParts = '备件-A x2, 备件-B x1'
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
