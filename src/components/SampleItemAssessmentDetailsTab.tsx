/**
 * @file 样品检测项评估详情标签页（v2 - 样品检测项级评估）
 * @desc 显示评估进度总览和每条样品检测项的评估状态
 * @see PRD: docs/plans/2026-01-28-sample-item-assessment-design.md
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, Table, Button, Space, Tag, Statistic, Row, Col, Modal, Timeline, message, Tooltip } from 'antd'
import { EyeOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

interface Assessment {
  feasibility: string
  feasibilityNote: string | null
  assessedAt: string
  round: number
}

interface SampleItem {
  id: string
  sampleName: string | null
  testItem: string | null
  quantity: number | null
  material: string | null
  assessmentStatus: string | null
  currentAssessor: string | null
  latestAssessment?: {
    feasibility: string
    feasibilityNote: string | null
    assessedAt: string
    round: number
  }
  assessmentHistory: Assessment[]
}

interface AssessmentDetails {
  consultation: {
    id: string
    consultationNo: string
    status: string
    assessmentVersion: string | null
    assessmentTotalCount: number
    assessmentPassedCount: number
    assessmentFailedCount: number
    assessmentPendingCount: number
  }
  sampleItems: SampleItem[]
}

interface SampleItemAssessmentDetailsTabProps {
  consultationId: string
  currentUserId?: string
  currentUserName?: string
  onRefresh?: () => void
}

export default function SampleItemAssessmentDetailsTab({
  consultationId,
  currentUserId,
  currentUserName,
  onRefresh,
}: SampleItemAssessmentDetailsTabProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<AssessmentDetails | null>(null)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<SampleItem | null>(null)

  useEffect(() => {
    if (consultationId) {
      fetchDetails()
    }
  }, [consultationId])

  const fetchDetails = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/consultation/${consultationId}/assessment/details`)
      const json = await res.json()

      if (json.success && json.data) {
        setData(json.data)
      } else {
        message.error(json.error || '获取评估详情失败')
      }
    } catch (error) {
      console.error('获取评估详情失败:', error)
      message.error('获取评估详情失败')
    } finally {
      setLoading(false)
    }
  }

  // 查看评估历史
  const handleViewHistory = (item: SampleItem) => {
    setSelectedItem(item)
    setHistoryModalOpen(true)
  }

  // 获取可行性状态标签
  const getFeasibilityTag = (feasibility: string) => {
    const tagMap: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
      feasible: { color: 'success', text: '可行', icon: <CheckCircleOutlined /> },
      difficult: { color: 'warning', text: '有难度', icon: <ClockCircleOutlined /> },
      infeasible: { color: 'error', text: '不可行', icon: <CloseCircleOutlined /> },
    }

    const config = tagMap[feasibility] || { color: 'default', text: feasibility, icon: null }

    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    )
  }

  // 获取评估状态标签
  const getStatusTag = (status: string | null) => {
    const tagMap: Record<string, { color: string; text: string }> = {
      assessing: { color: 'processing', text: '评估中' },
      passed: { color: 'success', text: '已通过' },
      failed: { color: 'error', text: '未通过' },
    }

    const config = status ? tagMap[status] || { color: 'default', text: status } : { color: 'default', text: '未分配' }

    return <Tag color={config.color}>{config.text}</Tag>
  }

  const columns: ColumnsType<SampleItem> = [
    {
      title: '样品名称',
      dataIndex: 'sampleName',
      key: 'sampleName',
      width: 150,
    },
    {
      title: '检测项',
      dataIndex: 'testItem',
      key: 'testItem',
      width: 150,
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
    },
    {
      title: '材质',
      dataIndex: 'material',
      key: 'material',
      width: 120,
    },
    {
      title: '评估状态',
      dataIndex: 'assessmentStatus',
      key: 'assessmentStatus',
      width: 100,
      render: (status) => getStatusTag(status),
    },
    {
      title: '当前评估人',
      dataIndex: 'currentAssessor',
      key: 'currentAssessor',
      width: 120,
    },
    {
      title: '最新评估结果',
      key: 'latestAssessment',
      width: 150,
      render: (_, record) => {
        if (!record.latestAssessment) {
          return <span style={{ color: '#999' }}>尚未评估</span>
        }

        return (
          <Space direction="vertical" size={0}>
            {getFeasibilityTag(record.latestAssessment.feasibility)}
            {record.latestAssessment.feasibilityNote && (
              <Tooltip title={record.latestAssessment.feasibilityNote}>
                <span style={{ fontSize: '12px', color: '#666', cursor: 'pointer' }}>
                  {record.latestAssessment.feasibilityNote.substring(0, 20)}
                  {record.latestAssessment.feasibilityNote.length > 20 ? '...' : ''}
                </span>
              </Tooltip>
            )}
            <span style={{ fontSize: '12px', color: '#999' }}>
              第 {record.latestAssessment.round} 轮
            </span>
          </Space>
        )
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {record.assessmentHistory.length > 0 && (
            <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewHistory(record)}>
              查看历史
            </Button>
          )}
          {/* 如果当前用户是评估人且状态是 assessing，显示立即评估按钮 */}
          {record.assessmentStatus === 'assessing' && record.currentAssessor === currentUserName && (
            <Button type="primary" size="small">
              立即评估
            </Button>
          )}
        </Space>
      ),
    },
  ]

  if (!data) {
    return <Card loading={loading}>加载中...</Card>
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      {/* 评估进度总览 */}
      <Card title="评估进度总览">
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="总计"
              value={data.consultation.assessmentTotalCount}
              suffix="项"
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="已通过"
              value={data.consultation.assessmentPassedCount}
              suffix="项"
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="未通过"
              value={data.consultation.assessmentFailedCount}
              suffix="项"
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<CloseCircleOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="待评估"
              value={data.consultation.assessmentPendingCount}
              suffix="项"
              valueStyle={{ color: '#faad14' }}
              prefix={<ClockCircleOutlined />}
            />
          </Col>
        </Row>
      </Card>

      {/* 样品检测项评估列表 */}
      <Card
        title="样品检测项评估详情"
        extra={
          <Button type="primary" onClick={fetchDetails}>
            刷新
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={data.sampleItems}
          rowKey="id"
          loading={loading}
          pagination={false}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 评估历史弹窗 */}
      <Modal
        title={`评估历史 - ${selectedItem?.sampleName || ''} / ${selectedItem?.testItem || ''}`}
        open={historyModalOpen}
        onCancel={() => {
          setHistoryModalOpen(false)
          setSelectedItem(null)
        }}
        footer={null}
        width={700}
      >
        {selectedItem && selectedItem.assessmentHistory.length > 0 ? (
          <Timeline
            items={selectedItem.assessmentHistory.map((item, index) => ({
              color: item.feasibility === 'feasible' ? 'green' : item.feasibility === 'infeasible' ? 'red' : 'orange',
              children: (
                <div>
                  <div style={{ marginBottom: 8 }}>
                    <Space>
                      <strong>第 {item.round} 轮评估</strong>
                      {getFeasibilityTag(item.feasibility)}
                      <span style={{ color: '#999', fontSize: '12px' }}>
                        {new Date(item.assessedAt).toLocaleString('zh-CN')}
                      </span>
                    </Space>
                  </div>
                  {item.feasibilityNote && (
                    <div style={{ color: '#666', fontSize: '14px', paddingLeft: 8, borderLeft: '2px solid #e8e8e8' }}>
                      {item.feasibilityNote}
                    </div>
                  )}
                </div>
              ),
            }))}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>暂无评估历史</div>
        )}
      </Modal>
    </Space>
  )
}
