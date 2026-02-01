/**
 * @file 通用驳回对话框组件
 * @desc 用于审批驳回功能的Modal对话框
 * @input documentId, documentType, onReject
 * @output 驳回操作确认
 *
 * @example
 * ```tsx
 * <RejectModal
 *   visible={visible}
 *   documentId={quotation.id}
 *   documentType="quotation"
 *   onSuccess={() => fetchList()}
 *   onCancel={() => setVisible(false)}
 * />
 * ```
 */

'use client'

import { useState, useEffect } from 'react'
import { showSuccess, showError, showWarningMessage } from '@/lib/confirm'
import { Modal, Input, message, Form } from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'

type DocumentType = 'quotation' | 'contract' | 'entrustment' | 'client'

interface RejectModalProps {
  visible: boolean
  documentId: string
  documentType: DocumentType
  title?: string
  onSuccess?: () => void
  onCancel: () => void
}

interface RejectResponse {
  success: boolean
  data?: {
    success: boolean
    rejectedCount: number
    lastRejectReason: string
    lastRejectBy: string
    lastRejectAt: string
  }
  message?: string
  error?: string
}

export function RejectModal({
  visible,
  documentId,
  documentType,
  title,
  onSuccess,
  onCancel
}: RejectModalProps) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  // 重置表单
  useEffect(() => {
    if (!visible) {
      form.resetFields()
      setRejectReason('')
    }
  }, [visible, form])

  // 获取文档类型的中文名
  const getDocumentTypeName = (type: DocumentType): string => {
    const typeMap: Record<DocumentType, string> = {
      quotation: '报价单',
      contract: '合同',
      entrustment: '委托单',
      client: '业务单位'
    }
    return typeMap[type] || '单据'
  }

  // 执行驳回操作
  const handleReject = async () => {
    // 验证驳回原因
    if (!rejectReason.trim()) {
      showWarningMessage('请输入驳回原因')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/${documentType}/${documentId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rejectReason: rejectReason.trim()
        })
      })

      const result: RejectResponse = await response.json()

      if (result.success) {
        showSuccess(`${getDocumentTypeName(documentType)}驳回成功`)
        form.resetFields()
        setRejectReason('')
        onSuccess?.()
        onCancel()
      } else {
        showError(result.error || '驳回失败')
      }
    } catch (error) {
      console.error('驳回失败:', error)
      showError('驳回失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const documentTypeName = getDocumentTypeName(documentType)
  const modalTitle = title || `驳回${documentTypeName}`

  return (
    <Modal
      title={modalTitle}
      open={visible}
      onOk={handleReject}
      onCancel={onCancel}
      confirmLoading={loading}
      okText="确认驳回"
      cancelText="取消"
      okButtonProps={{ danger: true }}
      width={600}
    >
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <ExclamationCircleOutlined style={{ color: '#faad14', fontSize: 20, marginTop: 2 }} />
          <div>
            <p style={{ margin: 0, fontWeight: 500 }}>
              确定{modalTitle}吗？
            </p>
            <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: 14 }}>
              驳回后{documentTypeName}将退回发起人修改，驳回原因将记录在审批历史中。
            </p>
          </div>
        </div>
      </div>

      <Form form={form} layout="vertical">
        <Form.Item
          label="驳回原因"
          required
          tooltip="请详细说明驳回原因，帮助发起人理解和修改"
        >
          <Input.TextArea
            rows={4}
            placeholder="请输入驳回原因（必填，不能为空）"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            maxLength={500}
            showCount
            allowClear
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
