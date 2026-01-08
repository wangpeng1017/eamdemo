/**
 * @file exportContractPDF.ts
 * @desc 委托合同 PDF 导出工具
 */

import { jsPDF } from 'jspdf'
import { message } from 'antd'
import dayjs from 'dayjs'

export interface ContractData {
  contractNo: string
  partyACompany: string | null
  partyAContact: string | null
  partyATel: string | null
  partyAAddress: string | null
  contractAmount: number | null
  prepaymentRatio: number | null
  prepaymentAmount: number | null
  signDate: string | null
  startDate: string | null
  endDate: string | null
  termsPaymentTerms: string | null
  termsDeliveryTerms: string | null
  termsQualityTerms: string | null
  termsConfidentialityTerms: string | null
  termsLiabilityTerms: string | null
  termsDisputeResolution: string | null
}

/**
 * 导出委托合同为 PDF
 */
export async function exportContractPDF(data: ContractData): Promise<void> {
  try {
    const doc = new jsPDF()

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    const lineHeight = 10

    // 标题
    doc.setFontSize(20)
    doc.text('检测服务合同', pageWidth / 2, 20, { align: 'center' })

    let yPosition = 40

    // 合同编号
    doc.setFontSize(12)
    doc.text(`合同编号: ${data.contractNo}`, margin, yPosition)
    yPosition += lineHeight * 2

    // 甲方信息
    doc.setFontSize(14)
    doc.text('甲方（委托方）：', margin, yPosition)
    yPosition += lineHeight
    doc.setFontSize(11)
    doc.text(`公司名称: ${data.partyACompany || '-'}`, margin, yPosition)
    yPosition += lineHeight
    doc.text(`联系人: ${data.partyAContact || '-'}`, margin, yPosition)
    yPosition += lineHeight
    doc.text(`联系电话: ${data.partyATel || '-'}`, margin, yPosition)
    yPosition += lineHeight
    doc.text(`地址: ${data.partyAAddress || '-'}`, margin, yPosition)
    yPosition += lineHeight * 2

    // 乙方信息
    doc.setFontSize(14)
    doc.text('乙方（受托方）：', margin, yPosition)
    yPosition += lineHeight
    doc.setFontSize(11)
    doc.text('公司名称: 江苏国轻检测技术有限公司', margin, yPosition)
    yPosition += lineHeight
    doc.text('联系人: 检测中心', margin, yPosition)
    yPosition += lineHeight
    doc.text('联系电话: 400-123-4567', margin, yPosition)
    yPosition += lineHeight * 2

    // 合同金额
    doc.setFontSize(12)
    doc.text(`合同金额: ¥${data.contractAmount?.toLocaleString() || '0.00'}`, margin, yPosition)
    yPosition += lineHeight
    doc.text(`预付款比例: ${data.prepaymentRatio || 0}%`, margin, yPosition)
    yPosition += lineHeight
    doc.text(`预付款金额: ¥${data.prepaymentAmount?.toLocaleString() || '0.00'}`, margin, yPosition)
    yPosition += lineHeight * 2

    // 合同期限
    doc.text(`签订日期: ${data.signDate ? dayjs(data.signDate).format('YYYY-MM-DD') : '-'}`, margin, yPosition)
    yPosition += lineHeight
    const startDate = data.startDate ? dayjs(data.startDate).format('YYYY-MM-DD') : '-'
    const endDate = data.endDate ? dayjs(data.endDate).format('YYYY-MM-DD') : '-'
    doc.text(`合同期限: ${startDate} 至 ${endDate}`, margin, yPosition)
    yPosition += lineHeight * 2

    // 合同条款
    const terms = [
      { title: '付款条款', content: data.termsPaymentTerms },
      { title: '交付条款', content: data.termsDeliveryTerms },
      { title: '质量条款', content: data.termsQualityTerms },
      { title: '保密条款', content: data.termsConfidentialityTerms },
      { title: '违约责任', content: data.termsLiabilityTerms },
      { title: '争议解决', content: data.termsDisputeResolution },
    ]

    terms.forEach((term) => {
      if (term.content) {
        // 检查是否需要新页面
        if (yPosition > pageHeight - 60) {
          doc.addPage()
          yPosition = 20
        }

        doc.setFontSize(13)
        doc.text(`${term.title}:`, margin, yPosition)
        yPosition += lineHeight

        doc.setFontSize(10)
        const lines = doc.splitTextToSize(term.content, pageWidth - 2 * margin)
        doc.text(lines, margin, yPosition)
        yPosition += lines.length * 5 + 10
      }
    })

    // 保存
    doc.save(`合同-${data.contractNo}.pdf`)
    message.success('PDF 导出成功')
  } catch (error) {
    console.error('PDF 导出失败:', error)
    message.error('PDF 导出失败')
  }
}
