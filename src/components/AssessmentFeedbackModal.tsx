/**
 * @file 评估反馈弹窗 - 提交/修改评估反馈
 * @desc 评估人提交或修改评估意见
 */

'use client'

import { useState, useEffect } from 'react'
import { showSuccess, showError } from '@/lib/confirm'
import { Modal, Form, Select, Input, message, Descriptions, Tag } from 'antd'

const { TextArea } = Input

interface AssessmentData {
  id: string
  consultationNo?: string
  clientName?: string
  testItems?: any[]
  round?: number
  conclusion?: string
  feedback?: string
  status?: string
}

interface AssessmentFeedbackModalProps {
  open: boolean
  assessment: AssessmentData | null
  mode: 'submit' | 'edit' // 提交 or 修改
  onCancel: () => void
  onSuccess: () => void
}

const CONCLUSION_OPTIONS = [
  { value: 'feasible', label: '可行', color: 'success' },
  { value: 'difficult', label: '有难度', color: 'warning' },
  { value: 'infeasible', label: '不可行', color: 'error' },
]

export default function AssessmentFeedbackModal({
  open,
  assessment,
  mode,
  onCancel,
  onSuccess,
}: AssessmentFeedbackModalProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && assessment) {
      if (mode === 'edit' && assessment.conclusion && assessment.feedback) {
        form.setFieldsValue({
          conclusion: assessment.conclusion,
          feedback: assessment.feedback,
        })
      } else {
        form.resetFields()
      }
    }
  }, [open, assessment, mode, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      let res
      if (mode === 'submit') {
        // 提交评估
        res = await fetch(`/api/consultation/assessment/${assessment?.id}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
      } else {
        // 修改评估
        res = await fetch(`/api/consultation/assessment/${assessment?.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        })
      }

      const json = await res.json()

      if (json.success) {
        showSuccess(json.data.message || (mode === 'submit' ? '评估反馈已提交' : '评估反馈已更新'))
        form.resetFields()
        onSuccess()
      } else {
        showError(json.error?.message || '操作失败')
      }
    } catch (error: any) {
      if (error.errorFields) {
        return
      }
      console.error('提交失败:', error)
      showError('操作失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    onCancel()
  }

  return (
    <Modal
      title={mode === 'submit' ? '提交评估反馈' : '修改评估反馈'}
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={700}
      destroyOnClose
    >
      {assessment && (
        <>
          <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="咨询单号">{assessment.consultationNo}</Descriptions.Item>
            <Descriptions.Item label="客户名称">{assessment.clientName}</Descriptions.Item>
            <Descriptions.Item label="评估轮次">
              <Tag color="blue">第 {assessment.round} 轮</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="检测项目">
              {assessment.testItems && assessment.testItems.length > 0 ? (
                assessment.testItems.map((item: any, idx: number) => (
                  <Tag key={idx}>{item.name || item}</Tag>
                ))
              ) : (
                '无'
              )}
            </Descriptions.Item>
          </Descriptions>

          <Form
            form={form}
            layout="vertical"
          >
            <Form.Item
              label="可行性结论"
              name="conclusion"
              rules={[{ required: true, message: '请选择可行性结论' }]}
            >
              <Select
                placeholder="请选择可行性结论"
                options={CONCLUSION_OPTIONS.map(opt => ({
                  value: opt.value,
                  label: (
                    <span>
                      <Tag color={opt.color}>{opt.label}</Tag>
                    </span>
                  ),
                }))}
              />
            </Form.Item>

            <Form.Item
              label="评估意见"
              name="feedback"
              rules={[{ required: true, message: '请输入评估意见' }]}
            >
              <TextArea
                rows={6}
                placeholder="请详细说明评估依据、技术难点、资源需求等..."
                showCount
                maxLength={1000}
              />
            </Form.Item>
          </Form>
        </>
      )}
    </Modal>
  )
}
