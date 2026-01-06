import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import {
  withErrorHandler,
  success,
  notFound,
  badRequest,
  validateRequired,
  validateEnum,
} from '@/lib/api-handler'

// 获取任务详情
export const GET = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<{ id: string }> }
) => {
  const { id } = await context!.params

  const task = await prisma.testTask.findUnique({
    where: { id },
    include: {
      sample: {
        select: {
          id: true,
          sampleNo: true,
          name: true,
          specification: true,
          status: true,
        },
      },
      device: {
        select: {
          id: true,
          deviceNo: true,
          name: true,
          status: true,
        },
      },
      assignedTo: {
        select: {
          id: true,
          name: true,
          username: true,
        },
      },
      testData: true,
      reports: {
        select: {
          id: true,
          reportNo: true,
          status: true,
        },
      },
    },
  })

  if (!task) {
    notFound('任务不存在')
  }

  return success(task)
})

// 更新任务
export const PUT = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<{ id: string }> }
) => {
  const { id } = await context!.params
  const data = await request.json()

  // 检查任务是否存在
  const existing = await prisma.testTask.findUnique({ where: { id } })
  if (!existing) {
    notFound('任务不存在')
  }

  // 构建更新数据
  const updateData: Record<string, unknown> = {}

  if (data.parameters !== undefined) updateData.parameters = data.parameters
  if (data.testMethod !== undefined) updateData.testMethod = data.testMethod
  if (data.deviceId !== undefined) updateData.deviceId = data.deviceId
  if (data.plannedDate !== undefined) updateData.plannedDate = new Date(data.plannedDate)
  if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate)
  if (data.progress !== undefined) updateData.progress = data.progress
  if (data.remark !== undefined) updateData.remark = data.remark

  const task = await prisma.testTask.update({
    where: { id },
    data: updateData,
    include: {
      sample: true,
      device: true,
      assignedTo: true,
    },
  })

  return success(task)
})

// 删除任务
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<{ id: string }> }
) => {
  const { id } = await context!.params

  // 检查任务是否存在
  const existing = await prisma.testTask.findUnique({ where: { id } })
  if (!existing) {
    notFound('任务不存在')
  }

  // 只有待开始状态才能删除
  if (existing.status !== 'pending') {
    badRequest('只有待开始状态的任务可以删除')
  }

  await prisma.testTask.delete({ where: { id } })

  return success({ success: true })
})

/**
 * 任务操作：分配、转交、更新状态
 *
 * 支持的操作：
 * 1. assign - 分配任务给检测人员
 * 2. transfer - 转交任务给其他人员
 * 3. start - 开始任务（pending -> in_progress）
 * 4. complete - 完成任务（in_progress -> completed）
 * 5. updateProgress - 更新进度
 */
export const PATCH = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<{ id: string }> }
) => {
  const { id } = await context!.params
  const data = await request.json()

  // 验证必填字段
  validateRequired(data, ['action'])

  const action = validateEnum(
    data.action,
    ['assign', 'transfer', 'start', 'complete', 'updateProgress'] as const,
    'action'
  )

  // 获取当前任务
  const task = await prisma.testTask.findUnique({
    where: { id },
    include: { assignedTo: true },
  })

  if (!task) {
    notFound('任务不存在')
  }

  let updateData: Record<string, unknown> = {}

  switch (action) {
    case 'assign':
      // 分配任务
      validateRequired(data, ['assignedToId'])

      // 验证被分配人员存在
      const assignee = await prisma.user.findUnique({
        where: { id: data.assignedToId },
      })
      if (!assignee) {
        badRequest('被分配人员不存在')
      }

      updateData = {
        assignedToId: data.assignedToId,
        status: task.status === 'pending' ? 'pending' : task.status, // 保持原状态
      }

      if (data.deviceId) {
        updateData.deviceId = data.deviceId
      }
      if (data.plannedDate) {
        updateData.plannedDate = new Date(data.plannedDate)
      }
      if (data.dueDate) {
        updateData.dueDate = new Date(data.dueDate)
      }
      break

    case 'transfer':
      // 转交任务
      validateRequired(data, ['assignedToId'])

      if (!task.assignedToId) {
        badRequest('任务尚未分配，无法转交')
      }

      // 验证新接收人员存在
      const newAssignee = await prisma.user.findUnique({
        where: { id: data.assignedToId },
      })
      if (!newAssignee) {
        badRequest('接收人员不存在')
      }

      if (task.assignedToId === data.assignedToId) {
        badRequest('不能转交给当前负责人')
      }

      updateData = {
        assignedToId: data.assignedToId,
        remark: data.transferReason
          ? `${task.remark || ''}\n[转交] ${new Date().toLocaleString()}: ${data.transferReason}`
          : task.remark,
      }
      break

    case 'start':
      // 开始任务
      if (task.status !== 'pending') {
        badRequest(`当前状态 ${task.status} 不能执行开始操作`)
      }

      if (!task.assignedToId) {
        badRequest('任务尚未分配，无法开始')
      }

      updateData = {
        status: 'in_progress',
        progress: 10,
      }
      break

    case 'complete':
      // 完成任务
      if (task.status !== 'in_progress') {
        badRequest(`当前状态 ${task.status} 不能执行完成操作`)
      }

      updateData = {
        status: 'completed',
        progress: 100,
        actualDate: new Date(),
      }
      break

    case 'updateProgress':
      // 更新进度
      validateRequired(data, ['progress'])

      if (task.status !== 'in_progress') {
        badRequest('只有进行中的任务才能更新进度')
      }

      const progress = parseInt(data.progress)
      if (isNaN(progress) || progress < 0 || progress > 100) {
        badRequest('进度必须是 0-100 之间的数字')
      }

      updateData = {
        progress,
        // 如果进度达到 100，自动完成任务
        ...(progress === 100 && {
          status: 'completed',
          actualDate: new Date(),
        }),
      }
      break
  }

  const updated = await prisma.testTask.update({
    where: { id },
    data: updateData,
    include: {
      sample: true,
      device: true,
      assignedTo: {
        select: {
          id: true,
          name: true,
          username: true,
        },
      },
    },
  })

  return success(updated)
})
