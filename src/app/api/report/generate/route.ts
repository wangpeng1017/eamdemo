import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth, badRequest, notFound } from '@/lib/api-handler'
import { extractForTestReport } from '@/lib/sheet-extractor'

/**
 * 生成检测报告 - 需要登录
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  // 解析请求参数
  let taskId: string = ''
  let templateId: string | undefined = undefined
  let precautions: string | undefined = undefined
  let conclusion: string | undefined = undefined
  let testData: any = undefined

  try {
    const body = await request.json()
    taskId = body.taskId
    templateId = body.templateId
    precautions = body.precautions
    conclusion = body.conclusion
    testData = body.testData
  } catch (error) {
    badRequest('请求参数格式错误')
  }

  if (!taskId) {
    badRequest('缺少任务ID')
  }

  // 获取任务详情（包含 sheetData）
  let task: any
  try {
    task = await prisma.testTask.findUnique({
      where: { id: taskId },
      include: {
        sample: true,
        testData: true,
        assignedTo: {
          select: { name: true }
        },
        entrustmentProject: {
          select: { name: true, method: true }
        },
      },
    })
  } catch (error) {
    console.error('[报告生成] 查询任务失败:', error)
    return NextResponse.json({
      success: false,
      error: '查询任务信息失败'
    }, { status: 500 })
  }

  if (!task) {
    return NextResponse.json({
      success: false,
      error: '任务不存在'
    }, { status: 404 })
  }

  if (task.status !== 'completed') {
    return NextResponse.json({
      success: false,
      error: '只有已完成的任务才能生成报告'
    }, { status: 400 })
  }

  // 检查是否已生成过报告（每个任务只能生成一次）
  const existingReport = await prisma.testReport.findFirst({
    where: { taskId: task.id }
  })
  if (existingReport) {
    return NextResponse.json({
      success: false,
      error: `该任务已生成报告（${existingReport.reportNo}），不能重复生成`
    }, { status: 400 })
  }

  // 获取委托单信息
  let entrustment: any = null
  if (task.entrustmentId) {
    try {
      entrustment = await prisma.entrustment.findUnique({
        where: { id: task.entrustmentId },
        include: { client: true }
      })
    } catch (error) {
      console.error('[报告生成] 查询委托单失败:', error)
      // 委托单查询失败不影响报告生成，继续执行
    }
  }

  // 从 sheetData 提取检测数据（使用语义提取）
  const extractedTestData = extractForTestReport(task.sheetData)

  // 生成报告编号并创建报告（带重试机制防止竞态条件）
  const maxRetries = 3
  let report: any = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // 生成新的报告编号
      const today = new Date()
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')

      // 查询当天最后一个报告编号
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
        if (!isNaN(lastSeq)) {
          seq = lastSeq + 1
        }
      }

      const reportNo = `RPT-${dateStr}-${seq.toString().padStart(3, '0')}`

      // 确定最终数据：优先使用请求提供的，否则使用从 sheetData 提取的
      const finalConclusion = conclusion !== undefined ? conclusion : (task.conclusion || null)
      // BUG-2 修复：task.testData 是 Prisma 关联的 TestData[] 对象数组，
      // 需要提取纯数据字段（parameter, value, standard, result, remark），而非直接序列化整个 Prisma 对象
      const testDataFallback = Array.isArray(task.testData) && task.testData.length > 0
        ? task.testData.map((d: any) => ({
          id: d.id,
          parameter: d.parameter,
          value: d.value,
          standard: d.standard,
          result: d.result,
          remark: d.remark,
        }))
        : []
      const finalTestData = testData !== undefined
        ? JSON.stringify(testData)
        : (extractedTestData.length > 0 ? JSON.stringify(extractedTestData) : JSON.stringify(testDataFallback))

      // 尝试创建报告记录
      report = await prisma.testReport.create({
        data: {
          reportNo,
          taskId: task.id,
          entrustmentId: task.entrustmentId,
          clientName: entrustment?.client?.name,
          projectName: task.entrustmentProject?.name,
          standardName: task.entrustmentProject?.method,
          sampleNo: task.sample?.sampleNo,
          sampleName: task.sampleName,
          specification: task.sample?.specification,
          sampleQuantity: task.sample?.quantity,
          receivedDate: task.sample?.receiptDate,
          testParameters: task.parameters,
          testResults: finalTestData,
          overallConclusion: finalConclusion,
          precautions: precautions || null,
          tester: task.assignedTo?.name,
          status: 'draft',
        }
      })

      // 成功创建，跳出重试循环
      break

    } catch (error: any) {
      // 如果是唯一约束错误（编号冲突），重试
      if (error.code === 'P2002' && attempt < maxRetries - 1) {
        // 等待随机时间后重试（避免多个请求同时重试）
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100))
        continue
      }

      // 其他错误或达到最大重试次数
      console.error('[报告生成] 创建报告失败:', error)

      // 处理唯一约束错误
      if (error.code === 'P2002') {
        return NextResponse.json({
          success: false,
          error: '报告编号冲突，请重试'
        }, { status: 409 })
      }

      return NextResponse.json({
        success: false,
        error: '创建报告失败'
      }, { status: 500 })
    }
  }

  // BUG-3 修复：如果所有重试都失败但没有被 catch 分支 return，report 可能为 null
  if (!report) {
    return NextResponse.json({
      success: false,
      error: '报告创建失败，请重试'
    }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    data: report,
    message: '报告生成成功'
  })
})

