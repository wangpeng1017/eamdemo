
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, notFound } from '@/lib/api-handler'
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, ImageRun, BorderStyle } from 'docx'
import { saveAs } from 'file-saver'

/**
 * 导出客户报告为 Word
 */
export const GET = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params

  // 获取报告数据
  const report = await prisma.clientReport.findUnique({
    where: { id },
    include: {
      template: {
        select: {
          name: true,
          fileUrl: true,
        }
      }
    }
  })

  if (!report) {
    notFound('客户报告不存在')
  }

  // 解析 JSON 字段
  const coverData = report.coverData ? JSON.parse(report.coverData) : null
  const backCoverData = report.backCoverData ? JSON.parse(report.backCoverData) : null

  // 创建 Word 文档
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // 封面
        new Paragraph({
          text: '检测报告',
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: {
            after: 400,
          }
        }),

        // 封面文字
        ...(coverData?.text ? [
          new Paragraph({
            children: [
              new TextRun({
                text: coverData.text,
                size: 24,
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
              after: 400,
            }
          })
        ] : []),

        // 分页
        new Paragraph({
          children: [],
          pageBreakBefore: true,
        }),

        // 基本信息
        new Paragraph({
          text: '基本信息',
          heading: HeadingLevel.HEADING_2,
          spacing: {
            before: 200,
            after: 200,
          }
        }),

        createInfoRow('报告编号：', report.reportNo),
        createInfoRow('客户名称：', report.clientName),
        createInfoRow('客户地址：', report.clientAddress || '-'),
        createInfoRow('样品名称：', report.sampleName),
        createInfoRow('样品编号：', report.sampleNo || '-'),
        createInfoRow('规格型号：', report.specification || '-'),
        createInfoRow('样品数量：', report.sampleQuantity || '-'),
        createInfoRow('检测项目：', report.projectName || '-'),

        // 检测结论
        ...(report.overallConclusion ? [
          new Paragraph({
            text: '检测结论',
            heading: HeadingLevel.HEADING_2,
            spacing: {
              before: 200,
              after: 200,
            }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: report.overallConclusion,
                size: 24,
              })
            ],
            spacing: {
              after: 200,
            }
          })
        ] : []),

        // 编制信息
        new Paragraph({
          text: '编制信息',
          heading: HeadingLevel.HEADING_2,
          spacing: {
            before: 200,
            after: 200,
          }
        }),

        createInfoRow('编制人：', report.preparer || '-'),
        createInfoRow('审核人：', report.reviewer || '-'),
        createInfoRow('批准人：', report.approver || '-'),

        // 分页（封底）
        new Paragraph({
          children: [],
          pageBreakBefore: true,
        }),

        // 封底文字
        ...(backCoverData?.text ? [
          new Paragraph({
            children: [
              new TextRun({
                text: backCoverData.text,
                size: 24,
              })
            ],
            alignment: AlignmentType.CENTER,
          })
        ] : []),
      ]
    }]
  })

  // 生成 Word 缓冲区
  const buffer = await Packer.toBuffer(doc)

  // 保存 Word 文件（可选：上传到 OSS）
  // const fileUrl = await uploadToOSS(buffer, `${report.reportNo}.docx`)
  const fileUrl = null

  // 创建生成历史记录
  const latestHistory = await prisma.clientReportHistory.findFirst({
    where: { clientReportId: id },
    orderBy: { version: 'desc' }
  })

  const newVersion = (latestHistory?.version || 0) + 1

  await prisma.clientReportHistory.create({
    data: {
      clientReportId: id,
      version: newVersion,
      generatedBy: 'system', // TODO: 从 session 获取用户信息
      snapshotData: JSON.stringify(report),
      exportFormat: 'word',
      fileUrl: fileUrl,
    }
  })

  // 返回 Word 文件
  return new Response(buffer as any, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(report.reportNo)}.docx"`,
    },
  })
})

// 辅助函数：创建信息行
function createInfoRow(label: string, value: string) {
  return new Paragraph({
    children: [
      new TextRun({
        text: label,
        bold: true,
        size: 24,
      }),
      new TextRun({
        text: value,
        size: 24,
      })
    ],
    spacing: {
      after: 150,
    }
  })
}
