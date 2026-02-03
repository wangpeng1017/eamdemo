
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, notFound } from '@/lib/api-handler'
import { convertSchemaToPreviewData } from '@/lib/template-converter'
import { generateNo, NumberPrefixes } from '@/lib/generate-no'

interface RouteParams {
  params: Promise<{ id: string; projectId: string }>
}

/**
 * 根据模版 ID 生成初始 sheetData
 */
async function generateSheetDataFromTemplate(testTemplateId: string | null | undefined) {
  if (!testTemplateId) return null

  try {
    const template = await prisma.testTemplate.findUnique({
      where: { code: testTemplateId }
    })

    if (!template?.schema) return null

    const schema = typeof template.schema === 'string'
      ? JSON.parse(template.schema)
      : template.schema

    // 使用转换函数生成 Fortune-sheet 格式数据
    const sheetData = convertSchemaToPreviewData(schema)
    return JSON.stringify(sheetData)
  } catch (e) {
    console.error('生成模版数据失败:', e)
    return null
  }
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
      testTemplateId: data.testTemplateId || null, // 保存关联的模版ID
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

  // 如果指定了内部检测人员，自动创建/更新检测任务
  if (data.assignTo && data.status === 'assigned') {
    // 优先使用 assignToId，如果没有则按名称查找（兼容旧逻辑）
    let user = null
    if (data.assignToId) {
      user = await prisma.user.findUnique({
        where: { id: data.assignToId }
      })
    } else {
      user = await prisma.user.findFirst({
        where: { name: data.assignTo }
      })
    }

    if (user) {
      // 检查任务是否存在
      const existingTask = await prisma.testTask.findFirst({
        where: { projectId: projectId }
      })

      // 使用统一的编号生成函数，避免重复
      const taskNo = existingTask?.taskNo || await generateNo(NumberPrefixes.TASK, 3)

      // 生成初始 sheetData（如果关联了模版）
      const sheetData = await generateSheetDataFromTemplate(data.testTemplateId || updatedProject.testTemplateId)

      // 查找对应名称的样品，建立关联
      const matchedSample = await prisma.sample.findFirst({
        where: {
          entrustmentId: entrustmentId,
          name: project.name
        }
      })

      console.log(`[Project Assign] Linking task to sample: project="${project.name}" -> sampleId=${matchedSample?.id || 'null'}`)

      const taskData = {
        taskNo,
        entrustmentId: entrustmentId,
        projectId: projectId,
        sampleId: matchedSample?.id || null, // 明确关联样品ID
        sampleName: project.name, // 项目名称
        parameters: project.testItems, // 检测参数
        testMethod: project.method, // 检测方法
        deviceId: data.deviceId || null,
        assignedToId: user.id,
        isOutsourced: false,
        status: 'pending',
        plannedDate: new Date(),
        dueDate: data.deadline ? new Date(data.deadline) : undefined,
        ...(sheetData && { sheetData }), // 如果有模版数据，则添加
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

  // 如果指定了外包检测人员，自动创建/更新检测任务
  if (data.subcontractAssignee && data.status === 'subcontracted') {
    // 优先使用 subcontractAssigneeId，如果没有则按名称查找（兼容旧逻辑）
    let user = null
    if (data.subcontractAssigneeId) {
      user = await prisma.user.findUnique({
        where: { id: data.subcontractAssigneeId }
      })
    } else {
      user = await prisma.user.findFirst({
        where: { name: data.subcontractAssignee }
      })
    }

    if (user) {
      // 检查任务是否存在
      const existingTask = await prisma.testTask.findFirst({
        where: { projectId: projectId }
      })

      // 使用统一的编号生成函数，避免重复
      const taskNo = existingTask?.taskNo || await generateNo(NumberPrefixes.TASK, 3)

      // 生成初始 sheetData（如果关联了模版）
      const sheetData = await generateSheetDataFromTemplate(data.testTemplateId || updatedProject.testTemplateId)

      // 查找对应名称的样品，建立关联
      const matchedSample = await prisma.sample.findFirst({
        where: {
          entrustmentId: entrustmentId,
          name: project.name
        }
      })

      console.log(`[Project Outsource] Linking task to sample: project="${project.name}" -> sampleId=${matchedSample?.id || 'null'}`)

      const taskData = {
        taskNo,
        entrustmentId: entrustmentId,
        projectId: projectId,
        sampleId: matchedSample?.id || null, // 明确关联样品ID
        sampleName: project.name,
        parameters: project.testItems,
        testMethod: project.method,
        deviceId: data.deviceId || null,
        assignedToId: user.id,
        isOutsourced: true,
        status: 'pending',
        plannedDate: new Date(),
        dueDate: data.deadline ? new Date(data.deadline) : undefined,
        ...(sheetData && { sheetData }),
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
