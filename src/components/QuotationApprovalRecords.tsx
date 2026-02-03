/**
 * @file QuotationApprovalRecords.tsx
 * @desc 报价单审批记录组件 - 包装通用审批记录组件
 * @deprecated 建议直接使用通用的 ApprovalRecords 组件
 */

'use client'

import { ApprovalRecords } from '@/components/approval/ApprovalRecords'

interface QuotationApprovalRecordsProps {
  quotation: any
}

export function QuotationApprovalRecords({ quotation }: QuotationApprovalRecordsProps) {
  return (
    <ApprovalRecords
      approvalInstance={quotation?.approvalInstance}
      approvalFlow={quotation?.approvalFlow}
      createdAt={quotation?.createdAt}
    />
  )
}
