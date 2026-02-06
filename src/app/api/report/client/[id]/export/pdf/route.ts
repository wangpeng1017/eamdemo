
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, notFound } from '@/lib/api-handler'
import puppeteer from 'puppeteer'

/**
 * 导出客户报告为 PDF
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
      },
      tasks: {
        include: {
          task: {
            select: {
              taskNo: true,
              sampleName: true,
            }
          }
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
  const taskReportNos = report.taskReportNos ? JSON.parse(report.taskReportNos) : []

  // 构建 HTML 内容
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'SimSun', serif;
          font-size: 14px;
          line-height: 1.6;
          color: #333;
          padding: 20px;
        }

        .cover-page {
          text-align: center;
          padding: 100px 50px;
          page-break-after: always;
        }

        .cover-title {
          font-size: 32px;
          font-weight: bold;
          margin-bottom: 50px;
        }

        .cover-image {
          max-width: 400px;
          max-height: 300px;
          margin: 30px auto;
        }

        .cover-text {
          font-size: 16px;
          margin-top: 30px;
          white-space: pre-wrap;
        }

        .content-page {
          padding: 40px 50px;
        }

        .section {
          margin-bottom: 30px;
        }

        .section-title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 15px;
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
        }

        .info-row {
          display: flex;
          margin-bottom: 10px;
        }

        .info-label {
          width: 120px;
          font-weight: bold;
        }

        .info-value {
          flex: 1;
        }

        .back-cover-page {
          text-align: center;
          padding: 100px 50px;
          page-break-before: always;
        }

        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <!-- 封面 -->
      <div class="cover-page">
        ${coverData?.image ? `<img src="${coverData.image}" class="cover-image" alt="封面图片" />` : ''}
        <h1 class="cover-title">检测报告</h1>
        ${coverData?.text ? `<div class="cover-text">${coverData.text}</div>` : ''}
      </div>

      <!-- 内容页 -->
      <div class="content-page">
        <div class="section">
          <h2 class="section-title">基本信息</h2>
          <div class="info-row">
            <span class="info-label">报告编号：</span>
            <span class="info-value">${report.reportNo}</span>
          </div>
          <div class="info-row">
            <span class="info-label">客户名称：</span>
            <span class="info-value">${report.clientName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">客户地址：</span>
            <span class="info-value">${report.clientAddress || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">样品名称：</span>
            <span class="info-value">${report.sampleName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">样品编号：</span>
            <span class="info-value">${report.sampleNo || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">规格型号：</span>
            <span class="info-value">${report.specification || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">样品数量：</span>
            <span class="info-value">${report.sampleQuantity || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">检测项目：</span>
            <span class="info-value">${report.projectName || '-'}</span>
          </div>
        </div>

        ${report.overallConclusion ? `
        <div class="section">
          <h2 class="section-title">检测结论</h2>
          <p>${report.overallConclusion}</p>
        </div>
        ` : ''}

        <div class="section">
          <h2 class="section-title">编制信息</h2>
          <div class="info-row">
            <span class="info-label">编制人：</span>
            <span class="info-value">${report.preparer || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">审核人：</span>
            <span class="info-value">${report.reviewer || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">批准人：</span>
            <span class="info-value">${report.approver || '-'}</span>
          </div>
        </div>
      </div>

      <!-- 封底 -->
      <div class="back-cover-page">
        ${backCoverData?.image ? `<img src="${backCoverData.image}" class="cover-image" alt="封底图片" />` : ''}
        ${backCoverData?.text ? `<div class="cover-text">${backCoverData.text}</div>` : ''}
      </div>
    </body>
    </html>
  `

  // 使用 Puppeteer 生成 PDF
  let browser
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ]
    })

    const page = await browser.newPage()

    // 设置内容
    await page.setContent(html, {
      waitUntil: 'networkidle0',
    })

    // 生成 PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px',
      },
    })

    await browser.close()

    // 保存 PDF 文件（可选：上传到 OSS）
    // const fileUrl = await uploadToOSS(pdfBuffer, `${report.reportNo}.pdf`)
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
        exportFormat: 'pdf',
        fileUrl: fileUrl,
      }
    })

    // 返回 PDF 文件
    return new Response(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(report.reportNo)}.pdf"`,
      },
    })
  } catch (error) {
    if (browser) {
      await browser.close()
    }
    console.error('PDF 生成失败:', error)
    throw error
  }
})
