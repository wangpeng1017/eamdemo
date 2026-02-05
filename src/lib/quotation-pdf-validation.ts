/**
 * @file 报价单PDF生成验证
 * @desc 验证报价单是否已审批通过，只有通过后才能生成PDF
 * @see PRD: docs/plans/2026-01-28-business-workflow-enhancement-design.md#模块3
 */

import { prisma } from '@/lib/prisma'

/**
 * 报价单状态枚举
 */
export type QuotationStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'archived'

/**
 * PDF生成验证结果
 */
export interface PDFValidationResult {
  canGenerate: boolean        // 是否可以生成PDF
  currentStatus: QuotationStatus  // 当前状态
  error?: string                // 错误信息（如果无法生成）
}

/**
 * 状态配置映射
 */
export const QUOTATION_STATUS_CONFIG: Record<QuotationStatus, {
  text: string
  color: string
  canGeneratePDF: boolean
  message: string  // 无法生成PDF时的提示信息
}> = {
  draft: {
    text: '草稿',
    color: 'default',
    canGeneratePDF: true,
    message: ''
  },
  pending: {
    text: '审批中',
    color: 'processing',
    canGeneratePDF: false,
    message: '报价单正在审批中，请耐心等待审批完成后再生成PDF'
  },
  approved: {
    text: '已通过',
    color: 'success',
    canGeneratePDF: true,
    message: ''  // 可以生成，无需提示
  },
  rejected: {
    text: '已驳回',
    color: 'error',
    canGeneratePDF: false,
    message: '报价单已被驳回，请修改内容后重新提交审批'
  },
  archived: {
    text: '已归档',
    color: 'default',
    canGeneratePDF: false,
    message: '报价单已归档，无法生成PDF'
  }
}

/**
 * 验证报价单是否可以生成PDF
 *
 * @param quotationId - 报价单ID
 * @returns 验证结果
 *
 * @example
 * ```typescript
 * const result = await validateQuotationForPDF('quotation-123')
 * if (!result.canGenerate) {
 *   return NextResponse.json(
 *     { success: false, error: result.error },
 *     { status: 403 }
 *   )
 * }
 * ```
 */
export async function validateQuotationForPDF(
  quotationId: string
): Promise<PDFValidationResult> {
  // 查询报价单状态
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    select: {
      id: true,
      status: true
    }
  })

  // 报价单不存在
  if (!quotation) {
    return {
      canGenerate: false,
      currentStatus: 'draft',
      error: '报价单不存在'
    }
  }

  const status = quotation.status as QuotationStatus
  const config = QUOTATION_STATUS_CONFIG[status]

  // 验证是否可以生成PDF
  if (!config.canGeneratePDF) {
    return {
      canGenerate: false,
      currentStatus: status,
      error: config.message
    }
  }

  // 可以生成PDF
  return {
    canGenerate: true,
    currentStatus: status
  }
}
