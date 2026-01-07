/**
 * @file ApprovalHistory.tsx
 * @desc 审批历史组件 - 展示审批记录时间线
 */

'use client'

import { Timeline, Tag, Space } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'

interface ApprovalRecord {
  id: string
  step: number
  targetName: string
  approverName?: string
  action: string
  comment?: string
  actedAt?: string
  createdAt: string
}

interface ApprovalHistoryProps {
  instanceId: string
}

export function ApprovalHistory({ instanceId }: ApprovalHistoryProps) {
  const [records, setRecords] = useState<ApprovalRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const res = await fetch(`/api/approval/${instanceId}`)
        const data = await res.json()

        if (data.success) {
          setRecords(data.data.records || [])
        }
      } catch (err) {
        console.error('获取审批历史失败:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchRecords()
  }, [instanceId])

  if (loading) {
    return <div>加载中...</div>
  }

  if (records.length === 0) {
    return <div>暂无审批记录</div>
  }

  return (
    <Timeline>
      {records.map((record) => (
        <Timeline.Item
          key={record.id}
          dot={
            record.action === 'approve' ? (
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
            ) : record.action === 'reject' ? (
              <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
            ) : (
              <ClockCircleOutlined style={{ color: '#8c8c8c' }} />
            )
          }
        >
          <div>
            <Space>
              <strong>第 {record.step} 级: {record.targetName}</strong>
              <Tag
                color={
                  record.action === 'approve'
                    ? 'green'
                    : record.action === 'reject'
                    ? 'red'
                    : 'default'
                }
              >
                {record.action === 'approve' ? '通过' : record.action === 'reject' ? '驳回' : '待处理'}
              </Tag>
            </Space>
            <div style={{ marginTop: 4, color: '#666' }}>
              审批人: {record.approverName || '-'}
            </div>
            {record.comment && (
              <div style={{ marginTop: 4 }}>意见: {record.comment}</div>
            )}
            <div style={{ marginTop: 4, fontSize: 12, color: '#999' }}>
              {record.actedAt
                ? new Date(record.actedAt).toLocaleString('zh-CN')
                : new Date(record.createdAt).toLocaleString('zh-CN')}
            </div>
          </div>
        </Timeline.Item>
      ))}
    </Timeline>
  )
}
