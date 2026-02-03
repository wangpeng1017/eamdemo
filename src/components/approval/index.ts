/**
 * @file index.ts
 * @desc 审批组件统一导出
 */

export { ApprovalActions } from './ApprovalActions'
export { ApprovalHistory } from './ApprovalHistory'
export { ApprovalStatus } from './ApprovalStatus'
export { ApprovalRecords } from './ApprovalRecords'

// 保留旧组件名称以向后兼容
export { ApprovalRecords as ContractApprovalRecords } from './ApprovalRecords'
export { ApprovalRecords as EntrustmentApprovalRecords } from './ApprovalRecords'
export { ApprovalRecords as ReportApprovalRecords } from './ApprovalRecords'
