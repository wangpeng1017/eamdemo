import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// 生成检测报告
export async function POST(request: NextRequest) {
  const { taskId, templateId } = await request.json()

  // 获取任务信息
  const task = await prisma.testTask.findUnique({
    where: { id: taskId },
    include: {
      sample: true,
      device: true,
      assignedTo: true,
    }
  })

  if (!task) {
    return NextResponse.json({ error: '任务不存在' }, { status: 404 })
  }

  // 获取模板信息
  const template = await prisma.reportTemplate.findUnique({
    where: { id: templateId }
  })

  // 生成报告编号
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const count = await prisma.clientReport.count({
    where: { reportNo: { startsWith: 'R' + today } }
  })
  const reportNo = 'R' + today + String(count + 1).padStart(4, '0')

  // 创建报告记录
  const report = await prisma.clientReport.create({
    data: {
      reportNo,
      projectName: task.sampleName || '检测报告',
      clientName: '客户',
      sampleName: task.sampleName || '',
      sampleNo: task.sample?.sampleNo || '',
      receivedDate: task.sample?.receiptDate,
      testItems: task.parameters ? JSON.stringify([task.parameters]) : null,
      overallConclusion: '检测完成，结果符合标准要求。',
      preparer: task.assignedTo?.name || '检测员',
      status: 'draft',
    }
  })

  return NextResponse.json(report)
}
