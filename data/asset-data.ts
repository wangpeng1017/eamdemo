
/**
 * @file asset-data.ts
 * @desc 资产管理模拟数据 - 食用油加工设备资产
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

const categories: AssetCategory[] = ['equipment', 'equipment', 'equipment', 'tool', 'it', 'other']
const sources: AssetSource[] = ['purchase', 'self_built', 'donation', 'transfer', 'lease']
const depreciationMethods: DepreciationMethod[] = ['straight_line', 'double_declining', 'sum_of_years', 'none']
const statuses: AssetStatus[] = ['normal', 'normal', 'normal', 'appreciating', 'depreciating', 'scrapped']
const departments = ['生产部', '设备部', '质量部', '研发部', '行政部', '信息部']
const locations = ['预处理车间', '压榨车间', '浸出车间', '精炼车间', '灌装车间', '成品库']
const suppliers = ['供应商A', '供应商B', '供应商C', '供应商D', '供应商E']
const manufacturers = ['无锡宝鼎机械', '郑州远洋机械设备', '广州星戈机械制造', '山东国标机械', '江苏精诚粮油机械']
const responsiblePeople = ['张工', '李工', '王工', '赵工', '孙工', '周工']

// 食用油加工设备名称
const equipmentNames = [
  '螺旋榨油机-200型', '液压榨油机-150型', '平转浸出器-300型', '蒸汽脱臭塔-500型',
  '脱色塔-400型', '精炼罐-800型', '板框过滤机-100型', '离心机-200型',
  '结晶罐-300型', '冬化分离机-250型', '真空泵-50型', '导热油炉-200万kcal',
  '换热器-200型', '储油罐-500吨', '灌装机-5000瓶/时'
]

// 生成15条资产数据
export const mockAssets: Asset[] = Array.from({ length: 15 }, (_, i) => {
  const category = categories[i % categories.length]
  const source = sources[i % sources.length]
  const depreciationMethod = depreciationMethods[i % depreciationMethods.length]
  const status = statuses[i % statuses.length]
  const purchaseDate = randomDate(new Date(2018, 0, 1), new Date(2023, 11, 31))
  const usefulLife = Math.floor(60 + Math.random() * 120) // 5-15年，以月为单位
  const usedMonths = Math.floor(Math.random() * usefulLife)
  const originalValue = Math.floor(100000 + Math.random() * 1500000)
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
    name: category === 'equipment' ? equipmentNames[i % equipmentNames.length] :
           category === 'tool' ? `工具-${i + 1}号` :
           category === 'it' ? `IT设备-${i + 1}号` : `其他资产-${i + 1}号`,
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
    model: `YZ-${(i % 20) + 1}00`,
    serialNumber: `SN${new Date().getFullYear()}${String(i + 1).padStart(6, '0')}`,
    description: `食用油加工设备资产-${i + 1}`,
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
    reason: `${changeType === 'purchase' ? '新购入食用油加工设备' : changeType === 'transfer' ? '车间调拨' : changeType === 'scrap' ? '报废处置' : changeType === 'depreciation' ? '计提折旧' : '资产重估'}-${i + 1}`,
    approver: i % 3 === 0 ? responsiblePeople[0] : undefined,
    approvalStatus: i % 3 === 0 ? 'approved' : i % 3 === 1 ? 'pending' : 'approved',
    approvalTime: i % 3 === 0 ? randomDate(new Date(2024, 0, 1), now) : undefined,
    operator: responsiblePeople[i % responsiblePeople.length],
    operatorTime: randomDate(new Date(2024, 0, 1), now),
    remark: `食用油加工设备资产变动-${i + 1}`,
    createdAt: randomDate(new Date(2024, 0, 1), now),
  }
})
