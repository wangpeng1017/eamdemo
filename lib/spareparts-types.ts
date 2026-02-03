
/**
 * @file spareparts-types.ts
 * @desc 备品备件类型定义
 */

// 备件状态
export type SparePartStatus = 'in_stock' | 'out_of_stock' | 'reserved' | 'in_transit' | 'scrapped'

// 备件分类
export type SparePartCategory = 'electrical' | 'mechanical' | 'hydraulic' | 'pneumatic' | 'control' | 'consumable' | 'other'

// 备件单位
export type SparePartUnit = 'piece' | 'set' | 'meter' | 'kilogram' | 'liter'

// 备品备件信息
export interface SparePart {
  id: string
  code: string                      // 备件编码
  name: string                      // 备件名称
  model: string                     // 型号规格
  category: SparePartCategory       // 分类
  unit: SparePartUnit               // 单位
  manufacturer: string              // 制造商
  supplier: string                  // 供应商
  unitPrice: number                 // 单价
  safetyStock: number               // 安全库存
  reorderPoint: number              // 重订货点
  currentStock: number              // 当前库存
  reservedStock: number             // 已预留库存
  location: string                  // 存放位置
  warehouse: string                 // 仓库
  applicableEquipment?: string[]    // 适用设备
  description?: string              // 备注
  createdAt: string
  updatedAt: string
}

// 入库记录
export interface StockInRecord {
  id: string
  orderNo: string                   // 入库单号
  sparePartId: string               // 备件ID
  sparePartCode: string             // 备件编码
  sparePartName: string             // 备件名称
  type: 'purchase' | 'return' | 'transfer' | 'other'  // 入库类型
  quantity: number                  // 数量
  unitPrice: number                 // 单价
  totalPrice: number                // 总价
  supplier: string                  // 供应商
  warehouse: string                 // 仓库
  location: string                  // 存放位置
  operator: string                  // 操作人
  remark?: string                   // 备注
  createdAt: string
}

// 出库记录
export interface StockOutRecord {
  id: string
  orderNo: string                   // 出库单号
  sparePartId: string               // 备件ID
  sparePartCode: string             // 备件编码
  sparePartName: string             // 备件名称
  type: 'repair' | 'production' | 'transfer' | 'scrap' | 'other'  // 出库类型
  quantity: number                  // 数量
  requestId?: string                // 关联单据ID（维修工单等）
  requestNo?: string                // 关联单据编号
  department: string                // 领用部门
  operator: string                  // 操作人
  receiver: string                  // 领用人
  remark?: string                   // 备注
  createdAt: string
}

// 状态映射
export const sparePartStatusMap: Record<SparePartStatus, { label: string; color: string }> = {
  in_stock: { label: '在库', color: '#2BA471' },
  out_of_stock: { label: '缺货', color: '#D54941' },
  reserved: { label: '已预留', color: '#E37318' },
  in_transit: { label: '在途', color: '#0097BA' },
  scrapped: { label: '已报废', color: '#999999' },
}

export const sparePartCategoryMap: Record<SparePartCategory, string> = {
  electrical: '电气件',
  mechanical: '机械件',
  hydraulic: '液压件',
  pneumatic: '气动件',
  control: '控制件',
  consumable: '消耗品',
  other: '其他',
}

export const sparePartUnitMap: Record<SparePartUnit, string> = {
  piece: '件',
  set: '套',
  meter: '米',
  kilogram: '千克',
  liter: '升',
}

export const stockInTypeMap: Record<StockInRecord['type'], string> = {
  purchase: '采购入库',
  return: '退货入库',
  transfer: '调拨入库',
  other: '其他入库',
}

export const stockOutTypeMap: Record<StockOutRecord['type'], string> = {
  repair: '维修领用',
  production: '生产领用',
  transfer: '调拨出库',
  scrap: '报废出库',
  other: '其他出库',
}
