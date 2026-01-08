/**
 * @file exportPDF.ts
 * @desc PDF 导出工具
 */

import { jsPDF } from 'jspdf'
import { message } from 'antd'

/**
 * 检测报告数据接口
 */
export interface TestReportData {
  reportNo: string
  sampleName: string
  sampleNo: string
  clientName: string
  testItems: Array<{
    name: string
    method: string
    standard: string
    result: string
    conclusion: string
  }>
  conclusion: string
  testDate: string
  tester: string
  auditor: string
  approver: string
}

/**
 * 导出检测报告为 PDF
 */
export async function exportReportPDF(data: TestReportData): Promise<void> {
  try {
    const doc = new jsPDF()

    // 字体设置（需要中文字体支持）
    doc.setFont('helvetica')

    let yPosition = 20
    const lineHeight = 10
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20

    // 标题
    doc.setFontSize(20)
    doc.text('Test Report', pageWidth / 2, yPosition, { align: 'center' })
    doc.setFontSize(14)
    doc.text('检测报告', pageWidth / 2, yPosition + 8, { align: 'center' })
    yPosition += 25

    // 报告编号
    doc.setFontSize(12)
    doc.text(`Report No: ${data.reportNo}`, margin, yPosition)
    yPosition += lineHeight

    // 基本信息
    doc.setFontSize(11)
    const basicInfo = [
      [`Sample Name: ${data.sampleName}`, `Sample No: ${data.sampleNo}`],
      [`Client: ${data.clientName}`, `Test Date: ${data.testDate}`],
    ]

    basicInfo.forEach(row => {
      doc.text(row[0], margin, yPosition)
      doc.text(row[1], pageWidth / 2 + 10, yPosition)
      yPosition += lineHeight
    })

    yPosition += 10

    // 检测项目表格
    doc.setFontSize(14)
    doc.text('Test Items / 检测项目', margin, yPosition)
    yPosition += 10

    // 表头
    const colWidths = [70, 50, 50, 30, 30]
    const headers = ['Item', 'Method', 'Standard', 'Result', 'Conclusion']
    const chineseHeaders = ['项目', '方法', '标准', '结果', '结论']

    doc.setFontSize(10)
    doc.setFillColor(200, 200, 200)
    doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 10, 'F')

    let xPos = margin
    headers.forEach((header, i) => {
      doc.text(header, xPos + 5, yPosition)
      if (chineseHeaders[i]) {
        doc.text(chineseHeaders[i], xPos + 5, yPosition + 5)
      }
      xPos += colWidths[i]
    })
    yPosition += 12

    // 检测项目数据
    doc.setFillColor(245, 245, 245)
    data.testItems.forEach((item, index) => {
      // 检查是否需要新页面
      if (yPosition > pageHeight - 40) {
        doc.addPage()
        yPosition = 20
      }

      // 斑马纹背景
      if (index % 2 === 1) {
        doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 10, 'F')
      }

      xPos = margin
      const values = [
        item.name,
        item.method || '-',
        item.standard || '-',
        item.result || '-',
        item.conclusion || '-',
      ]

      values.forEach((value, i) => {
        // 截断过长的文本
        const truncated = value.length > 10 ? value.substring(0, 9) + '...' : value
        doc.text(truncated, xPos + 5, yPosition)
        xPos += colWidths[i]
      })
      yPosition += 12
    })

    yPosition += 15

    // 检测结论
    doc.setFontSize(12)
    doc.text(`Conclusion: ${data.conclusion}`, margin, yPosition)
    yPosition += 8
    doc.setFontSize(11)
    const conclusionText =
      data.conclusion === 'qualified'
        ? 'Qualified / 合格'
        : data.conclusion === 'unqualified'
        ? 'Unqualified / 不合格'
        : 'Conditional / 条件合格'
    doc.text(conclusionText, margin, yPosition)
    yPosition += 15

    // 签名
    doc.setFontSize(11)
    const signatures = [
      [`Tester: ${data.tester}`, `Auditor: ${data.auditor}`],
      [`Approver: ${data.approver}`, `Date: ${new Date().toLocaleDateString()}`],
    ]

    signatures.forEach(row => {
      doc.text(row[0], margin, yPosition)
      doc.text(row[1], pageWidth / 2 + 10, yPosition)
      yPosition += lineHeight
    })

    // 保存
    doc.save(`Report-${data.reportNo}.pdf`)
    message.success('PDF 导出成功')
  } catch (error) {
    console.error('PDF 导出失败:', error)
    message.error('PDF 导出失败')
  }
}

/**
 * 简单的 PDF 导出（用于通用数据）
 */
export async function exportSimplePDF(
  title: string,
  data: Record<string, unknown>[],
  filename: string
): Promise<void> {
  try {
    const doc = new jsPDF()

    let yPosition = 20
    const lineHeight = 10
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20

    // 标题
    doc.setFontSize(16)
    doc.text(title, margin, yPosition)
    yPosition += 20

    // 数据
    doc.setFontSize(10)
    data.forEach((row, index) => {
      // 检查是否需要新页面
      if (yPosition > pageHeight - 30) {
        doc.addPage()
        yPosition = 20
      }

      Object.entries(row).forEach(([key, value]) => {
        const text = `${key}: ${value ?? '-'}`
        doc.text(text.substring(0, 80), margin, yPosition)
        yPosition += lineHeight

        if (yPosition > pageHeight - 30) {
          doc.addPage()
          yPosition = 20
        }
      })

      yPosition += 5
    })

    doc.save(`${filename}.pdf`)
    message.success('PDF 导出成功')
  } catch (error) {
    console.error('PDF 导出失败:', error)
    message.error('PDF 导出失败')
  }
}
