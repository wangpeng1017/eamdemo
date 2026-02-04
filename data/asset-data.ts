/**
 * @file asset-data.ts
 * @desc 资产管理模拟数据 - 15条资产记录、20条折旧记录
 */
import { Asset, AssetChange, DepreciationRecord, AssetStatus, AssetCategory, AssetSource, DepreciationMethod } from '@/lib/asset-types'

const now = new Date()

function randomDate(start: Date, end: Date): string {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  return date.toISOString()
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

const categories: AssetCategory[] = ['equipment', 'building', 'vehicle', 'tool', 'it', 'other']
const sources: AssetSource[] = ['purchase', 'self_built', 'donation', 'transfer', 'lease']
const depreciationMethods: DepreciationMethod[] = ['straight_line', 'double_declining', 'sum_of_years', 'none']
const statuses: AssetStatus[] = ['normal', 'normal', 'normal', 'appreciating', 'depreciating', 'scrapped']
const departments = ['生产部', '设备部', '质量部', '研发部', '行政部', '信息部']
const locations = ['一车间', '二车间', '办公楼', '实验室', '仓库', '停车场']
const suppliers = ['供应商A', '供应商B', '供应商C', '供应商D', '供应商E']
const manufacturers = ['制造商A', '制造商B', '制造商C', '制造商D', '制造商E']
const responsiblePeople = ['张三', '李四', '王五', '赵六', '孙七', '周八']

// 生成15条资产数据
export const mockAssets: Asset[] = Array.from({ length: 15 }, (_, i) => {
  const category = categories[i % categories.length]
  const source = sources[i % sources.length]
  const depreciationMethod = depreciationMethods[i % depreciationMethods.length]
  const status = statuses[i % statuses.length]
  const purchaseDate = randomDate(new Date(2018, 0, 1), new Date(2023, 11, 31))
  const usefulLife = Math.floor(60 + Math.random() * 120) // 5-15年，以月为单位
  const usedMonths = Math.floor(Math.random() * usefulLife)
  const originalValue = Math.floor(10000 + Math.random() * 990000)
  const netResidualValue = Math.floor(originalValue * (0.03 + Math.random() * 0.05)) // 3%-8%残值率

  // 计算累计折旧和当前价值
  let accumulatedDepreciation = 0
  let currentValue = originalValue

  if (depreciationMethod !== 'none' && status !== 'scrapped') {
    const depreciationRate = 1 / usefulLife
    accumulatedDepreciation = Math.floor((originalValue - netResidualValue) * depreciationRate * usedMonths)
    currentValue = originalValue - accumulatedDepreciation
  } else if (status === 'scrapped') {
    currentValue = 0
    accumulatedDepreciation = originalValue - netResidualValue
  }

  return {
    id: `AS${String(i + 1).padStart(4, '0')}`,
    assetNo: `AS-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`,
    name: `${category === 'equipment' ? '生产设备' : category === 'building' ? '建筑物' : category === 'vehicle' ? '车辆' : category === 'tool' ? '工具' : category === 'it' ? 'IT设备' : '其他资产'}-${i + 1}号`,
    category,
    source,
    status,
    originalValue,
    currentValue,
    netResidualValue,
    accumulatedDepreciation,
    depreciationMethod,
    usefulLife,
    usedMonths,
    depreciationRate: depreciationMethod === 'none' ? 0 : parseFloat((1 / usefulLife).toFixed(4)),
    purchaseDate,
    startDepreciationDate: purchaseDate,
    lastDepreciationDate: addMonths(new Date(purchaseDate), usedMonths).toISOString(),
    location: locations[i % locations.length],
    department: departments[i % departments.length],
    responsiblePerson: responsiblePeople[i % responsiblePeople.length],
    custodian: responsiblePeople[(i + 1) % responsiblePeople.length],
    supplier: suppliers[i % suppliers.length],
    manufacturer: manufacturers[i % manufacturers.length],
    model: `MOD-${(i % 20) + 1}00`,
    serialNumber: `SN${new Date().getFullYear()}${String(i + 1).padStart(6, '0')}`,
    description: `资产描述信息-${i + 1}`,
    createdAt: purchaseDate,
    updatedAt: randomDate(new Date(2024, 0, 1), now),
  }
})

// 生成20条折旧记录
export const mockDepreciationRecords: DepreciationRecord[] = Array.from({ length: 20 }, (_, i) => {
  const asset = mockAssets[i % mockAssets.length]
  const period = new Date(2024, Math.floor(i / 2), 1).toISOString().slice(0, 7) // 2024-01 ~ 2024-12
  const depreciationAmount = Math.floor((asset.originalValue - asset.netResidualValue) / asset.usefulLife)
  const beforeDepreciation = asset.accumulatedDepreciation - depreciationAmount * (i + 1)
  const afterDepreciation = beforeDepreciation + depreciationAmount

  return {
    id: `DR${String(i + 1).padStart(4, '0')}`,
    assetId: asset.id,
    assetName: asset.name,
    assetNo: asset.assetNo,
    period,
    depreciationAmount,
    beforeDepreciation: Math.max(0, beforeDepreciation),
    afterDepreciation: Math.min(asset.accumulatedDepreciation, afterDepreciation),
    beforeValue: Math.max(asset.netResidualValue, asset.originalValue - beforeDepreciation),
    afterValue: Math.max(asset.netResidualValue, asset.originalValue - afterDepreciation),
    operator: responsiblePeople[i % responsiblePeople.length],
    calculateTime: randomDate(new Date(2024, Math.floor(i / 2), 1), new Date(2024, Math.floor(i / 2) + 1, 1)),
    remark: i % 5 === 0 ? '当月新增资产，按实际使用天数计提折旧' : '',
    createdAt: randomDate(new Date(2024, 0, 1), now),
  }
})

// 生成15条资产变动记录
export const mockAssetChanges: AssetChange[] = Array.from({ length: 15 }, (_, i) => {
  const asset = mockAssets[i % mockAssets.length]
  const changeTypes: AssetChange['changeType'][] = ['purchase', 'transfer', 'scrap', 'depreciation', 'valuation']
  const changeType = changeTypes[i % changeTypes.length]
  const beforeValue = asset.originalValue * (1 - Math.random() * 0.3)
  const changeAmount = changeType === 'depreciation' ? -Math.floor(asset.originalValue * 0.02) :
                       changeType === 'purchase' ? asset.originalValue :
                       Math.floor(asset.originalValue * (Math.random() - 0.5) * 0.1)
  const afterValue = beforeValue + changeAmount

  return {
    id: `AC${String(i + 1).padStart(4, '0')}`,
    changeNo: `AC-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`,
    assetId: asset.id,
    assetName: asset.name,
    changeType,
    changeAmount,
    beforeValue: Math.floor(beforeValue),
    afterValue: Math.floor(afterValue),
    reason: `${changeType === 'purchase' ? '新购入' : changeType === 'transfer' ? '部门调拨' : changeType === 'scrap' ? '报废处置' : changeType === 'depreciation' ? '计提折旧' : '资产重估'}-${i + 1}`,
    approver: i % 3 === 0 ? responsiblePeople[0] : undefined,
    approvalStatus: i % 3 === 0 ? 'approved' : i % 3 === 1 ? 'pending' : 'approved',
    approvalTime: i % 3 === 0 ? randomDate(new Date(2024, 0, 1), now) : undefined,
    operator: responsiblePeople[i % responsiblePeople.length],
    operatorTime: randomDate(new Date(2024, 0, 1), now),
    remark: `变动备注-${i + 1}`,
    createdAt: randomDate(new Date(2024, 0, 1), now),
  }
})
