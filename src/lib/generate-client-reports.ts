/**
 * @file generate-client-reports.ts
 * @desc 委托单自动生成客户报告编号的核心逻辑
 * @input 依赖: prisma, generate-no
 * @output 导出: generateClientReportsForEntrustment, GenerateClientReportsParams
 * @see PRD: docs/plans/2026-02-13-entrustment-report-no-design.md
 */

import { prisma } from '@/lib/prisma'
import { generateClientReportNo, generateClientReportSubNo } from '@/lib/generate-no'

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

  // 提前检查是否有数据需要生成，避免浪费编号
  if (reportGrouping === 'by_sample' && samples.length === 0) return []
  if (reportGrouping === 'by_project' && projects.length === 0) return []

  // 查询委托单补充信息（客户地址、报告截止日期）
  const entrustment = await prisma.entrustment.findUnique({
    where: { id: entrustmentId },
    select: {
      clientAddress: true,
      clientReportDeadline: true,
      sampleDate: true,
    },
  })

  // 查询样品详细信息（编号、规格等）
  const sampleIds = samples.map(s => s.id)
  const sampleDetails = sampleIds.length > 0
    ? await prisma.sample.findMany({
      where: { id: { in: sampleIds } },
      select: { id: true, sampleNo: true, specification: true, quantity: true },
    })
    : []
  const sampleDetailMap = new Map(sampleDetails.map(s => [s.id, s]))

  const results: CreatedReport[] = []

  // 生成一个基础编号，同一委托单下的所有报告共享基础编号
  const baseNo = await generateClientReportNo()
  let subIndex = 0

  if (reportGrouping === 'by_sample') {
    for (const sample of samples) {
      subIndex++
      const reportNo = generateClientReportSubNo(baseNo, subIndex)
      const detail = sampleDetailMap.get(sample.id)
      const record = await prisma.clientReport.create({
        data: {
          reportNo,
          entrustmentId,
          clientName,
          clientAddress: entrustment?.clientAddress || null,
          sampleName: sample.name,
          sampleNo: detail?.sampleNo || null,
          specification: detail?.specification || null,
          sampleQuantity: detail?.quantity || null,
          receivedDate: entrustment?.sampleDate || null,
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
    for (const project of projects) {
      subIndex++
      const reportNo = generateClientReportSubNo(baseNo, subIndex)
      const record = await prisma.clientReport.create({
        data: {
          reportNo,
          entrustmentId,
          clientName,
          clientAddress: entrustment?.clientAddress || null,
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
    const reportNo = generateClientReportSubNo(baseNo, 1)
    const record = await prisma.clientReport.create({
      data: {
        reportNo,
        entrustmentId,
        clientName,
        clientAddress: entrustment?.clientAddress || null,
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

