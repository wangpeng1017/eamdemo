/**
 * @file QuotationApprovalRecords.tsx
 * @desc 报价单审批记录组件 - 包装通用审批记录组件
 * 支持无审批实例时自动获取审批流配置并显示流程预览
 */

'use client'

import { useEffect, useState } from 'react'
import { ApprovalRecords } from '@/components/approval/ApprovalRecords'

interface QuotationApprovalRecordsProps {
  quotation: any
}

export function QuotationApprovalRecords({ quotation }: QuotationApprovalRecordsProps) {
  const [approvalFlow, setApprovalFlow] = useState<any>(null)

  useEffect(() => {
    // 如果没有审批流配置，尝试获取默认审批流
    if (!quotation?.approvalFlow) {
      fetchApprovalFlow()
    }
  }, [quotation])

  const fetchApprovalFlow = async () => {
    try {
      const res = await fetch('/api/approval-flow?businessType=quotation')
      const json = await res.json()
      if (json.success && json.data?.list?.length > 0) {
        // 取第一个匹配的审批流配置
        setApprovalFlow(json.data.list[0])
      }
    } catch (e) {
      console.error('获取审批流配置失败:', e)
    }
  }

  const flow = quotation?.approvalFlow || approvalFlow

  // 有审批实例：直接渲染
  if (quotation?.approvalInstance) {
    return (
      <ApprovalRecords
        approvalInstance={quotation.approvalInstance}
        approvalFlow={flow}
        createdAt={quotation.createdAt}
      />
    )
  }

  // 无审批实例但有审批流：显示流程预览（未提交状态）
  if (flow) {
    const creatorName = quotation?.followerUser?.name || quotation?.createdBy?.name || '创建人'
    const previewInstance = {
      id: 'preview',
      currentStep: 0,
      status: 'draft',
      submittedAt: quotation?.createdAt,
      submitterName: creatorName,
      records: [],
    }
    return (
      <ApprovalRecords
        approvalInstance={previewInstance}
        approvalFlow={flow}
        createdAt={quotation?.createdAt}
      />
    )
  }

  // 没有审批流配置也没有审批实例
  return <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>暂无审批流配置</div>
}
