/**
 * @file generate-client-reports.ts
 * @desc 委托单自动生成客户报告编号的核心逻辑
 * @input 依赖: prisma, generate-no
 * @output 导出: generateClientReportsForEntrustment, GenerateClientReportsParams
 * @see PRD: docs/plans/2026-02-13-entrustment-report-no-design.md
 */

import { prisma } from '@/lib/prisma'
import { generateClientReportNo } from '@/lib/generate-no'

export type GenerateClientReportsParams = {
  entrustmentId: string
  reportGrouping: string | null
  reportCopies: number
  samples: Array<{ id: string; name: string }>
  projects: Array<{ id: string; name: string }>
  clientName: string
}

type CreatedReport = {
  id: string
  reportNo: string
  entrustmentId: string
  clientName: string
  sampleName: string
  sampleId: string | null
  entrustmentProjectId: string | null
  groupingType: string
  reportCopies: number
  projectName: string | null
  status: string
}

export async function generateClientReportsForEntrustment(
  params: GenerateClientReportsParams
): Promise<CreatedReport[]> {
  const {
    entrustmentId,
    reportGrouping,
    reportCopies,
    samples,
    projects,
    clientName,
  } = params

  // reportGrouping 为 null 或 undefined 时不生成
  if (!reportGrouping) {
    return []
  }

  const results: CreatedReport[] = []

  if (reportGrouping === 'by_sample') {
    if (samples.length === 0) return []

    for (const sample of samples) {
      const reportNo = await generateClientReportNo()
      const record = await prisma.clientReport.create({
        data: {
          reportNo,
          entrustmentId,
          clientName,
          sampleName: sample.name,
          sampleId: sample.id,
          entrustmentProjectId: null,
          groupingType: 'by_sample',
          reportCopies,
          status: 'draft',
        },
      })
      results.push(record as unknown as CreatedReport)
    }
  } else if (reportGrouping === 'by_project') {
    if (projects.length === 0) return []

    for (const project of projects) {
      const reportNo = await generateClientReportNo()
      const record = await prisma.clientReport.create({
        data: {
          reportNo,
          entrustmentId,
          clientName,
          sampleName: project.name,
          projectName: project.name,
          sampleId: null,
          entrustmentProjectId: project.id,
          groupingType: 'by_project',
          reportCopies,
          status: 'draft',
        },
      })
      results.push(record as unknown as CreatedReport)
    }
  } else if (reportGrouping === 'merged') {
    const reportNo = await generateClientReportNo()
    const record = await prisma.clientReport.create({
      data: {
        reportNo,
        entrustmentId,
        clientName,
        sampleName: clientName,
        sampleId: null,
        entrustmentProjectId: null,
        groupingType: 'merged',
        reportCopies,
        status: 'draft',
      },
    })
    results.push(record as unknown as CreatedReport)
  }

  return results
}
