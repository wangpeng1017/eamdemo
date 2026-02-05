import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// 生成报告编号
async function generateReportNo(): Promise<string> {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')

  const lastReport = await prisma.testReport.findFirst({
    where: {
      reportNo: {
        startsWith: `RPT-${dateStr}`
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  let seq = 1
  if (lastReport) {
    const lastSeq = parseInt(lastReport.reportNo.split('-')[2])
    seq = lastSeq + 1
  }

  return `RPT-${dateStr}-${seq.toString().padStart(3, '0')}`
}

// 生成检测报告
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const { taskId, templateId, precautions, conclusion, testData } = await request.json()

  if (!taskId) {
    return NextResponse.json({ error: '缺少任务ID' }, { status: 400 })
  }

  // 获取任务详情
  const task = await prisma.testTask.findUnique({
    where: { id: taskId },
    include: {
      sample: true,
      testData: true,
      assignedTo: { select: { name: true } },
    },
  })

  // ... (validation checks remain same) ...

  if (!task) {
    return NextResponse.json({ error: '任务不存在' }, { status: 404 })
  }

  if (task.status !== 'completed') {
    return NextResponse.json({ error: '只有已完成的任务才能生成报告' }, { status: 400 })
  }

  // 获取委托单信息
  let entrustment = null
  if (task.entrustmentId) {
    entrustment = await prisma.entrustment.findUnique({
      where: { id: task.entrustmentId },
      include: { client: true }
    })
  }

  // 生成报告编号
  const reportNo = await generateReportNo()

  // 确定最终数据 (优先使用前端提交的编辑数据，否则使用任务原始数据)
  const finalConclusion = conclusion !== undefined ? conclusion : ((task as any).conclusion || null)
  const finalTestData = testData !== undefined ? JSON.stringify(testData) : JSON.stringify(task.testData)

  // 创建报告记录
  const report = await prisma.testReport.create({
    data: {
      reportNo,
      taskId: task.id,
      entrustmentId: task.entrustmentId,
      clientName: entrustment?.client?.name,
      sampleNo: task.sample?.sampleNo,
      sampleName: task.sampleName,
      specification: task.sample?.specification,
      sampleQuantity: task.sample?.quantity,
      receivedDate: task.sample?.receiptDate,
      testParameters: task.parameters,
      testResults: finalTestData,
      overallConclusion: finalConclusion,
      precautions: precautions || null, // 需求7：写入注意事项
      tester: task.assignedTo?.name,
      status: 'draft',
      // (Optionally link templateId if TestReport model has it, but schema update added templateId to ClientReport. 
      // TestReport doesn't seem to have templateId in my update? 
      // Wait, user usually selects template for generation. 
      // If TestReport needs to know which template to use for "Printing", we might need to store it or pass it during print.
      // Usually TestReport is just data. The "Client Report" has a template. 
      // Individual Task Report printing might use a default template or selected one.
      // Current `exportReportPDF` likely uses a default layout.
      // If we want to persist the choice, we need a field.
      // Check TestReport schema again? I didn't add templateId to TestReport.
      // But page.tsx passes `templateId`. 
      // I should likely store it if I want to use it later, OR just ignore it if current PDF logic doesn't use DB stored template.)
      // For now, I'll ignore templateId storage unless I add the field. 
      // The requirement focuses on "Client Report" template.
    }
  })

  return NextResponse.json({
    success: true,
    data: report,
    message: '报告生成成功'
  })
}
