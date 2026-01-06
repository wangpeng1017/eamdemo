import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, notFound } from '@/lib/api-handler'

interface RouteParams {
  params: Promise<{ id: string; projectId: string }>
}

// 更新检测项目（分配/分包）
export const PUT = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
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
  const project = entrustment.projects.find(p => p.id === projectId)
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

  return success(updatedProject)
})

// 获取单个检测项目详情
export const GET = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
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
