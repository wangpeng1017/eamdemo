# -*- coding: utf-8 -*-
"""
Fix TypeScript type errors in API routes - Phase 2
"""

import os

def fix_entrustment_route():
    """Fix entrustment/route.ts"""
    file_path = '/Users/wangpeng/Downloads/limsnext/src/app/api/entrustment/route.ts'

    content = """import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import {
  withErrorHandler,
  success,
  validateRequired,
} from '@/lib/api-handler'
import { generateNo, NumberPrefixes } from '@/lib/generate-no'

// 获取委托单列表（含筛选和关联数据）
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const status = searchParams.get('status')
  const keyword = searchParams.get('keyword')
  const follower = searchParams.get('follower')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const sourceType = searchParams.get('sourceType')

  // 构建筛选条件
  const where: Record<string, unknown> = {}

  if (status) {
    where.status = status
  }

  if (follower) {
    where.follower = follower
  }

  if (sourceType) {
    where.sourceType = sourceType
  }

  if (keyword) {
    where.OR = [
      { entrustmentNo: { contains: keyword } },
      { clientName: { contains: keyword } },
      { sampleName: { contains: keyword } },
      { contractNo: { contains: keyword } },
    ]
  }

  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) (where.createdAt as Record<string, Date>).gte = new Date(startDate)
    if (endDate) (where.createdAt as Record<string, Date>).lte = new Date(endDate)
  }

  const [list, total] = await Promise.all([
    prisma.entrustment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            contact: true,
            phone: true,
          },
        },
        contract: {
          select: {
            id: true,
            contractNo: true,
            contractName: true,
            status: true,
          },
        },
        projects: {
          select: {
            id: true,
            name: true,
            testItems: true,
            method: true,
            standard: true,
            status: true,
            assignTo: true,
            subcontractor: true,
            deviceId: true,
            deadline: true,
          },
        },
        samples: {
          select: {
            id: true,
            sampleNo: true,
            name: true,
            status: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    }),
    prisma.entrustment.count({ where }),
  ])

  // 统计各状态数量
  const stats = await prisma.entrustment.groupBy({
    by: ['status'],
    _count: true,
  })

  return success({
    list,
    total,
    page,
    pageSize,
    stats: stats.reduce((acc, item) => {
      acc[item.status] = item._count
      return acc
    }, {} as Record<string, number>),
  })
})

// 创建委托单
export const POST = withErrorHandler(async (request: NextRequest) => {
  const data = await request.json()

  // 验证必填字段
  validateRequired(data, ['clientName', 'sampleName'])

  // 分离检测项目数据
  const { projects, ...entrustmentData } = data

  // 生成委托单号
  const entrustmentNo = await generateNo(NumberPrefixes.ENTRUSTMENT, 4)

  // 创建委托单
  const entrustment = await prisma.entrustment.create({
    data: {
      ...entrustmentData,
      entrustmentNo,
      status: entrustmentData.status || 'pending',
      sampleDate: entrustmentData.sampleDate ? new Date(entrustmentData.sampleDate) : new Date(),
    },
  })

  // 创建检测项目
  if (projects && Array.isArray(projects) && projects.length > 0) {
    const validProjects = projects.filter((p: { name?: string }) => p.name)
    if (validProjects.length > 0) {
      await prisma.entrustmentProject.createMany({
        data: validProjects.map((p: { name: string; testItems?: string | string[]; method?: string; standard?: string }) => ({
          entrustmentId: entrustment.id,
          name: p.name,
          testItems: typeof p.testItems === 'string' ? p.testItems : JSON.stringify(p.testItems || []),
          method: p.method || null,
          standard: p.standard || null,
          status: 'pending',
        }))
      })
    }
  }

  // 返回完整数据
  const result = await prisma.entrustment.findUnique({
    where: { id: entrustment.id },
    include: {
      client: true,
      contract: true,
      projects: true,
      samples: true,
    },
  })

  return success(result)
})
"""

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'✓ Fixed: {file_path}')

def fix_entrustment_id_projects_projectId():
    """Fix entrustment/[id]/projects/[projectId]/route.ts"""
    file_path = '/Users/wangpeng/Downloads/limsnext/src/app/api/entrustment/[id]/projects/[projectId]/route.ts'

    content = """import { prisma } from '@/lib/prisma'
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
  const project = entrustment.projects.find((p) => p.id === projectId)
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
"""

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'✓ Fixed: {file_path}')

def fix_evaluation_template_id():
    """Fix evaluation-template/[id]/route.ts"""
    file_path = '/Users/wangpeng/Downloads/limsnext/src/app/api/evaluation-template/[id]/route.ts'

    content = """import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, notFound } from '@/lib/api-handler'
import { Prisma } from '@prisma/client'

interface RouteParams {
  params: Promise<{ id: string }>
}

// 获取单个模板
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: RouteParams
) => {
  const { id } = await params

  const template = await prisma.evaluationTemplate.findUnique({
    where: { id },
    include: {
      category: true,
      items: { orderBy: { sort: 'asc' } },
    },
  })

  if (!template) {
    notFound('模板不存在')
  }

  return success(template)
})

// 更新模板
export const PUT = withErrorHandler(async (
  request: NextRequest,
  { params }: RouteParams
) => {
  const { id } = await params
  const data = await request.json()

  const existing = await prisma.evaluationTemplate.findUnique({ where: { id } })
  if (!existing) {
    notFound('模板不存在')
  }

  // 使用事务更新模板和评价项
  const template = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // 更新模板基本信息
    await tx.evaluationTemplate.update({
      where: { id },
      data: {
        name: data.name,
        code: data.code,
        categoryId: data.categoryId,
        description: data.description,
        status: data.status,
      },
    })

    // 如果提供了评价项，先删除旧的再创建新的
    if (data.items) {
      await tx.evaluationTemplateItem.deleteMany({ where: { templateId: id } })
      await tx.evaluationTemplateItem.createMany({
        data: data.items.map((item: { name: string; weight: number; maxScore?: number; description?: string }, index: number) => ({
          templateId: id,
          name: item.name,
          weight: item.weight,
          maxScore: item.maxScore || 100,
          description: item.description || null,
          sort: index,
        })),
      })
    }

    return tx.evaluationTemplate.findUnique({
      where: { id },
      include: { category: true, items: { orderBy: { sort: 'asc' } } },
    })
  })

  return success(template)
})

// 删除模板
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  { params }: RouteParams
) => {
  const { id } = await params

  const existing = await prisma.evaluationTemplate.findUnique({ where: { id } })
  if (!existing) {
    notFound('模板不存在')
  }

  await prisma.evaluationTemplate.delete({ where: { id } })

  return success({ success: true })
})
"""

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'✓ Fixed: {file_path}')

def fix_external_entrustment_submit():
    """Fix external/entrustment/submit/route.ts"""
    file_path = '/Users/wangpeng/Downloads/limsnext/src/app/api/external/entrustment/submit/route.ts'

    content = """import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, validateRequired } from '@/lib/api-handler'

/**
 * @file route.ts
 * @desc 提交外部委托单信息（客户填写）
 * @input POST /api/external/entrustment/submit
 * @body { token, sampleName, sampleModel, sampleMaterial, sampleQuantity, specialRequirements, otherRequirements }
 */

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json()
  const {
    token,
    sampleName,
    sampleModel,
    sampleMaterial,
    sampleQuantity,
    specialRequirements,
    otherRequirements,
  } = body

  // 验证必填字段
  validateRequired(body, ['token'])

  if (!token) {
    return Response.json({ success: false, message: '缺少 token' }, { status: 400 })
  }

  // 查找包含该 token 的委托单
  const entrustments = await prisma.entrustment.findMany({
    where: {
      remark: {
        not: null,
      },
    },
  })

  // 找到匹配的委托单
  const matched = entrustments.find((e) => {
    if (!e.remark) return false
    try {
      const data = JSON.parse(e.remark as string)
      return data.externalLink?.token === token
    } catch {
      return false
    }
  })

  if (!matched) {
    return Response.json({ success: false, message: '链接无效或已过期' }, { status: 404 })
  }

  // 检查是否过期
  let remarkData: Record<string, any> = {}
  try {
    remarkData = JSON.parse(matched.remark as string || '{}')
  } catch {
    remarkData = {}
  }

  const expiresAt = remarkData.externalLink?.expiresAt
  if (expiresAt && new Date(expiresAt) < new Date()) {
    return Response.json({ success: false, message: '链接已过期' }, { status: 410 })
  }

  // 准备更新数据
  const updateData: Record<string, unknown> = {}

  if (sampleName) updateData.sampleName = sampleName
  if (sampleModel) updateData.sampleModel = sampleModel
  if (sampleMaterial) updateData.sampleMaterial = sampleMaterial
  if (sampleQuantity !== undefined) updateData.sampleQuantity = sampleQuantity

  // 更新 remark 字段，保存外部提交的数据
  const existingExternalData = remarkData.externalData || {}
  const newExternalData = {
    ...existingExternalData,
    submittedAt: new Date().toISOString(),
    sampleName,
    sampleModel,
    sampleMaterial,
    sampleQuantity,
    specialRequirements,
    otherRequirements,
  }

  updateData.remark = JSON.stringify({
    ...remarkData,
    externalData: newExternalData,
  })

  // 更新委托单
  await prisma.entrustment.update({
    where: { id: matched.id },
    data: updateData,
  })

  return success({
    message: '提交成功',
    entrustmentNo: matched.entrustmentNo,
  })
})
"""

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'✓ Fixed: {file_path}')

# Run all fixes
if __name__ == '__main__':
    print('Fixing API route TypeScript type errors - Phase 2...\n')

    fix_entrustment_route()
    fix_entrustment_id_projects_projectId()
    fix_evaluation_template_id()
    fix_external_entrustment_submit()

    print('\n✓ Phase 2 complete: Fixed 4 files')
