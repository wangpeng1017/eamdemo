/**
 * @file 报价单PDF打印按钮组件
 * @desc 根据报价单状态控制是否可以打印PDF
 * @input quotationId, quotationStatus
 * @output 打开PDF预览窗口
 *
 * @example
 * ```tsx
 * <QuotationPDFButton
 *   quotationId={quotation.id}
 *   quotationStatus={quotation.status}
 * />
 * ```
 */

'use client'

import { Button, message, Tooltip } from 'antd'
import { showWarningMessage } from '@/lib/confirm'
import { PrinterOutlined, FilePdfOutlined } from '@ant-design/icons'

type QuotationStatus = 'draft' | 'pending_sales' | 'pending_finance' | 'pending_lab' | 'approved' | 'rejected' | 'archived'

interface QuotationPDFButtonProps {
  quotationId: string
  quotationStatus: QuotationStatus
  buttonType?: 'default' | 'primary' | 'text' | 'link'
  size?: 'small' | 'middle' | 'large'
  showLabel?: boolean
  icon?: React.ReactNode
}

export function QuotationPDFButton({
  quotationId,
  quotationStatus,
  buttonType = 'default',
  size = 'middle',
  showLabel = true,
  icon = <PrinterOutlined />
}: QuotationPDFButtonProps) {
  // 所有状态均允许打印PDF
  const canPrint = true

  // 获取状态提示信息
  const getStatusMessage = (): string => {
    const messages: Record<QuotationStatus, string> = {
      draft: '点击打印草稿PDF',
      pending_sales: '点击打印PDF（销售审批中）',
      pending_finance: '点击打印PDF（财务审批中）',
      pending_lab: '点击打印PDF（实验室审批中）',
      approved: '点击打印PDF',
      rejected: '点击打印PDF（已驳回）',
      archived: '点击打印PDF（已归档）'
    }
    return messages[quotationStatus] || '当前状态无法打印PDF'
  }

  // 处理打印PDF
  const handlePrint = () => {
    if (!canPrint) {
      showWarningMessage(getStatusMessage())
      return
    }

    // 打开新窗口打印PDF
    const pdfUrl = `/api/quotation/${quotationId}/pdf`
    window.open(pdfUrl, '_blank')
  }

  const button = (
    <Button
      type={buttonType}
      icon={icon}
      size={size}
      disabled={!canPrint}
      onClick={handlePrint}
    >
      {showLabel && '打印PDF'}
    </Button>
  )

  // 如果可以打印，直接返回按钮
  if (canPrint) {
    return button
  }

  // 如果不能打印，使用Tooltip显示提示
  return (
    <Tooltip title={getStatusMessage()}>
      {button}
    </Tooltip>
  )
}

/**
 * 报价单PDF打印图标按钮（小尺寸，用于Table操作列）
 */
export function QuotationPDFIconButton({
  quotationId,
  quotationStatus
}: {
  quotationId: string
  quotationStatus: QuotationStatus
}) {
  return (
    <QuotationPDFButton
      quotationId={quotationId}
      quotationStatus={quotationStatus}
      buttonType="link"
      size="small"
      showLabel={false}
      icon={<FilePdfOutlined style={{ fontSize: 18 }} />}
    />
  )
}
