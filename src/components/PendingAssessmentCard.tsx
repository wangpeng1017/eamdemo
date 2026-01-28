/**
 * @file Dashboard待评估卡片 - 显示当前用户的待评估任务
 * @desc 在Dashboard上显示待评估的咨询单数量和列表
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, List, Tag, Button, Space, Empty, Badge, message } from 'antd'
import { FileTextOutlined, ClockCircleOutlined, RightOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import AssessmentFeedbackModal from './AssessmentFeedbackModal'

interface PendingAssessment {
  id: string
  consultationNo: string
  clientName: string
  testItems: any[]
  requestedBy: string
  requestedAt: string
  round: number
}

interface PendingAssessmentCardProps {
  onViewAll?: () => void
}

export default function PendingAssessmentCard({ onViewAll }: PendingAssessmentCardProps) {
  const [loading, setLoading] = useState(false)
  const [assessments, setAssessments] = useState<PendingAssessment[]>([])
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const [currentAssessment, setCurrentAssessment] = useState<any>(null)

  useEffect(() => {
    fetchPendingAssessments()
  }, [])

  const fetchPendingAssessments = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/consultation/assessment/my-pending')
      const json = await res.json()

      if (json.success) {
        setAssessments(json.data || [])
      } else {
        message.error(json.error?.message || '获取待评估列表失败')
      }
    } catch (error) {
      console.error('获取待评估列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAssess = (assessment: PendingAssessment) => {
    setCurrentAssessment(assessment)
    setFeedbackModalOpen(true)
  }

  const totalCount = assessments.length

  return (
    <>
      <Card
        title={
          <Space>
            <FileTextOutlined />
            <span>待我评估</span>
            {totalCount > 0 && <Badge count={totalCount} />}
          </Space>
        }
        extra={
          totalCount > 0 && onViewAll && (
            <Button type="link" onClick={onViewAll} icon={<RightOutlined />}>
              查看全部
            </Button>
          )
        }
        loading={loading}
      >
        {totalCount === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无待评估项目"
            style={{ padding: '20px 0' }}
          />
        ) : (
          <List
            dataSource={assessments.slice(0, 5)}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button
                    key="assess"
                    type="primary"
                    size="small"
                    onClick={() => handleAssess(item)}
                  >
                    评估
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <span>{item.consultationNo}</span>
                      <Tag color="blue">第 {item.round} 轮</Tag>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <div>
                        <span style={{ color: '#666' }}>客户：</span>
                        {item.clientName}
                      </div>
                      <div>
                        <span style={{ color: '#666' }}>检测项目：</span>
                        {item.testItems && item.testItems.length > 0 ? (
                          <Space size={4} wrap>
                            {item.testItems.slice(0, 3).map((testItem: any, idx: number) => (
                              <Tag key={idx} style={{ margin: 0 }}>
                                {testItem.name || testItem}
                              </Tag>
                            ))}
                            {item.testItems.length > 3 && (
                              <Tag style={{ margin: 0 }}>+{item.testItems.length - 3}</Tag>
                            )}
                          </Space>
                        ) : (
                          '无'
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#999' }}>
                        <ClockCircleOutlined style={{ marginRight: 4 }} />
                        {item.requestedBy} 于 {dayjs(item.requestedAt).format('MM-DD HH:mm')} 发起
                      </div>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
        {totalCount > 5 && (
          <div style={{ textAlign: 'center', marginTop: 16, color: '#999' }}>
            还有 {totalCount - 5} 个待评估项目...
          </div>
        )}
      </Card>

      <AssessmentFeedbackModal
        open={feedbackModalOpen}
        assessment={currentAssessment}
        mode="submit"
        onCancel={() => {
          setFeedbackModalOpen(false)
          setCurrentAssessment(null)
        }}
        onSuccess={() => {
          setFeedbackModalOpen(false)
          setCurrentAssessment(null)
          fetchPendingAssessments()
        }}
      />
    </>
  )
}
