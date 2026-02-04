/**
 * @file basic-data-types.ts
 * @desc 基础数据模块类型定义
 * @input 依赖: 无
 * @output 导出: 设备分类、主数据、数据标准相关类型
 */

/**
 * 设备分类类型
 */
export type EquipmentCategoryType = 'process' | 'function' | 'specification'

/**
 * 分类节点
 */
export interface CategoryNode {
  id: string
  key: string
  title: string
  type: EquipmentCategoryType
  code: string
  level: number
  parentId: string | null
  children?: CategoryNode[]
  description?: string
  equipmentCount: number
  active: boolean
  createdAt: string
  updatedAt: string
}

/**
 * 设备分类映射
 */
export const categoryTypeMap: Record<EquipmentCategoryType, { label: string; color: string; icon: string }> = {
  process: { label: '按工艺', color: 'blue', icon: '🏭' },
  function: { label: '按功能', color: 'green', icon: '⚙️' },
  specification: { label: '按规格', color: 'orange', icon: '📏' },
}

/**
 * 主数据状态
 */
export type MasterDataStatus = 'active' | 'inactive' | 'pending_sync' | 'synced' | 'sync_failed'

/**
 * 数据源系统
 */
export type DataSourceSystem = 'SAP' | 'MES' | 'ERP' | 'PLM' | 'manual'

/**
 * 主数据记录
 */
export interface MasterDataRecord {
  id: string
  equipmentCode: string
  equipmentName: string
  category: string
  specification: string
  manufacturer: string
  technicalParams: Record<string, string>
  sourceSystem: DataSourceSystem
  sourceId: string
  syncStatus: MasterDataStatus
  lastSyncTime: string | null
  dataQuality: number
  validationErrors: string[]
  customFields: Record<string, any>
  createdAt: string
  updatedAt: string
}

/**
 * 主数据状态映射
 */
export const masterDataStatusMap: Record<MasterDataStatus, { label: string; color: string; icon: string }> = {
  active: { label: '启用', color: 'green', icon: '✓' },
  inactive: { label: '停用', color: 'gray', icon: '○' },
  pending_sync: { label: '待同步', color: 'orange', icon: '⟳' },
  synced: { label: '已同步', color: 'blue', icon: '↻' },
  sync_failed: { label: '同步失败', color: 'red', icon: '✗' },
}

/**
 * 数据源系统映射
 */
export const dataSourceSystemMap: Record<DataSourceSystem, { label: string; color: string }> = {
  SAP: { label: 'SAP系统', color: 'blue' },
  MES: { label: 'MES系统', color: 'green' },
  ERP: { label: 'ERP系统', color: 'orange' },
  PLM: { label: 'PLM系统', color: 'purple' },
  manual: { label: '手工录入', color: 'gray' },
}

/**
 * 数据标准类型
 */
export type DataStandardType = 'code' | 'attribute' | 'validation' | 'format'

/**
 * 标准状态
 */
export type StandardStatus = 'draft' | 'published' | 'deprecated'

/**
 * 数据标准
 */
export interface DataStandard {
  id: string
  standardCode: string
  standardName: string
  type: DataStandardType
  category: string
  version: string
  status: StandardStatus
  description: string
  rules: {
    fieldName: string
    dataType: string
    required: boolean
    pattern?: string
    minLength?: number
    maxLength?: number
    minValue?: number
    maxValue?: number
    enumValues?: string[]
    defaultValue?: any
  }[]
  applicableTo: string[]
  createdBy: string
  approvedBy?: string
  effectiveDate: string
  expiryDate?: string
  createdAt: string
  updatedAt: string
}

/**
 * 数据标准类型映射
 */
export const dataStandardTypeMap: Record<DataStandardType, { label: string; color: string }> = {
  code: { label: '编码规则', color: 'blue' },
  attribute: { label: '属性标准', color: 'green' },
  validation: { label: '验证规则', color: 'orange' },
  format: { label: '格式标准', color: 'purple' },
}

/**
 * 标准状态映射
 */
export const standardStatusMap: Record<StandardStatus, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'gray' },
  published: { label: '已发布', color: 'green' },
  deprecated: { label: '已废弃', color: 'red' },
}

/**
 * 同步日志
 */
export interface SyncLog {
  id: string
  sourceSystem: DataSourceSystem
  syncType: 'full' | 'incremental'
  startTime: string
  endTime: string | null
  status: 'running' | 'success' | 'failed' | 'partial'
  totalRecords: number
  successRecords: number
  failedRecords: number
  errors: string[]
  triggeredBy: string
  createdAt: string
}

/**
 * 数据质量报告
 */
export interface DataQualityReport {
  id: string
  reportDate: string
  totalRecords: number
  validRecords: number
  invalidRecords: number
  completenessRate: number
  accuracyRate: number
  consistencyRate: number
  issues: {
    type: 'missing' | 'invalid' | 'duplicate' | 'inconsistent'
    field: string
    count: number
    examples: string[]
  }[]
  createdAt: string
}
