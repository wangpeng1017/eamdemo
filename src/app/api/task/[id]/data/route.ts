import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { extractForTestReport } from '@/lib/sheet-extractor'

// 从 Fortune-sheet 数据中提取单元格值
function getCellValue(celldata: any[], row: number, col: number): string {
  const cell = celldata.find((c: any) => c.r === row && c.c === col)
  return cell?.v?.v?.toString() || ''
}

// 解析 sheetData 并生成 TestData 记录
function parseSheetDataToTestData(sheetData: any[], taskId: string) {
  if (!sheetData || sheetData.length === 0) {
    return []
  }

  const sheet = sheetData[0]
  const celldata = sheet.celldata || []

  // 找出最大行号
  let maxRow = 0
  celldata.forEach((cell: any) => {
    if (cell.r > maxRow) maxRow = cell.r
  })

  const testDataRecords = []

  // 从第 1 行开始（第 0 行是表头）
  // 表格结构：A=检测项目, B=检测方法, C=技术要求, D=实测值, E=单项判定, F=备注
  for (let r = 1; r <= maxRow; r++) {
    const parameter = getCellValue(celldata, r, 0) // A列：检测项目

    // 如果检测项目为空，跳过该行
    if (!parameter || parameter.trim() === '') {
      continue
    }

    const value = getCellValue(celldata, r, 3)      // D列：实测值
    const standard = getCellValue(celldata, r, 2)   // C列：技术要求
    const result = getCellValue(celldata, r, 4)     // E列：单项判定
    const remark = getCellValue(celldata, r, 5)     // F列：备注

    testDataRecords.push({
      taskId,
      parameter,
      value: value || null,
      unit: null,  // 如果需要单位，可以从其他列提取或从参数名解析
      standard: standard || null,
      result: result || null,
      remark: remark || null,
    })
  }

  return testDataRecords
}

// 保存/提交测试数据
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const body = await request.json()
  const { id } = await params
  const { sheetData, metadata, action = 'save', summary, conclusion } = body

  console.log('[Task Data POST] taskId:', id)
  console.log('[Task Data POST] action:', action)
  console.log('[Task Data POST] sheetData type:', typeof sheetData)
  console.log('[Task Data POST] sheetData isArray:', Array.isArray(sheetData))
  if (sheetData && sheetData[0]) {
    console.log('[Task Data POST] sheetData[0].celldata length:', sheetData[0].celldata?.length)
    console.log('[Task Data POST] sheetData[0].celldata (first 3):', JSON.stringify(sheetData[0].celldata?.slice(0, 3)))
  }

  // 获取任务信息
  const task = await prisma.testTask.findUnique({
    where: { id },
    select: { id: true, status: true, projectId: true, entrustmentId: true }
  })

  if (!task) {
    return NextResponse.json({ error: '任务不存在' }, { status: 404 })
  }

  // 构建更新数据
  const sheetDataString = typeof sheetData === 'object' ? JSON.stringify(sheetData) : sheetData
  console.log('[Task Data POST] sheetDataString length:', sheetDataString?.length)
  console.log('[Task Data POST] sheetDataString (first 300 chars):', sheetDataString?.substring(0, 300))

  const updateData: any = {
    sheetData: sheetDataString,
  }

  if (summary) updateData.summary = summary
  if (conclusion) updateData.conclusion = conclusion
  if (metadata !== undefined) {
    updateData.metadata = typeof metadata === 'object' ? JSON.stringify(metadata) : metadata
  }

  // 根据 action 处理
  if (action === 'submit') {
    // 提交后直接完成任务（无需审核）
    updateData.status = 'completed'
    updateData.progress = 100
    updateData.actualDate = new Date()
    updateData.submittedAt = new Date()
    updateData.submittedBy = session.user.name || session.user.id
  } else if (action === 'save') {
    // 保存时自动设置进行中状态
    if (task.status === 'pending') {
      updateData.status = 'in_progress'
    }
  }

  // 临时：如果 schema 中没有 summary/conclusion，将其存入 remark 或 sheetData 中
  // 这里假设我们稍后会运行 schema 更新脚本添加这些字段
  // 如果脚本执行失败，这里可能会再次报错。安全起见，我们把它们合并到 remark 中作为后备

  // 保存任务数据
  const updatedTask = await prisma.testTask.update({
    where: { id },
    data: updateData,
  })

  // 问题-1 修复：submit 完成后级联更新项目和委托单状态
  if (action === 'submit' && task.projectId) {
    try {
      await prisma.entrustmentProject.update({
        where: { id: task.projectId },
        data: { status: 'completed' }
      })

      if (task.entrustmentId) {
        const allProjects = await prisma.entrustmentProject.findMany({
          where: { entrustmentId: task.entrustmentId },
          select: { status: true }
        })

        const allCompleted = allProjects.every(p => p.status === 'completed')

        if (allCompleted && allProjects.length > 0) {
          await prisma.entrustment.update({
            where: { id: task.entrustmentId },
            data: { status: 'completed' }
          })
        }
      }
    } catch (cascadeError) {
      console.error('级联更新委托单状态失败:', cascadeError)
      // 不阻断主流程
    }
  }

  // 🔥 同步更新 TestData 表（使用语义提取）
  if (sheetData) {
    try {
      const sheetDataStr = typeof sheetData === 'string' ? sheetData : JSON.stringify(sheetData)
      const testDataRecords = extractForTestReport(sheetDataStr)

      // 先删除旧数据
      await prisma.testData.deleteMany({
        where: { taskId: id }
      })

      // 插入新数据
      if (testDataRecords.length > 0) {
        await prisma.testData.createMany({
          data: testDataRecords.map(r => ({
            taskId: id,
            parameter: r.parameter,
            value: r.value,
            standard: r.standard,
            result: r.result,
            remark: r.remark,
          }))
        })
        console.log(`✅ 同步 TestData 成功：${testDataRecords.length} 条记录`)
      } else {
        console.log('ℹ️ 没有检测数据需要同步')
      }
    } catch (error) {
      console.error('❌ 同步 TestData 失败:', error)
      // 不阻断主流程，仅记录错误
    }
  }

  return NextResponse.json({
    success: true,
    data: updatedTask,
    message: action === 'submit' ? '检测数据已提交，任务已完成' : '数据保存成功'
  })
}

// 审核数据（主管用）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const body = await request.json()
  const { id } = await params
  const { action, reviewComment } = body

  // 获取任务信息
  const task = await prisma.testTask.findUnique({
    where: { id },
    select: { id: true, status: true, projectId: true, entrustmentId: true, remark: true }
  })

  if (!task) {
    return NextResponse.json({ error: '任务不存在' }, { status: 404 })
  }

  if (task.status !== 'pending_review') {
    return NextResponse.json({ error: '只有待审核状态的任务才能审核' }, { status: 400 })
  }

  if (action === 'approve') {
    // 审核通过，任务完成
    await prisma.testTask.update({
      where: { id },
      data: {
        status: 'completed',
        progress: 100,
        actualDate: new Date(),
        remark: task.remark
          ? `${task.remark}\n[审核通过] ${new Date().toLocaleString()} by ${session.user.name}: ${reviewComment || ''}`
          : `[审核通过] ${new Date().toLocaleString()} by ${session.user.name}: ${reviewComment || ''}`
      }
    })

    // 级联更新项目和委托单状态
    if (task.projectId) {
      await prisma.entrustmentProject.update({
        where: { id: task.projectId },
        data: { status: 'completed' }
      })

      if (task.entrustmentId) {
        const allProjects = await prisma.entrustmentProject.findMany({
          where: { entrustmentId: task.entrustmentId },
          select: { status: true }
        })

        const allCompleted = allProjects.every(p => p.status === 'completed')

        if (allCompleted && allProjects.length > 0) {
          await prisma.entrustment.update({
            where: { id: task.entrustmentId },
            data: { status: 'completed' }
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: '审核通过，任务已完成'
    })

  } else if (action === 'reject') {
    // 审核驳回，退回修改
    await prisma.testTask.update({
      where: { id },
      data: {
        status: 'in_progress',
        progress: 50,
        remark: task.remark
          ? `${task.remark}\n[审核驳回] ${new Date().toLocaleString()} by ${session.user.name}: ${reviewComment || '请修改后重新提交'}`
          : `[审核驳回] ${new Date().toLocaleString()} by ${session.user.name}: ${reviewComment || '请修改后重新提交'}`
      }
    })

    return NextResponse.json({
      success: true,
      message: '已驳回，请检测人员修改后重新提交'
    })

  } else {
    return NextResponse.json({ error: '无效的操作' }, { status: 400 })
  }
}

