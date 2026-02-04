
/**
 * @file spareparts-data.ts
 * @desc 备品备件模拟数据 - 食用油加工设备备件
 */
import { SparePart, StockInRecord, StockOutRecord, SparePartCategory, SparePartUnit, SparePartStatus } from '../lib/spareparts-types'
import { mockEquipments } from './mock-data'

const now = new Date()

function randomDate(start: Date, end: Date): string {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  return date.toISOString()
}

// 食用油加工设备备件名称
const sparePartNames = [
  '榨油机主轴', '榨螺', '榨笼条', '过滤机滤布', '滤芯', '轴承',
  '密封圈', '液压泵', '气缸', '电磁阀', '白土添加泵', '导热油泵',
  '真空泵', '脱臭塔填料', '换热器管束', '离心机转鼓', 'PLC控制器',
  '温度传感器', '压力传感器', '液位计'
]

const categories: SparePartCategory[] = ['mechanical', 'mechanical', 'mechanical', 'consumable', 'consumable', 'mechanical', 'consumable', 'hydraulic', 'pneumatic', 'pneumatic', 'hydraulic', 'hydraulic', 'hydraulic', 'consumable', 'mechanical', 'mechanical', 'control', 'electrical', 'electrical', 'electrical']

const units: SparePartUnit[] = ['piece', 'piece', 'set', 'piece', 'piece', 'piece', 'piece', 'piece', 'piece', 'piece', 'piece', 'piece', 'piece', 'piece', 'piece', 'set', 'set', 'piece', 'piece', 'piece']

const manufacturers = ['无锡宝鼎机械', '郑州远洋机械设备', '广州星戈机械制造', '山东国标机械', '江苏精诚粮油机械', 'SKF', 'NSK', '西门子', '施耐德', '欧姆龙']

const suppliers = ['供应商A', '供应商B', '供应商C', '供应商D', '供应商E']

const warehouses = ['备件库1', '备件库2', '临时仓库', '润滑油库']

// 生成20条备件数据
export const mockSpareParts: SparePart[] = Array.from({ length: 20 }, (_, i) => {
  const currentStock = Math.floor(Math.random() * 100)
  const reservedStock = Math.floor(Math.random() * 10)
  const safetyStock = Math.floor(10 + Math.random() * 20)
  const reorderPoint = safetyStock - 5

  // 根据库存判断状态
  let status: SparePartStatus = 'in_stock'
  if (currentStock === 0) status = 'out_of_stock'
  else if (reservedStock > 0) status = 'reserved'

  return {
    id: `SP${String(i + 1).padStart(4, '0')}`,
    code: `SP-${String(i + 1).padStart(4, '0')}`,
    name: sparePartNames[i],
    model: `MOD-${(i % 20) + 1}00`,
    category: categories[i],
    unit: units[i],
    manufacturer: manufacturers[i % manufacturers.length],
    supplier: suppliers[i % suppliers.length],
    unitPrice: Math.floor(100 + Math.random() * 10000),
    safetyStock,
    reorderPoint,
    currentStock,
    reservedStock,
    location: `${warehouses[i % warehouses.length]}-A${Math.floor(i / 4) + 1}-${(i % 10) + 1}`,
    warehouse: warehouses[i % warehouses.length],
    applicableEquipment: mockEquipments.slice(0, Math.floor(1 + Math.random() * 5)).map(e => e.id),
    description: `${sparePartNames[i]}用于食用油加工设备维护保养`,
    createdAt: randomDate(new Date(2023, 0, 1), new Date(2024, 11, 31)),
    updatedAt: randomDate(new Date(2024, 0, 1), now),
  }
})

// 生成10条入库记录
const stockInTypes = ['purchase', 'purchase', 'purchase', 'return', 'transfer', 'other'] as const
export const mockStockInRecords: StockInRecord[] = Array.from({ length: 10 }, (_, i) => {
  const sparePart = mockSpareParts[i % mockSpareParts.length]
  const type = stockInTypes[i % stockInTypes.length]
  const quantity = Math.floor(10 + Math.random() * 100)

  return {
    id: `SI${String(i + 1).padStart(4, '0')}`,
    orderNo: `SI-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`,
    sparePartId: sparePart.id,
    sparePartCode: sparePart.code,
    sparePartName: sparePart.name,
    type,
    quantity,
    unitPrice: sparePart.unitPrice,
    totalPrice: quantity * sparePart.unitPrice,
    supplier: sparePart.supplier,
    warehouse: sparePart.warehouse,
    location: sparePart.location,
    operator: '库管员',
    remark: `食用油设备备件入库-${i + 1}`,
    createdAt: randomDate(new Date(2024, 0, 1), now),
  }
})

// 生成15条出库记录
const stockOutTypes = ['repair', 'repair', 'repair', 'production', 'transfer', 'scrap', 'other'] as const
const departments = ['生产部', '设备部', '维护部', '质量部']
export const mockStockOutRecords: StockOutRecord[] = Array.from({ length: 15 }, (_, i) => {
  const sparePart = mockSpareParts[i % mockSpareParts.length]
  const type = stockOutTypes[i % stockOutTypes.length]
  const quantity = Math.floor(1 + Math.random() * 10)

  return {
    id: `SO${String(i + 1).padStart(4, '0')}`,
    orderNo: `SO-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`,
    sparePartId: sparePart.id,
    sparePartCode: sparePart.code,
    sparePartName: sparePart.name,
    type,
    quantity,
    requestId: type === 'repair' ? `RO${String(i + 1).padStart(4, '0')}` : undefined,
    requestNo: type === 'repair' ? `RO-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}` : undefined,
    department: departments[i % departments.length],
    operator: '库管员',
    receiver: `领用人-${(i % 5) + 1}`,
    remark: `食用油设备维修领用-${i + 1}`,
    createdAt: randomDate(new Date(2024, 0, 1), now),
  }
})
