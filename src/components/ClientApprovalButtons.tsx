/**
 * @file 业务单位审批按钮组组件
 * @desc 包含提交审批和审批通过两个按钮
 * @input clientId, clientStatus
 * @output 审批操作完成
 *
 * @example
 * ```tsx
 * <ClientApprovalButtons
 *   clientId={client.id}
 *   clientStatus={client.status}
 *   onSuccess={() => fetchList()}
 * />
 * ```
 */

'use client'

import { useState } from 'react'
import { showSuccess, showError } from '@/lib/confirm'
import { Button, Space, message, Modal, Input } from 'antd'
import { SendOutlined, CheckOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { RejectModal } from './RejectModal'

type ClientStatus = 'draft' | 'pending' | 'approved' | 'rejected'

interface ClientApprovalButtonsProps {
  clientId: string
  clientStatus: ClientStatus
  onSuccess?: () => void
  showLabel?: boolean
}

interface ApprovalResponse {
  success: boolean
  data?: {
    success: boolean
    status: string
    message: string
  }
  message?: string
  error?: string
}

export function ClientApprovalButtons({
  clientId,
  clientStatus,
  onSuccess,
  showLabel = false
}: ClientApprovalButtonsProps) {
  const [loading, setLoading] = useState(false)
  const [submitModalVisible, setSubmitModalVisible] = useState(false)
  const [approveModalVisible, setApproveModalVisible] = useState(false)
  const [rejectModalVisible, setRejectModalVisible] = useState(false)
  const [comment, setComment] = useState('')

  // 检查是否可以提交审批
  const canSubmit = clientStatus === 'draft' || clientStatus === 'rejected'

  // 检查是否可以审批通过
  const canApprove = clientStatus === 'pending'

  // 处理提交审批
  const handleSubmit = async () => {
    setLoading(true)

    try {
      const response = await fetch(`/api/client/${clientId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          comment: comment.trim() || '提交审批'
        })
      })

      const result: ApprovalResponse = await response.json()

      if (result.success) {
        showSuccess('提交审批成功')
        setComment('')
        setSubmitModalVisible(false)
        onSuccess?.()
      } else {
        showError(result.error || '提交失败')
      }
    } catch (error) {
      console.error('提交审批失败:', error)
      showError('提交失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  // 处理审批通过
  const handleApprove = async () => {
    setLoading(true)

    try {
      const response = await fetch(`/api/client/${clientId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          comment: comment.trim() || '审批通过'
        })
      })

      const result: ApprovalResponse = await response.json()

      if (result.success) {
        showSuccess('审批通过成功')
        setComment('')
        setApproveModalVisible(false)
        onSuccess?.()
      } else {
        showError(result.error || '审批失败')
      }
    } catch (error) {
      console.error('审批通过失败:', error)
      showError('审批失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Space>
        {/* 提交审批按钮 */}
        {canSubmit && (
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={() => setSubmitModalVisible(true)}
          >
            {showLabel ? '提交审批' : '提交'}
          </Button>
        )}

        {/* 审批操作（通过/驳回）已移至"工作台-审批中心"统一处理 */}
      </Space>

      {/* 提交审批Modal */}
      <Modal
        title="提交审批"
        open={submitModalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setSubmitModalVisible(false)
          setComment('')
        }}
        confirmLoading={loading}
        okText="确认提交"
        cancelText="取消"
      >
        <p style={{ marginBottom: 16 }}>
          确定要提交此业务单位进行审批吗？提交后将进入审批流程。
        </p>
        <Input.TextArea
          rows={3}
          placeholder="请输入备注（可选）"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={200}
          showCount
        />
      </Modal>

      {/* 审批通过Modal */}
      <Modal
        title="审批通过"
        open={approveModalVisible}
        onOk={handleApprove}
        onCancel={() => {
          setApproveModalVisible(false)
          setComment('')
        }}
        confirmLoading={loading}
        okText="确认通过"
        cancelText="取消"
        okButtonProps={{ style: { backgroundColor: '#52c41a' } }}
      >
        <p style={{ marginBottom: 16 }}>
          确定要审批通过此业务单位吗？
        </p>
        <Input.TextArea
          rows={3}
          placeholder="请输入审批意见（可选）"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={200}
          showCount
        />
      </Modal>
    </>
  )
}
