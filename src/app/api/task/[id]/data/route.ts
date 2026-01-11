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

    // 提交后状态改为待审核，需要主管审核
    updateData.status = 'pending_review'
    updateData.progress = 90
    updateData.submittedAt = new Date()
    updateData.submittedBy = session.user.name || session.user.id
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

  return NextResponse.json({
    success: true,
    data: updatedTask,
    message: action === 'submit' ? '检测数据已提交，等待主管审核' : '数据保存成功'
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

