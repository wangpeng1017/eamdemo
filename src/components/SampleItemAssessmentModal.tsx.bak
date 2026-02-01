/**
 * @file 单条样品检测项评估弹窗（v2 - 样品检测项级评估）
 * @desc 评估人提交评估结果（可行性 + 说明）
 * @see PRD: docs/plans/2026-01-28-sample-item-assessment-design.md
 */

'use client'

import { useState, useEffect } from 'react'
import { Modal, Form, Radio, Input, Descriptions, message, Space } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined } from '@ant-design/icons'

const { TextArea } = Input

interface SampleItem {
  id: string
  sampleName: string | null
  testItemName: string | null
  quantity: number | null
  material: string | null
  assessmentStatus: string | null
  currentAssessor: string | null
}

interface SampleItemAssessmentModalProps {
  open: boolean
  sampleItem: SampleItem | null
  onCancel: () => void
  onSuccess: () => void
}

export default function SampleItemAssessmentModal({
  open,
  sampleItem,
  onCancel,
  onSuccess,
}: SampleItemAssessmentModalProps) {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open && sampleItem) {
      form.resetFields()
    }
  }, [open, sampleItem, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      if (!sampleItem) {
        message.error('样品检测项信息缺失')
        return
      }

      setSubmitting(true)

      const res = await fetch(`/api/consultation/assessment/item/${sampleItem.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feasibility: values.feasibility,
          feasibilityNote: values.feasibilityNote || undefined,
        }),
      })

      const json = await res.json()

      if (json.success) {
        message.success('评估提交成功')
        form.resetFields()
        onSuccess()
      } else {
        message.error(json.error || '提交失败')
      }
    } catch (error) {
      console.error('提交评估失败:', error)
      message.error('提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="提交评估"
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={submitting}
      width={700}
      okText="提交评估"
      cancelText="取消"
    >
      {sampleItem && (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* 样品信息（只读） */}
          <Descriptions title="样品检测项信息" bordered column={2} size="small">
            <Descriptions.Item label="样品名称">{sampleItem.sampleName || '-'}</Descriptions.Item>
            <Descriptions.Item label="检测项">{sampleItem.testItemName || '-'}</Descriptions.Item>
            <Descriptions.Item label="数量">{sampleItem.quantity || '-'}</Descriptions.Item>
            <Descriptions.Item label="材质">{sampleItem.material || '-'}</Descriptions.Item>
          </Descriptions>

          {/* 评估表单 */}
          <Form form={form} layout="vertical">
            <Form.Item
              name="feasibility"
              label="可行性评估"
              rules={[{ required: true, message: '请选择可行性评估结果' }]}
            >
              <Radio.Group>
                <Space direction="vertical">
                  <Radio value="feasible">
                    <Space>
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      <span>可行</span>
                    </Space>
                  </Radio>
                  <Radio value="difficult">
                    <Space>
                      <ClockCircleOutlined style={{ color: '#faad14' }} />
                      <span>有难度</span>
                    </Space>
                  </Radio>
                  <Radio value="infeasible">
                    <Space>
                      <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                      <span>不可行</span>
                    </Space>
                  </Radio>
                </Space>
              </Radio.Group>
            </Form.Item>

            <Form.Item name="feasibilityNote" label="评估说明" extra="请说明评估结果的原因或注意事项">
              <TextArea rows={4} placeholder="例如：样品规格符合标准，建议在常温下存放..." />
            </Form.Item>
          </Form>
        </Space>
      )}
    </Modal>
  )
}
