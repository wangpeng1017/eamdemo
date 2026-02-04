/**
 * @file asset-types.ts
 * @desc 资产管理类型定义
 */

// 资产状态
export type AssetStatus = 'normal' | 'appreciating' | 'depreciating' | 'scrapped'

// 资产分类
export type AssetCategory = 'equipment' | 'building' | 'vehicle' | 'tool' | 'it' | 'other'

// 资产来源
export type AssetSource = 'purchase' | 'self_built' | 'donation' | 'transfer' | 'lease'

// 折旧方法
export type DepreciationMethod = 'straight_line' | 'double_declining' | 'sum_of_years' | 'none'

// 资产状态映射
export const assetStatusMap = {
  normal: { label: '正常', color: 'green' },
  appreciating: { label: '增值', color: 'blue' },
  depreciating: { label: '贬值', color: 'orange' },
  scrapped: { label: '报废', color: 'red' },
} as const

// 资产分类映射
export const assetCategoryMap = {
  equipment: { label: '设备类', icon: '🔧' },
  building: { label: '建筑物', icon: '🏢' },
  vehicle: { label: '车辆', icon: '🚗' },
  tool: { label: '工具类', icon: '🔨' },
  it: { label: 'IT设备', icon: '💻' },
  other: { label: '其他', icon: '📦' },
} as const

// 折旧方法映射
export const depreciationMethodMap = {
  straight_line: '平均年限法',
  double_declining: '双倍余额递减法',
  sum_of_years: '年数总和法',
  none: '不计提折旧',
} as const

// 资产接口
export interface Asset {
  id: string
  assetNo: string // 资产编号
  name: string // 资产名称
  category: AssetCategory // 资产分类
  source: AssetSource // 资产来源
  status: AssetStatus // 资产状态

  // 基本信息
  originalValue: number // 原值
  currentValue: number // 当前价值
  netResidualValue: number // 净残值
  accumulatedDepreciation: number // 累计折旧
  depreciationMethod: DepreciationMethod // 折旧方法
  usefulLife: number // 使用年限（月）
  usedMonths: number // 已使用月数
  depreciationRate: number // 折旧率

  // 时间信息
  purchaseDate: string // 购置日期
  startDepreciationDate: string // 开始折旧日期
  lastDepreciationDate: string // 上次折旧日期

  // 位置信息
  location: string // 存放位置
  department: string // 使用部门
  responsiblePerson: string // 责任人
  custodian: string // 保管人

  // 其他信息
  supplier: string // 供应商
  manufacturer: string // 制造商
  model: string // 型号规格
  serialNumber: string // 序列号

  description: string // 备注
  attachments?: string[] // 附件

  createdAt: string
  updatedAt: string
}

// 资产变动记录
export interface AssetChange {
  id: string
  changeNo: string // 变动单号
  assetId: string
  assetName: string
  changeType: 'purchase' | 'transfer' | 'scrap' | 'depreciation' | 'valuation' | 'other' // 变动类型
  changeAmount: number // 变动金额
  beforeValue: number // 变动前价值
  afterValue: number // 变动后价值
  reason: string // 变动原因
  approver?: string // 审批人
  approvalStatus: 'pending' | 'approved' | 'rejected'
  approvalTime?: string
  operator: string // 操作人
  operatorTime: string // 操作时间
  remark: string
  createdAt: string
}

// 折旧记录
export interface DepreciationRecord {
  id: string
  assetId: string
  assetName: string
  assetNo: string
  period: string // 折旧期间，如 2024-01
  depreciationAmount: number // 本期折旧额
  beforeDepreciation: number // 折旧前累计折旧
  afterDepreciation: number // 折旧后累计折旧
  beforeValue: number // 折旧前价值
  afterValue: number // 折旧后价值
  operator: string // 计提人
  calculateTime: string // 计提时间
  remark: string
  createdAt: string
}
