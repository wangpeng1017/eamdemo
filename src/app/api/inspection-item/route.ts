/**
 * @file inspection-item/route.ts
 * @desc 检测项目 CRUD API - GET/POST
 *       创建时自动同步到 TestTemplate
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/inspection-item?categoryId=xxx
 * 获取检测项目列表，支持按 categoryId 或 standardId 过滤
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const categoryId = searchParams.get('categoryId')
    const standardId = searchParams.get('standardId')
    const parentCategoryId = searchParams.get('parentCategoryId') // 一级分类ID，查询其所有子分类项目

    const where: Record<string, unknown> = {}

    if (parentCategoryId) {
      // 查询一级分类下所有子分类的项目
      const childCategories = await prisma.inspectionStandardCategory.findMany({
        where: { parentId: parentCategoryId, status: 1 },
        select: { id: true },
      })
      const childIds = childCategories.map((c) => c.id)
      // 包含直接属于一级分类的项目和子分类的项目
      where.categoryId = { in: [parentCategoryId, ...childIds] }
    } else if (categoryId) {
      where.categoryId = categoryId
    } else if (standardId) {
      where.standardId = standardId
    }

    const items = await prisma.inspectionItem.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, parentId: true } },
      },
      orderBy: { sort: 'asc' },
    })

    return NextResponse.json({ success: true, data: items })
  } catch (error: unknown) {
    console.error('GET /api/inspection-item error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '获取检测项目列表失败',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/inspection-item
 * 创建检测项目，同时自动同步到 TestTemplate
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { categoryId, name, executionStandard, sampleQuantity, materialFile, method, unit, requirement, remark, sort, status } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: '检测项目名称为必填项' },
        { status: 400 }
      )
    }

    // 获取分类信息（用于同步 TestTemplate 的 category 字段）
    let categoryName = ''
    if (categoryId) {
      const cat = await prisma.inspectionStandardCategory.findUnique({
        where: { id: categoryId },
        include: { parent: { select: { name: true } } },
      })
      // 优先用二级分类名称，否则用一级
      categoryName = cat?.name || ''
    }

    // 创建检测项目
    const item = await prisma.inspectionItem.create({
      data: {
        categoryId: categoryId || null,
        name,
        executionStandard: executionStandard || null,
        sampleQuantity: sampleQuantity || null,
        materialFile: materialFile || null,
        method: method || null,
        unit: unit || null,
        requirement: requirement || null,
        remark: remark || null,
        sort: sort ?? 0,
        status: status ?? 1,
      },
      include: {
        category: { select: { id: true, name: true, parentId: true } },
      },
    })

    // 自动同步到 TestTemplate
    try {
      // 生成唯一 code：使用检测项目 ID 的后 8 位
      const code = `IT-${item.id.slice(-8).toUpperCase()}`
      await prisma.testTemplate.create({
        data: {
          code,
          name,
          category: categoryName,
          method: executionStandard || name, // 用执行标准或项目名称
          schema: '[]', // 空模板 schema，待后续在 test-templates 页面配置
          status: 'active',
          version: '1.0',
        },
      })
    } catch (syncError) {
      // 同步失败不影响主流程，仅记录日志
      console.error('同步到 TestTemplate 失败:', syncError)
    }

    return NextResponse.json({ success: true, data: item })
  } catch (error: unknown) {
    console.error('POST /api/inspection-item error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '创建检测项目失败',
      },
      { status: 500 }
    )
  }
}
