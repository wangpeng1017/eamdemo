/**
 * @file 从报价单生成委托单按钮组件
 * @desc 点击后从报价单直接创建委托单（跳过合同）
 * @input quotationId, quotationStatus
 * @output 委托单创建成功
 *
 * @example
 * ```tsx
 * <CreateEntrustmentButton
 *   quotationId={quotation.id}
 *   quotationStatus={quotation.status}
 *   onSuccess={(entrustmentId) => {
 *     router.push(`/entrustment/${entrustmentId}`)
 *   }}
 * />
 * ```
 */

'use client'

import { useState } from 'react'
import { Button, message, Modal, Descriptions } from 'antd'
import { FileTextOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'

type QuotationStatus = 'draft' | 'pending_sales' | 'pending_finance' | 'pending_lab' | 'approved' | 'rejected' | 'archived'

interface CreateEntrustmentButtonProps {
  quotationId: string
  quotationStatus: QuotationStatus
  onSuccess?: (entrustmentId: string, entrustmentNo: string) => void
  buttonText?: string
  icon?: React.ReactNode
  size?: 'small' | 'middle' | 'large'
  type?: 'default' | 'primary' | 'dashed' | 'link' | 'text'
}

interface CreateEntrustmentResponse {
  success: boolean
  data?: {
    success: boolean
    entrustmentId: string
    entrustmentNo: string
    quotationNo: string
    contractNo?: string
    message: string
  }
  message?: string
  error?: string
}

export function CreateEntrustmentButton({
  quotationId,
  quotationStatus,
  onSuccess,
  buttonText = '生成委托单',
  icon = <FileTextOutlined />,
  size = 'middle',
  type = 'primary'
}: CreateEntrustmentButtonProps) {
  const [loading, setLoading] = useState(false)
  const [resultModalVisible, setResultModalVisible] = useState(false)
  const [resultData, setResultData] = useState<{
    entrustmentNo: string
    quotationNo: string
    contractNo?: string
    message: string
  } | null>(null)
  const router = useRouter()

  // 检查是否可以生成委托单
  const canCreate = quotationStatus === 'approved'

  // 获取状态提示文本
  const getStatusTooltip = () => {
    const tooltips: Record<QuotationStatus, string> = {
      draft: '报价单为草稿状态，请先提交审批',
      pending_sales: '报价单正在销售审批中，请等待审批通过',
      pending_finance: '报价单正在财务审批中，请等待审批通过',
      pending_lab: '报价单正在实验室审批中，请等待审批通过',
      approved: '点击从此报价单生成委托单',
      rejected: '报价单已被驳回，请修改后重新提交审批',
      archived: '报价单已归档，无法生成委托单'
    }
    return tooltips[quotationStatus] || '当前状态无法生成委托单'
  }

  // 处理生成委托单
  const handleCreate = async () => {
    if (!canCreate) {
      message.warning(getStatusTooltip())
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/quotation/${quotationId}/create-entrustment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })

      const result: CreateEntrustmentResponse = await response.json()

      if (result.success && result.data) {
        // 显示成功结果
        setResultData({
          entrustmentNo: result.data.entrustmentNo,
          quotationNo: result.data.quotationNo,
          contractNo: result.data.contractNo,
          message: result.data.message
        })
        setResultModalVisible(true)

        // 调用成功回调
        onSuccess?.(result.data.entrustmentId, result.data.entrustmentNo)
      } else {
        message.error(result.error || '生成委托单失败')
      }
    } catch (error) {
      console.error('生成委托单失败:', error)
      message.error('生成委托单失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  // 跳转到委托单详情
  const handleViewEntrustment = () => {
    if (resultData) {
      setResultModalVisible(false)
      router.push(`/entrustment/list`)
    }
  }

  return (
    <>
      <Button
        type={type}
        icon={icon}
        size={size}
        loading={loading}
        disabled={!canCreate}
        onClick={handleCreate}
        title={!canCreate ? getStatusTooltip() : undefined}
      >
        {buttonText}
      </Button>

      {/* 成功结果Modal */}
      <Modal
        title="委托单创建成功"
        open={resultModalVisible}
        onOk={handleViewEntrustment}
        onCancel={() => setResultModalVisible(false)}
        okText="查看委托单"
        cancelText="关闭"
        width={600}
      >
        {resultData && (
          <div>
            <div style={{ marginBottom: 16, textAlign: 'center' }}>
              <FileTextOutlined style={{ fontSize: 48, color: '#52c41a' }} />
              <p style={{ marginTop: 8, fontSize: 16, fontWeight: 500 }}>
                {resultData.message}
              </p>
            </div>

            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="委托单号">
                <span style={{ fontWeight: 500, color: '#1890ff' }}>
                  {resultData.entrustmentNo}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="报价单号">
                {resultData.quotationNo}
              </Descriptions.Item>
              {resultData.contractNo && (
                <Descriptions.Item label="合同号">
                  {resultData.contractNo}
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>
        )}
      </Modal>
    </>
  )
}
