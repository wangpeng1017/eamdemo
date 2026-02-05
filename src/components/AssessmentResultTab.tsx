/**
 * @file 评估结果Tab - 展示评估记录
 * @desc 按轮次展示所有评估记录，支持修改自己的评估
 */

'use client'

import { useState, useEffect } from 'react'
import { showError } from '@/lib/confirm'
import { Card, Table, Tag, Button, Space, Empty, Spin, message, Collapse, Timeline } from 'antd'
import { EditOutlined, ClockCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import AssessmentFeedbackModal from './AssessmentFeedbackModal'

const { Panel } = Collapse

interface Assessment {
  id: string
  assessorId: string
  assessorName: string
  conclusion: string | null
  feedback: string | null
  round: number
  status: string
  requestedAt: string
  completedAt: string | null
  requestedBy: string
}

interface AssessmentResultTabProps {
  consultationId: string
  consultationNo?: string
  currentUserId?: string
}

const CONCLUSION_MAP: Record<string, { text: string; color: string }> = {
  feasible: { text: '可行', color: 'success' },
  infeasible: { text: '不可行', color: 'error' },
}

const STATUS_MAP: Record<string, { text: string; color: string }> = {
  pending: { text: '待评估', color: 'default' },
  completed: { text: '已完成', color: 'success' },
}

export default function AssessmentResultTab({
  consultationId,
  consultationNo,
  currentUserId,
}: AssessmentResultTabProps) {
  const [loading, setLoading] = useState(false)
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [maxRound, setMaxRound] = useState(0)
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const [currentAssessment, setCurrentAssessment] = useState<any>(null)

  useEffect(() => {
    fetchAssessments()
  }, [consultationId])

  const fetchAssessments = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/consultation/${consultationId}/assessment`)
      const json = await res.json()

      if (json.success) {
        setAssessments(json.data.assessments || [])
        setMaxRound(json.data.maxRound || 0)
      } else {
        showError(json.error?.message || '获取评估记录失败')
      }
    } catch (error) {
      console.error('获取评估记录失败:', error)
      showError('获取评估记录失败')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (assessment: Assessment) => {
    setCurrentAssessment({
      ...assessment,
      consultationNo,
    })
    setFeedbackModalOpen(true)
  }

  // 按轮次分组
  const groupedByRound = assessments.reduce((acc, assessment) => {
    const round = assessment.round
    if (!acc[round]) {
      acc[round] = []
    }
    acc[round].push(assessment)
    return acc
  }, {} as Record<number, Assessment[]>)

  const columns = [
    {
      title: '评估人',
      dataIndex: 'assessorName',
      key: 'assessorName',
      width: 120,
    },
    {
      title: '可行性结论',
      dataIndex: 'conclusion',
      key: 'conclusion',
      width: 120,
      render: (conclusion: string | null) => {
        if (!conclusion) return <Tag>未评估</Tag>
        const config = CONCLUSION_MAP[conclusion]
        return <Tag color={config?.color || 'default'}>{config?.text || conclusion}</Tag>
      },
    },
    {
      title: '评估意见',
      dataIndex: 'feedback',
      key: 'feedback',
      ellipsis: true,
      render: (feedback: string | null) => feedback || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const config = STATUS_MAP[status]
        return <Tag color={config?.color || 'default'}>{config?.text || status}</Tag>
      },
    },
    {
      title: '发起人',
      dataIndex: 'requestedBy',
      key: 'requestedBy',
      width: 100,
    },
    {
      title: '完成时间',
      dataIndex: 'completedAt',
      key: 'completedAt',
      width: 180,
      render: (time: string | null) => time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: Assessment) => {
        const canEdit = record.status === 'completed' && record.assessorId === currentUserId
        return canEdit ? (
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            修改
          </Button>
        ) : null
      },
    },
  ]

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (maxRound === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="暂无评估记录"
      />
    )
  }

  return (
    <>
      <Collapse
        defaultActiveKey={[maxRound.toString()]}
        style={{ marginTop: 16 }}
      >
        {Array.from({ length: maxRound }, (_, i) => maxRound - i).map(round => {
          const roundAssessments = groupedByRound[round] || []
          const allCompleted = roundAssessments.every(a => a.status === 'completed')
          const hasInfeasible = roundAssessments.some(a => a.conclusion === 'infeasible')

          return (
            <Panel
              key={round}
              header={
                <Space>
                  <span>第 {round} 轮评估</span>
                  {allCompleted && (
                    <Tag color={hasInfeasible ? 'error' : 'success'}>
                      {hasInfeasible ? '评估未通过' : '评估通过'}
                    </Tag>
                  )}
                  <Tag>{roundAssessments.length} 人</Tag>
                </Space>
              }
            >
              <Table
                dataSource={roundAssessments}
                columns={columns}
                rowKey="id"
                pagination={false}
                size="small"
              />
            </Panel>
          )
        })}
      </Collapse>

      <AssessmentFeedbackModal
        open={feedbackModalOpen}
        assessment={currentAssessment}
        mode="edit"
        onCancel={() => {
          setFeedbackModalOpen(false)
          setCurrentAssessment(null)
        }}
        onSuccess={() => {
          setFeedbackModalOpen(false)
          setCurrentAssessment(null)
          fetchAssessments()
        }}
      />
    </>
  )
}
