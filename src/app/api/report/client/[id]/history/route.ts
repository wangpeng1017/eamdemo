
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, notFound } from '@/lib/api-handler'

/**
 * 获取客户报告的生成历史
 */
export const GET = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params

  // 检查报告是否存在
  const report = await prisma.clientReport.findUnique({
    where: { id },
  })

  if (!report) {
    notFound('客户报告不存在')
  }

  // 获取生成历史
  const history = await prisma.clientReportHistory.findMany({
    where: { clientReportId: id },
    orderBy: { version: 'desc' },
  })

  // 解析快照数据
  const formattedHistory = history.map(item => ({
    ...item,
    snapshotData: item.snapshotData ? JSON.parse(item.snapshotData) : null,
  }))

  return success({
    clientReport: report,
    history: formattedHistory,
    total: formattedHistory.length,
  })
})
