/**
 * @file Dashboard待评估卡片 - v2版本
 * @desc 在Dashboard上显示当前用户的待评估任务（基于SampleTestItem表）
 * @input /api/consultation/assessment/my-pending (v2)
 * @output 按咨询单分组的待评估任务列表
 */

'use client'

import { useState, useEffect } from 'react'
import { showError } from '@/lib/confirm'
import { Card, List, Tag, Button, Space, Empty, Badge, message } from 'antd'
import { FileTextOutlined, ClockCircleOutlined, RightOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import SampleItemAssessmentModal from './SampleItemAssessmentModal'

interface SampleTestItemPending {
  id: string
  sampleName: string | null
  testItemName: string | null
  testStandard?: string
  assessmentStatus: string | null
  quantity: number | null
  material: string | null
  currentAssessor: string | null
}

interface PendingAssessmentGroup {
  consultationId: string
  consultationNo: string
  clientName: string
  testItems: any[]
  createdAt: string
  sampleTestItems: SampleTestItemPending[]
}

interface PendingAssessmentCardProps {
  onViewAll?: () => void
}

export default function PendingAssessmentCard({ onViewAll }: PendingAssessmentCardProps) {
  const [loading, setLoading] = useState(false)
  const [assessmentGroups, setAssessmentGroups] = useState<PendingAssessmentGroup[]>([])
  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false)
  const [currentSampleItem, setCurrentSampleItem] = useState<SampleTestItemPending | null>(null)

  useEffect(() => {
    fetchPendingAssessments()
  }, [])

  const fetchPendingAssessments = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/consultation/assessment/my-pending')
      const json = await res.json()

      if (json.success) {
        setAssessmentGroups(json.data || [])
      } else {
        showError(json.error?.message || '获取待评估列表失败')
      }
    } catch (error) {
      console.error('获取待评估列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAssess = (group: PendingAssessmentGroup) => {
    // 取第一条待评估的样品检测项进行评估
    if (group.sampleTestItems.length > 0) {
      setCurrentSampleItem(group.sampleTestItems[0])
      setAssessmentModalOpen(true)
    }
  }

  // 计算总的待评估样品检测项数量
  const totalItemCount = assessmentGroups.reduce(
    (sum, group) => sum + group.sampleTestItems.length,
    0
  )

  return (
    <>
      <Card
        title={
          <Space>
            <FileTextOutlined />
            <span>待我评估</span>
            {totalItemCount > 0 && <Badge count={totalItemCount} />}
          </Space>
        }
        extra={
          assessmentGroups.length > 0 && onViewAll && (
            <Button type="link" onClick={onViewAll} icon={<RightOutlined />}>
              查看全部
            </Button>
          )
        }
        loading={loading}
      >
        {assessmentGroups.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无待评估项目"
            style={{ padding: '20px 0' }}
          />
        ) : (
          <List
            dataSource={assessmentGroups.slice(0, 5)}
            renderItem={(group) => (
              <List.Item
                actions={[
                  <Button
                    key="assess"
                    type="primary"
                    size="small"
                    onClick={() => handleAssess(group)}
                  >
                    评估
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <span>{group.consultationNo}</span>
                      <Tag color="blue">{group.sampleTestItems.length} 项待评估</Tag>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <div>
                        <span style={{ color: '#666' }}>客户：</span>
                        {group.clientName}
                      </div>
                      <div>
                        <span style={{ color: '#666' }}>检测项：</span>
                        <Space size={4} wrap>
                          {group.sampleTestItems.slice(0, 3).map((item) => (
                            <Tag key={item.id} style={{ margin: 0 }}>
                              {item.sampleName} - {item.testItemName}
                            </Tag>
                          ))}
                          {group.sampleTestItems.length > 3 && (
                            <Tag style={{ margin: 0 }}>+{group.sampleTestItems.length - 3}</Tag>
                          )}
                        </Space>
                      </div>
                      {group.createdAt && (
                        <div style={{ fontSize: 12, color: '#999' }}>
                          <ClockCircleOutlined style={{ marginRight: 4 }} />
                          创建于 {dayjs(group.createdAt).format('MM-DD HH:mm')}
                        </div>
                      )}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
        {assessmentGroups.length > 5 && (
          <div style={{ textAlign: 'center', marginTop: 16, color: '#999' }}>
            还有 {assessmentGroups.length - 5} 个咨询单待评估...
          </div>
        )}
      </Card>

      <SampleItemAssessmentModal
        open={assessmentModalOpen}
        sampleItem={currentSampleItem}
        onCancel={() => {
          setAssessmentModalOpen(false)
          setCurrentSampleItem(null)
        }}
        onSuccess={() => {
          setAssessmentModalOpen(false)
          setCurrentSampleItem(null)
          fetchPendingAssessments()
        }}
      />
    </>
  )
}
