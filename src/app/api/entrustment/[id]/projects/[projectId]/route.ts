import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, notFound } from '@/lib/api-handler'

interface RouteParams {
  params: Promise<{ id: string; projectId: string }>
}

// 更新检测项目（分配/分包）
export const PUT = withErrorHandler(async (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
  const { params } = context!
  const { id: entrustmentId, projectId } = await params
  const data = await request.json()

  // 验证委托单存在
  const entrustment = await prisma.entrustment.findUnique({
    where: { id: entrustmentId },
    include: { projects: true }
  })

  if (!entrustment) {
    return notFound('委托单不存在')
  }

  // 验证检测项目存在
  const project = entrustment.projects.find((p: any) => p.id === projectId)
  if (!project) {
    return notFound('检测项目不存在')
  }

  // 更新检测项目
  const updatedProject = await prisma.entrustmentProject.update({
    where: { id: projectId },
    data: {
      status: data.status,
      assignTo: data.assignTo || null,
      subcontractor: data.subcontractor || null,
      subcontractAssignee: data.subcontractAssignee || null,
      deviceId: data.deviceId || null,
      deadline: data.deadline ? new Date(data.deadline) : null,
      assignDate: data.status === 'assigned' || data.status === 'subcontracted' ? new Date() : undefined,
    }
  })

  // 自动更新委托单主表状态
  const allProjects = await prisma.entrustmentProject.findMany({
    where: { entrustmentId },
    select: { status: true }
  })

  // 获取当前委托单状态
  const currentEntrustment = await prisma.entrustment.findUnique({
    where: { id: entrustmentId },
    select: { status: true }
  })

  let newEntrustmentStatus = currentEntrustment?.status

  // 1. 如果所有项目都完成，委托单状态变为 completed
  const allCompleted = allProjects.every(p => p.status === 'completed')
  if (allCompleted && allProjects.length > 0) {
    newEntrustmentStatus = 'completed'
  }
  // 2. 如果有项目被分配/分包，委托单状态变为 in_progress（进行中）
  else if (allProjects.some(p => p.status === 'assigned' || p.status === 'subcontracted' || p.status === 'completed')) {
    if (currentEntrustment?.status !== 'completed') {
      newEntrustmentStatus = 'in_progress'
    }
  }

  // 更新委托单状态（如果有变化）
  if (newEntrustmentStatus && newEntrustmentStatus !== currentEntrustment?.status) {
    await prisma.entrustment.update({
      where: { id: entrustmentId },
      data: { status: newEntrustmentStatus }
    })
  }

  // 如果指定了外包检测人员，自动创建/更新检测任务
  if (data.subcontractAssignee) {
    const user = await prisma.user.findFirst({
      where: { name: data.subcontractAssignee }
    })

    if (user) {
      // 检查任务是否存在
      const existingTask = await prisma.testTask.findFirst({
        where: { projectId: projectId }
      })

      const taskData = {
        taskNo: existingTask?.taskNo || `T${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        entrustmentId: entrustmentId,
        projectId: projectId,
        sampleId: null, // 关联样品ID如果需要可以查找
        sampleName: project.testItems, //以此作为简要描述
        assignedToId: user.id,
        isOutsourced: true,
        status: 'pending',
        plannedDate: new Date(),
        dueDate: data.deadline ? new Date(data.deadline) : undefined,
      }

      if (existingTask) {
        await prisma.testTask.update({
          where: { id: existingTask.id },
          data: taskData
        })
      } else {
        await prisma.testTask.create({
          data: taskData
        })
      }
    }
  }

  return success(updatedProject)
})

// 获取单个检测项目详情
export const GET = withErrorHandler(async (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
  const { params } = context!
  const { id: entrustmentId, projectId } = await params

  const project = await prisma.entrustmentProject.findFirst({
    where: {
      id: projectId,
      entrustmentId: entrustmentId
    }
  })

  if (!project) {
    return notFound('检测项目不存在')
  }

  return success(project)
})
