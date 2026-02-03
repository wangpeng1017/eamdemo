
/**
 * @file spareparts-data.ts
 * @desc 备品备件模拟数据 - 20条备件、10条入库记录、15条出库记录
 */
import { SparePart, StockInRecord, StockOutRecord, SparePartCategory, SparePartUnit, SparePartStatus } from '../lib/spareparts-types'
import { mockEquipments } from './mock-data'

const now = new Date()

function randomDate(start: Date, end: Date): string {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  return date.toISOString()
}

// 备件名称
const sparePartNames = [
  '接触器', '继电器', '传感器', '电机', '轴承', '齿轮', '皮带', '密封圈',
  '液压泵', '气缸', '电磁阀', '滤芯', '控制器', '开关电源', '变压器',
  '联轴器', '减速机', '刹车片', '润滑油', '冷却液',
]

const categories: SparePartCategory[] = ['electrical', 'electrical', 'electrical', 'mechanical', 'mechanical', 'mechanical', 'mechanical', 'mechanical', 'hydraulic', 'pneumatic', 'pneumatic', 'consumable', 'control', 'electrical', 'electrical', 'mechanical', 'mechanical', 'mechanical', 'consumable', 'consumable']

const units: SparePartUnit[] = ['piece', 'piece', 'piece', 'piece', 'piece', 'piece', 'piece', 'piece', 'piece', 'piece', 'piece', 'piece', 'set', 'piece', 'piece', 'set', 'set', 'piece', 'liter', 'liter']

const manufacturers = ['西门子', '施耐德', '欧姆龙', 'ABB', '三菱', 'FESTO', 'SMC', 'SKF', 'NSK', 'SEW']

const suppliers = ['供应商A', '供应商B', '供应商C', '供应商D', '供应商E']

const warehouses = ['主仓库', '备件库1', '备件库2', '临时仓库']

// 生成20条备件数据
export const mockSpareParts: SparePart[] = Array.from({ length: 20 }, (_, i) => {
  const currentStock = Math.floor(Math.random() * 100)
  const reservedStock = Math.floor(Math.random() * 10)
  const safetyStock = Math.floor(10 + Math.random() * 20)
  const reorderPoint = safetyStock - 5

  // 根据库存判断状态
  let status: SparePartStatus = 'in_stock'
  if (currentStock === 0) status = 'out_of_stock'
  else if (currentStock <= reorderPoint) status = 'reserved'
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
    unitPrice: Math.floor(50 + Math.random() * 5000),
    safetyStock,
    reorderPoint,
    currentStock,
    reservedStock,
    location: `${warehouses[i % warehouses.length]}-A${Math.floor(i / 4) + 1}-${(i % 10) + 1}`,
    warehouse: warehouses[i % warehouses.length],
    applicableEquipment: mockEquipments.slice(0, Math.floor(1 + Math.random() * 5)).map(e => e.id),
    description: `备件描述-${i + 1}`,
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
    remark: `入库备注-${i + 1}`,
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
    remark: `出库备注-${i + 1}`,
    createdAt: randomDate(new Date(2024, 0, 1), now),
  }
})
