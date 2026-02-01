/**
 * @file 重新评估弹窗（v2 - 样品检测项级评估）
 * @desc 支持直接重新评估或修改样品信息后重新评估
 * @see PRD: docs/plans/2026-01-28-sample-item-assessment-design.md
 */

'use client'

import { useState, useEffect } from 'react'
import { showSuccess, showError } from '@/lib/confirm'
import { Modal, Tabs, Form, Select, Input, InputNumber, message, Space, Descriptions } from 'antd'

interface User {
  id: string
  name: string
  username: string
  dept?: { name: string }
}

interface SampleItem {
  id: string
  sampleName: string | null
  testItemName: string | null
  quantity: number | null
  material: string | null
  assessmentStatus: string | null
  currentAssessor: string | null
}

interface SampleItemReassessmentModalProps {
  open: boolean
  sampleItem: SampleItem | null
  onCancel: () => void
  onSuccess: () => void
}

export default function SampleItemReassessmentModal({
  open,
  sampleItem,
  onCancel,
  onSuccess,
}: SampleItemReassessmentModalProps) {
  const [directForm] = Form.useForm()
  const [modifyForm] = Form.useForm()
  const [activeTab, setActiveTab] = useState('1')
  const [submitting, setSubmitting] = useState(false)
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    if (open) {
      fetchUsers()
      if (sampleItem) {
        // 初始化修改表单
        modifyForm.setFieldsValue({
          assessorId: undefined,
          sampleName: sampleItem.sampleName,
          testItemName: sampleItem.testItemName,
          quantity: sampleItem.quantity,
          material: sampleItem.material,
        })
      }
      directForm.resetFields()
    }
  }, [open, sampleItem, directForm, modifyForm])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/user?pageSize=1000')
      const json = await res.json()
      if (json.success && json.data) {
        setUsers(json.data.list || [])
      }
    } catch (error) {
      console.error('获取用户列表失败:', error)
    }
  }

  // 直接重新评估
  const handleDirectReassess = async () => {
    try {
      const values = await directForm.validateFields()

      if (!sampleItem) {
        showError('样品检测项信息缺失')
        return
      }

      const user = users.find((u) => u.id === values.assessorId)
      if (!user) {
        showError('评估人信息缺失')
        return
      }

      setSubmitting(true)

      const res = await fetch(`/api/consultation/assessment/item/${sampleItem.id}/reassess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessorId: user.id,
          assessorName: user.name,
        }),
      })

      const json = await res.json()

      if (json.success) {
        showSuccess('重新评估已发起')
        directForm.resetFields()
        onSuccess()
      } else {
        showError(json.error || '重新评估失败')
      }
    } catch (error) {
      console.error('重新评估失败:', error)
      showError('重新评估失败')
    } finally {
      setSubmitting(false)
    }
  }

  // 修改样品信息后重新评估
  const handleModifyAndReassess = async () => {
    try {
      const values = await modifyForm.validateFields()

      if (!sampleItem) {
        showError('样品检测项信息缺失')
        return
      }

      const user = users.find((u) => u.id === values.assessorId)
      if (!user) {
        showError('评估人信息缺失')
        return
      }

      setSubmitting(true)

      const res = await fetch(`/api/consultation/assessment/item/${sampleItem.id}/reassess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessorId: user.id,
          assessorName: user.name,
          modifiedData: {
            sampleName: values.sampleName,
            testItemName: values.testItemName,
            quantity: values.quantity,
            material: values.material,
          },
        }),
      })

      const json = await res.json()

      if (json.success) {
        showSuccess('样品信息已更新，重新评估已发起')
        modifyForm.resetFields()
        onSuccess()
      } else {
        showError(json.error || '重新评估失败')
      }
    } catch (error) {
      console.error('重新评估失败:', error)
      showError('重新评估失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOk = () => {
    if (activeTab === '1') {
      handleDirectReassess()
    } else {
      handleModifyAndReassess()
    }
  }

  return (
    <Modal
      title="重新评估"
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={submitting}
      width={700}
      okText="发起重新评估"
      cancelText="取消"
    >
      {sampleItem && (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* 当前样品信息 */}
          <Descriptions title="当前样品检测项信息" bordered column={2} size="small">
            <Descriptions.Item label="样品名称">{sampleItem.sampleName || '-'}</Descriptions.Item>
            <Descriptions.Item label="检测项">{sampleItem.testItemName || '-'}</Descriptions.Item>
            <Descriptions.Item label="数量">{sampleItem.quantity || '-'}</Descriptions.Item>
            <Descriptions.Item label="材质">{sampleItem.material || '-'}</Descriptions.Item>
            <Descriptions.Item label="当前评估人">{sampleItem.currentAssessor || '-'}</Descriptions.Item>
            <Descriptions.Item label="评估状态">
              {sampleItem.assessmentStatus === 'failed' ? '未通过' : sampleItem.assessmentStatus}
            </Descriptions.Item>
          </Descriptions>

          {/* 标签页 */}
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: '1',
                label: '直接重新评估',
                children: (
                  <Form form={directForm} layout="vertical">
                    <Form.Item
                      name="assessorId"
                      label="选择新评估人"
                      rules={[{ required: true, message: '请选择新评估人' }]}
                    >
                      <Select
                        showSearch
                        allowClear
                        placeholder="选择评估人"
                        optionFilterProp="label"
                        options={users.map((u) => ({
                          value: u.id,
                          label: `${u.name}${u.dept ? ` (${u.dept.name})` : ''}`,
                        }))}
                      />
                    </Form.Item>
                    <div style={{ color: '#666', fontSize: '12px' }}>
                      注：直接重新评估将保留原样品信息，只更换评估人
                    </div>
                  </Form>
                ),
              },
              {
                key: '2',
                label: '修改样品信息后重新评估',
                children: (
                  <Form form={modifyForm} layout="vertical">
                    <Form.Item
                      name="assessorId"
                      label="选择新评估人"
                      rules={[{ required: true, message: '请选择新评估人' }]}
                    >
                      <Select
                        showSearch
                        allowClear
                        placeholder="选择评估人"
                        optionFilterProp="label"
                        options={users.map((u) => ({
                          value: u.id,
                          label: `${u.name}${u.dept ? ` (${u.dept.name})` : ''}`,
                        }))}
                      />
                    </Form.Item>

                    <Form.Item name="sampleName" label="样品名称">
                      <Input placeholder="样品名称" />
                    </Form.Item>

                    <Form.Item name="testItemName" label="检测项">
                      <Input placeholder="检测项" />
                    </Form.Item>

                    <Form.Item name="quantity" label="数量">
                      <InputNumber placeholder="数量" min={1} style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item name="material" label="材质">
                      <Input placeholder="材质" />
                    </Form.Item>

                    <div style={{ color: '#666', fontSize: '12px' }}>
                      注：修改样品信息后将创建新一轮评估，旧评估记录将保留在历史中
                    </div>
                  </Form>
                ),
              },
            ]}
          />
        </Space>
      )}
    </Modal>
  )
}
