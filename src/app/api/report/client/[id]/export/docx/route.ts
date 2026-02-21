import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, notFound } from '@/lib/api-handler'
import { renderDocx, prepareClientReportData } from '@/lib/docx-renderer'

/**
 * 导出客户报告为 Word（使用 docxtemplater 模板渲染）
 * 优先使用 ReportTemplate.fileUrl 中配置的模板，
 * 回退默认使用 public/templates/qct-client-report.docx
 */
export const GET = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params

  // 获取报告数据及关联信息
  const report = await prisma.clientReport.findUnique({
    where: { id },
    include: {
      template: {
        select: {
          name: true,
          fileUrl: true,
        }
      },
      // 获取关联的任务报告及其任务数据
      tasks: {
        include: {
          task: {
            include: {
              sample: true,
              assignedTo: { select: { name: true } },
              testData: true,
              entrustmentProject: {
                select: {
                  entrustmentId: true,
                }
              }
            }
          }
        }
      }
    }
  })

  if (!report) {
    notFound('客户报告不存在')
  }

  // 加载委托单信息
  let entrustment = null
  if (report.entrustmentId) {
    entrustment = await prisma.entrustment.findUnique({
      where: { id: report.entrustmentId },
      include: { client: true },
    })
  }

  // 获取第一个关联任务（用于数据准备）
  const firstTaskReport = report.tasks?.[0]
  const task = firstTaskReport?.task || null
  const sample = task?.sample || null

  // 使用 docx-renderer 准备数据
  const data = prepareClientReportData(task, entrustment, sample, report)

  // 用 ClientReport 自身字段覆盖/补充（比 task 级别更准确）
  data.reportNo = report.reportNo
  data.clientName = report.clientName
  data.clientAddress = report.clientAddress || data.clientAddress || ''
  data.sampleName = report.sampleName
  data.sampleNo = report.sampleNo || data.sampleNo || ''
  data.specification = report.specification || data.specification || ''
  data.sampleQuantity = report.sampleQuantity || data.sampleQuantity || ''
  data.preparer = report.preparer || data.preparer || ''
  data.reviewer = report.reviewer || ''
  data.approver = report.approver || ''
  data.overallConclusion = report.overallConclusion || ''
  data.projectName = report.projectName || ''

  // 检测项目和依据
  if (report.testItems) {
    try {
      data.testItems = JSON.parse(report.testItems).join('、')
    } catch { /* 忽略解析错误 */ }
  }
  if (report.testStandards) {
    try {
      data.testStandards = JSON.parse(report.testStandards).join('、')
    } catch { /* 忽略解析错误 */ }
  }

  // 日期字段
  data.receivedDate = report.receivedDate
    ? new Date(report.receivedDate).toLocaleDateString('zh-CN')
    : data.receivedDate || ''
  data.issuedDate = report.issuedDate
    ? new Date(report.issuedDate).toLocaleDateString('zh-CN')
    : ''
  data.reportDate = new Date(report.createdAt).toLocaleDateString('zh-CN')

  // 确定模板文件路径（优先使用 ReportTemplate 配置，回退默认模板）
  const templateFile = report.template?.fileUrl || 'qct-client-report.docx'

  // 渲染 docx
  const buffer = renderDocx(templateFile, data)

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
      fileUrl: null,
    }
  })

  // 返回 Word 文件
  const filename = encodeURIComponent(`${report.reportNo}.docx`)
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${filename}`,
    },
  })
})
