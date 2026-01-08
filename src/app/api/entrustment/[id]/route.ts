import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, notFound } from '@/lib/api-handler'

interface RouteParams {
  params: Promise<{ id: string }>
}

// 获取单个委托单详情
export const GET = withErrorHandler(async (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
  const { params } = context!
  const { id } = await params
  const entrustment = await prisma.entrustment.findUnique({
    where: { id },
    include: {
      client: true,
      contract: true,
      projects: true,
      samples: true,
    }
  })

  if (!entrustment) {
    return notFound('委托单不存在')
  }

  return success(entrustment)
})

// 更新委托单（含检测项目）
export const PUT = withErrorHandler(async (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
  const { params } = context!
  const { id } = await params
  const data = await request.json()

  // 分离检测项目数据
  const { projects, ...entrustmentData } = data

  // 更新委托单基本信息
  const entrustment = await prisma.entrustment.update({
    where: { id },
    data: {
      ...entrustmentData,
      sampleDate: entrustmentData.sampleDate ? new Date(entrustmentData.sampleDate) : undefined,
    }
  })

  // 处理检测项目
  if (projects && Array.isArray(projects)) {
    // 获取现有项目
    const existingProjects = await prisma.entrustmentProject.findMany({
      where: { entrustmentId: id }
    })
    const existingIds = existingProjects.map((p: any) => p.id)

    // 分类处理
    const toUpdate = projects.filter((p: any) => p.id && existingIds.includes(p.id))
    const toCreate = projects.filter((p: any) => !p.id && p.name)
    const toDeleteIds = existingIds.filter((eid: string) => !projects.some((p: { id?: string }) => p.id === eid))

    // 删除不再需要的项目
    if (toDeleteIds.length > 0) {
      await prisma.entrustmentProject.deleteMany({
        where: { id: { in: toDeleteIds } }
      })
    }

    // 更新现有项目
    for (const p of toUpdate) {
      await prisma.entrustmentProject.update({
        where: { id: p.id },
        data: {
          name: p.name,
          testItems: typeof p.testItems === 'string' ? p.testItems : JSON.stringify(p.testItems || []),
          method: p.method || null,
          standard: p.standard || null,
        }
      })
    }

    // 创建新项目
    if (toCreate.length > 0) {
      await prisma.entrustmentProject.createMany({
        data: toCreate.map((p: { name: string; testItems?: string | string[]; method?: string; standard?: string }) => ({
          entrustmentId: id,
          name: p.name,
          testItems: typeof p.testItems === 'string' ? p.testItems : JSON.stringify(p.testItems || []),
          method: p.method || null,
          standard: p.standard || null,
          status: 'pending',
        }))
      })
    }
  }

  // 返回更新后的完整数据
  const result = await prisma.entrustment.findUnique({
    where: { id },
    include: {
      client: true,
      contract: true,
      projects: true,
    }
  })

  return success(result)
})

// 删除委托单
export const DELETE = withErrorHandler(async (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
  const { params } = context!
  const { id } = await params

  // 先删除关联的检测项目
  await prisma.entrustmentProject.deleteMany({
    where: { entrustmentId: id }
  })

  // 删除委托单
  await prisma.entrustment.delete({ where: { id } })

  return success({ message: '删除成功' })
})
