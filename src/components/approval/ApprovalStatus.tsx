/**
 * @file ApprovalStatus.tsx
 * @desc 审批状态组件 - 展示审批进度和状态
 */

'use client'

import { Steps, Tag, Space } from 'antd'
import { CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'

interface ApprovalNode {
  step: number
  name: string
  targetName: string
}

interface ApprovalInstance {
  id: string
  status: string
  currentStep: number
  flowConfig?: ApprovalNode[]
}

interface ApprovalStatusProps {
  bizType: string
  bizId: string
}

export function ApprovalStatus({ bizType, bizId }: ApprovalStatusProps) {
  const [instance, setInstance] = useState<ApprovalInstance | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchApproval = async () => {
      try {
        // 获取审批实例
        const res = await fetch(`/api/approval/by-biz?bizType=${bizType}&bizId=${bizId}`)
        const data = await res.json()

        if (data.success && data.data) {
          setInstance(data.data)
        }
      } catch (err) {
        // ignore - 可能没有审批实例
      } finally {
        setLoading(false)
      }
    }

    fetchApproval()
  }, [bizType, bizId])

  if (loading) {
    return <Tag color="default">加载中...</Tag>
  }

  if (!instance) {
    return <Tag color="default">未提交</Tag>
  }

  const getStatus = (step: number) => {
    if (instance.currentStep > step) return 'finish'
    if (instance.currentStep === step) return 'process'
    return 'wait'
  }

  const statusColor =
    instance.status === 'approved'
      ? 'green'
      : instance.status === 'rejected'
      ? 'red'
      : instance.status === 'cancelled'
      ? 'orange'
      : 'blue'

  const statusText =
    instance.status === 'approved'
      ? '已通过'
      : instance.status === 'rejected'
      ? '已驳回'
      : instance.status === 'cancelled'
      ? '已撤回'
      : '审批中'

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <div>
        <Tag color={statusColor}>{statusText}</Tag>
        {instance.status === 'pending' && (
          <span style={{ marginLeft: 8, color: '#666' }}>
            当前: 第 {instance.currentStep} 级审批
          </span>
        )}
      </div>

      {instance.flowConfig && instance.flowConfig.length > 0 && (
        <Steps
          current={instance.currentStep - 1}
          size="small"
          items={instance.flowConfig.map((node) => ({
            title: node.name,
            description: node.targetName,
            status: getStatus(node.step),
            icon:
              getStatus(node.step) === 'finish' ? (
                <CheckCircleOutlined />
              ) : (
                <ClockCircleOutlined />
              ),
          }))}
        />
      )}
    </Space>
  )
}
