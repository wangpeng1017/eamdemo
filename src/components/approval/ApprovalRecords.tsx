/**
 * @file ApprovalRecords.tsx
 * @desc 通用审批记录组件 - 显示审批流程时间线和记录
 * @usage 适用于所有业务模块（报价单、合同、委托单、报告等）
 */

'use client'

import { ApprovalTimeline } from '@/components/ApprovalTimeline'
import { formatApprovalNodes } from '@/lib/approval/utils'

interface ApprovalRecord {
  id: string
  step: number
  action: 'approve' | 'reject'
  approverId: string
  approverName: string
  comment?: string
  createdAt: string
}

interface ApprovalInstance {
  id: string
  currentStep: number
  status: string
  submittedAt: string
  submitterName?: string
  flowCode?: string
  records?: ApprovalRecord[]
}

interface ApprovalFlow {
  id: string
  code: string
  name: string
  nodes: string
}

interface ApprovalRecordsProps {
  approvalInstance: ApprovalInstance
  approvalFlow?: ApprovalFlow | null
  createdAt?: string
}

export function ApprovalRecords({
  approvalInstance,
  approvalFlow,
  createdAt
}: ApprovalRecordsProps) {
  // 如果没有审批实例，显示提示信息
  if (!approvalInstance) {
    return <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>暂无审批记录</div>
  }

  // 🎯 关键修复：先转换审批记录格式（必须在前面定义）
  const records = (approvalInstance.records || []).map((record) => ({
    id: record.id,
    step: record.step,
    action: record.action as 'approve' | 'reject',
    approverId: record.approverId || '',
    approverName: record.approverName || '未知',
    comment: record.comment,
    createdAt: record.createdAt,
  }))

  // 解析审批流节点（使用统一工具函数）
  let nodes: Array<{ step: number; name: string; role: string }> = []
  try {
    if (approvalFlow?.nodes) {
      const parsedNodes = JSON.parse(approvalFlow.nodes)
      nodes = formatApprovalNodes(parsedNodes)
    }
  } catch (e) {
    console.error('[ApprovalRecords] 解析审批节点失败:', e)
    nodes = [{ step: 1, name: '审批', role: '审批人' }]
  }

  // 🎯 关键修复：将审批记录中的审批人映射到节点上
  // 创建步骤到审批人的映射
  const stepToApprover: Record<number, string> = {}
  records.forEach((record) => {
    if (record.approverName && record.approverName !== '系统管理员') {
      stepToApprover[record.step] = record.approverName
    }
  })

  // 更新节点角色：优先使用审批记录中的实际审批人
  nodes = nodes.map((node) => ({
    ...node,
    role: stepToApprover[node.step] || node.role,
  }))

  // 获取当前步骤
  const currentStep = approvalInstance.currentStep || 1

  // 获取状态
  const status = approvalInstance.status === 'approved' ? 'approved'
    : approvalInstance.status === 'rejected' ? 'rejected'
    : 'pending'

  return (
    <ApprovalTimeline
      nodes={nodes}
      currentStep={currentStep}
      status={status}
      submitterName={approvalInstance.submitterName || '申请人'}
      submittedAt={approvalInstance.submittedAt || createdAt}
      records={records}
    />
  )
}
