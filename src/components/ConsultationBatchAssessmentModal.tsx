/**
 * @file 批量分配评估人弹窗（v2 - 样品检测项级评估）
 * @desc 为每条样品检测项分配评估人，支持一键分配所有项
 * @see PRD: docs/plans/2026-01-28-sample-item-assessment-design.md
 */

'use client'

import { useState, useEffect } from 'react'
import { Modal, Table, Select, Button, Space, message, Alert } from 'antd'
import type { ColumnsType } from 'antd/es/table'

interface User {
  id: string
  name: string
  username: string
  dept?: { name: string }
}

interface SampleTestItem {
  id: string
  sampleName: string | null
  testItemName: string | null
  quantity: number | null
  material: string | null
}

interface Assignment {
  sampleTestItemId: string
  assessorId: string
  assessorName: string
}

interface ConsultationBatchAssessmentModalProps {
  open: boolean
  consultationId: string | null
  onCancel: () => void
  onSuccess: () => void
}

export default function ConsultationBatchAssessmentModal({
  open,
  consultationId,
  onCancel,
  onSuccess,
}: ConsultationBatchAssessmentModalProps) {
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [sampleItems, setSampleItems] = useState<SampleTestItem[]>([])
  const [assignments, setAssignments] = useState<Map<string, { assessorId: string; assessorName: string }>>(new Map())
  const [batchAssessor, setBatchAssessor] = useState<{ id: string; name: string } | null>(null)

  // 获取用户列表
  useEffect(() => {
    if (open) {
      fetchUsers()
    }
  }, [open])

  // 获取样品检测项列表
  useEffect(() => {
    if (open && consultationId) {
      fetchSampleItems()
    }
  }, [open, consultationId])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/user?pageSize=1000')
      const json = await res.json()
      if (json.success && json.data) {
        setUsers(json.data.list || [])
      }
    } catch (error) {
      console.error('获取用户列表失败:', error)
      message.error('获取用户列表失败')
    }
  }

  const fetchSampleItems = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/sample-test-item?consultationId=${consultationId}`)
      const json = await res.json()
      if (json.success && json.data) {
        setSampleItems(json.data.list || [])
      } else {
        message.error(json.error || '获取样品检测项失败')
      }
    } catch (error) {
      console.error('获取样品检测项失败:', error)
      message.error('获取样品检测项失败')
    } finally {
      setLoading(false)
    }
  }

  // 单个分配
  const handleAssignChange = (sampleTestItemId: string, userId: string) => {
    const user = users.find((u) => u.id === userId)
    if (user) {
      const newAssignments = new Map(assignments)
      newAssignments.set(sampleTestItemId, {
        assessorId: user.id,
        assessorName: user.name,
      })
      setAssignments(newAssignments)
    }
  }

  // 一键分配所有项给同一人
  const handleBatchAssign = () => {
    if (!batchAssessor) {
      message.warning('请先选择评估人')
      return
    }

    const newAssignments = new Map<string, { assessorId: string; assessorName: string }>()
    sampleItems.forEach((item) => {
      newAssignments.set(item.id, {
        assessorId: batchAssessor.id,
        assessorName: batchAssessor.name,
      })
    })
    setAssignments(newAssignments)
    message.success('已一键分配所有样品检测项')
  }

  // 提交分配
  const handleSubmit = async () => {
    // 验证所有项都已分配
    if (assignments.size < sampleItems.length) {
      message.warning('请为所有样品检测项分配评估人')
      return
    }

    const assignmentsArray: Assignment[] = Array.from(assignments.entries()).map(([sampleTestItemId, assessor]) => ({
      sampleTestItemId,
      assessorId: assessor.assessorId,
      assessorName: assessor.assessorName,
    }))

    setSubmitting(true)
    try {
      const res = await fetch(`/api/consultation/${consultationId}/assessment/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments: assignmentsArray }),
      })

      const json = await res.json()

      if (json.success) {
        message.success('评估人分配成功')
        onSuccess()
        handleReset()
      } else {
        message.error(json.error || '分配失败')
      }
    } catch (error) {
      console.error('分配失败:', error)
      message.error('分配失败')
    } finally {
      setSubmitting(false)
    }
  }

  // 重置
  const handleReset = () => {
    setAssignments(new Map())
    setBatchAssessor(null)
    setSampleItems([])
  }

  const columns: ColumnsType<SampleTestItem> = [
    {
      title: '样品名称',
      dataIndex: 'sampleName',
      key: 'sampleName',
      width: 150,
    },
    {
      title: '检测项',
      dataIndex: 'testItemName',
      key: 'testItemName',
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
      title: '评估人',
      key: 'assessor',
      width: 200,
      render: (_, record) => (
        <Select
          showSearch
          allowClear
          placeholder="选择评估人"
          optionFilterProp="label"
          style={{ width: '100%' }}
          value={assignments.get(record.id)?.assessorId}
          onChange={(value) => handleAssignChange(record.id, value)}
          options={users.map((u) => ({
            value: u.id,
            label: `${u.name}${u.dept ? ` (${u.dept.name})` : ''}`,
          }))}
        />
      ),
    },
  ]

  return (
    <Modal
      title="批量分配评估人"
      open={open}
      onCancel={() => {
        onCancel()
        handleReset()
      }}
      onOk={handleSubmit}
      confirmLoading={submitting}
      width={900}
      okText="提交"
      cancelText="取消"
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Alert
          message="提示"
          description="为每条样品检测项分配一名评估人，或使用下方的一键分配功能"
          type="info"
          showIcon
        />

        {/* 一键分配 */}
        <Space>
          <span>一键分配所有项给：</span>
          <Select
            showSearch
            allowClear
            placeholder="选择评估人"
            optionFilterProp="label"
            style={{ width: 200 }}
            value={batchAssessor?.id}
            onChange={(value) => {
              const user = users.find((u) => u.id === value)
              setBatchAssessor(user ? { id: user.id, name: user.name } : null)
            }}
            options={users.map((u) => ({
              value: u.id,
              label: `${u.name}${u.dept ? ` (${u.dept.name})` : ''}`,
            }))}
          />
          <Button type="primary" onClick={handleBatchAssign} disabled={!batchAssessor}>
            一键分配
          </Button>
        </Space>

        {/* 样品检测项表格 */}
        <Table
          columns={columns}
          dataSource={sampleItems}
          rowKey="id"
          loading={loading}
          pagination={false}
          scroll={{ y: 400 }}
          size="small"
        />

        <div style={{ color: '#666', fontSize: '12px' }}>
          已分配 {assignments.size} / {sampleItems.length} 项
        </div>
      </Space>
    </Modal>
  )
}
