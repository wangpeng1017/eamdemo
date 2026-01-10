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
  // 2. 如果有项目被分配/分包但不是全部完成，委托单状态变为 testing
  else if (allProjects.some(p => p.status === 'assigned' || p.status === 'subcontracted')) {
    if (currentEntrustment?.status !== 'completed') {
      newEntrustmentStatus = 'testing'
    }
  }
  // 3. 如果委托单还是 pending 且有项目被分配，变为 accepted
  else if (currentEntrustment?.status === 'pending' &&
    allProjects.some(p => p.status !== 'pending')) {
    newEntrustmentStatus = 'accepted'
  }

  // 更新委托单状态（如果有变化）
  if (newEntrustmentStatus && newEntrustmentStatus !== currentEntrustment?.status) {
    await prisma.entrustment.update({
      where: { id: entrustmentId },
      data: { status: newEntrustmentStatus }
    })
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
