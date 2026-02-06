/**
 * @file route.ts
 * @desc 检测标准分类 API - 获取树形结构（分类+标准）
 * @input 依赖: Prisma Client
 * @output 导出: GET 处理函数
 * @see PRD: docs/PRD.md
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - 获取树形结构（分类 + 关联的标准）
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const includeInvalid = searchParams.get('includeInvalid') === 'true'

    // 获取所有有效分类
    const categories = await prisma.inspectionStandardCategory.findMany({
      where: { status: 1 },
      orderBy: { sort: 'asc' },
      include: {
        standards: {
          select: {
            id: true,
            standardNo: true,
            name: true,
            description: true,
            validity: true,
            createdAt: true
          },
          where: includeInvalid ? {} : { validity: 'valid' },
          orderBy: { standardNo: 'asc' }
        }
      }
    })

    // 构建树形结构
    const tree = categories.map(category => ({
      id: category.id,
      name: category.name,
      code: category.code,
      description: category.description,
      sort: category.sort,
      standards: category.standards,
      standardCount: category.standards.length
    }))

    return NextResponse.json({
      success: true,
      data: {
        categories: tree,
        totalCategories: tree.length,
        totalStandards: tree.reduce((sum, cat) => sum + cat.standardCount, 0)
      }
    })
  } catch (error) {
    console.error('获取树形结构失败:', error)
    return NextResponse.json(
      { success: false, error: '获取树形结构失败' },
      { status: 500 }
    )
  }
}
