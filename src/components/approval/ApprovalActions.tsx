/**
 * @file ApprovalActions.tsx
 * @desc 审批操作组件 - 提供审批通过/驳回/撤回操作
 */

'use client'

import { Button, Space, Modal, Form, Input, message } from 'antd'
import { CheckOutlined, CloseOutlined, RollbackOutlined } from '@ant-design/icons'
import { useState } from 'react'

interface ApprovalActionsProps {
  instanceId: string
  status: string
  canApprove?: boolean
  canCancel?: boolean
  onSuccess?: () => void
}

export function ApprovalActions({
  instanceId,
  status,
  canApprove = false,
  canCancel = false,
  onSuccess,
}: ApprovalActionsProps) {
  const [actionModalOpen, setActionModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve')
  const [form] = Form.useForm()

  // 审批操作
  const handleApprovalAction = async (action: 'approve' | 'reject') => {
    const values = await form.validateFields()
    setSubmitting(true)

    try {
      const res = await fetch(`/api/approval/${instanceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          approverId: 'current_user_id', // TODO: 从 session 获取
          approverName: '当前用户', // TODO: 从 session 获取
          comment: values.comment,
        }),
      })

      const data = await res.json()

      if (data.success) {
        message.success(action === 'approve' ? '审批通过' : '已驳回')
        setActionModalOpen(false)
        form.resetFields()
        onSuccess?.()
      } else {
        message.error(data.error?.message || '操作失败')
      }
    } catch (err) {
      message.error('网络错误')
    } finally {
      setSubmitting(false)
    }
  }

  // 撤回审批
  const handleCancel = async () => {
    setSubmitting(true)

    try {
      const res = await fetch(`/api/approval/${instanceId}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (data.success) {
        message.success('已撤回')
        onSuccess?.()
      } else {
        message.error(data.error?.message || '操作失败')
      }
    } catch (err) {
      message.error('网络错误')
    } finally {
      setSubmitting(false)
    }
  }

  // 只有审批中状态才显示操作按钮
  if (status !== 'pending') {
    return null
  }

  return (
    <>
      <Space>
        {canApprove && (
          <>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => {
                setActionType('approve')
                setActionModalOpen(true)
              }}
            >
              审批通过
            </Button>
            <Button
              danger
              icon={<CloseOutlined />}
              onClick={() => {
                setActionType('reject')
                setActionModalOpen(true)
              }}
            >
              驳回
            </Button>
          </>
        )}
        {canCancel && (
          <Button
            icon={<RollbackOutlined />}
            onClick={handleCancel}
            loading={submitting}
          >
            撤回
          </Button>
        )}
      </Space>

      <Modal
        title={actionType === 'approve' ? '审批通过' : '驳回'}
        open={actionModalOpen}
        onCancel={() => {
          setActionModalOpen(false)
          form.resetFields()
        }}
        footer={null}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="comment"
            label="审批意见"
            rules={actionType === 'reject' ? [{ required: true, message: '请填写驳回原因' }] : []}
          >
            <Input.TextArea
              rows={4}
              placeholder={actionType === 'approve' ? '请输入审批意见（可选）' : '请填写驳回原因'}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button
                type="primary"
                onClick={() => handleApprovalAction(actionType)}
                loading={submitting}
              >
                确认
              </Button>
              <Button
                onClick={() => {
                  setActionModalOpen(false)
                  form.resetFields()
                }}
              >
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
