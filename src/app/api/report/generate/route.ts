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

  const { taskId } = await request.json()

  if (!taskId) {
    return NextResponse.json({ error: '缺少任务ID' }, { status: 400 })
  }

  // 获取任务详情
  const task = await prisma.testTask.findUnique({
    where: { id: taskId },
    include: {
      sample: true,
      testData: true,  // 🔥 关键：获取结构化数据
      assignedTo: { select: { name: true } },
    },
    // 注意：include 和 select 不能同时使用，所以我们用 include 获取关联，字段会自动包含
  })

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
      testParameters: task.parameters,  // JSON 字符串
      testResults: JSON.stringify(task.testData),  // 🔥 使用 TestData
      overallConclusion: (task as any).conclusion || null,  // 使用类型断言
      tester: task.assignedTo?.name,
      status: 'draft',
    }
  })

  return NextResponse.json({
    success: true,
    data: report,
    message: '报告生成成功'
  })
}
