import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

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
  const { sheetData, action = 'save', summary, conclusion } = body

  // 获取任务信息
  const task = await prisma.testTask.findUnique({
    where: { id },
    select: { id: true, status: true, projectId: true, entrustmentId: true }
  })

  if (!task) {
    return NextResponse.json({ error: '任务不存在' }, { status: 404 })
  }

  // 构建更新数据
  const updateData: any = {
    testData: sheetData || {},
  }

  if (summary) updateData.summary = summary
  if (conclusion) updateData.conclusion = conclusion

  // 根据 action 处理
  if (action === 'submit') {
    // 提交前校验
    if (!conclusion) {
      return NextResponse.json({ error: '提交时必须填写检测结论' }, { status: 400 })
    }

    // 更新任务状态为完成
    updateData.status = 'completed'
    updateData.progress = 100
    updateData.completedAt = new Date()
  } else if (action === 'save') {
    // 保存时自动设置进行中状态
    if (task.status === 'pending') {
      updateData.status = 'in_progress'
      updateData.progress = 50
    }
  }

  // 保存任务数据
  const updatedTask = await prisma.testTask.update({
    where: { id },
    data: updateData,
  })

  // 如果是提交操作，触发级联状态更新
  if (action === 'submit' && task.projectId) {
    // 1. 更新关联的 EntrustmentProject 状态为 completed
    await prisma.entrustmentProject.update({
      where: { id: task.projectId },
      data: { status: 'completed' }
    })

    // 2. 检查所有项目是否完成，更新 Entrustment 状态
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
    data: updatedTask,
    message: action === 'submit' ? '检测数据已提交，任务完成' : '数据保存成功'
  })
}
