/**
 * @file route.ts
 * @desc 检测标准分类 API - 获取列表和创建分类
 * @input 依赖: Prisma Client
 * @output 导出: GET/POST 处理函数
 * @see PRD: docs/PRD.md
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - 获取分类列表（支持分页和排序）
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const sortBy = searchParams.get('sortBy') || 'sort'
    const sortOrder = searchParams.get('sortOrder') || 'asc'

    const skip = (page - 1) * limit

    // 获取总数
    const total = await prisma.inspectionStandardCategory.count({
      where: { status: 1 }
    })

    // 获取数据
    const categories = await prisma.inspectionStandardCategory.findMany({
      where: { status: 1 },
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' },
      include: {
        standards: {
          select: {
            id: true,
            standardNo: true,
            name: true,
            validity: true
          },
          where: { validity: 'valid' }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: categories,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('获取分类列表失败:', error)
    return NextResponse.json(
      { success: false, error: '获取分类列表失败' },
      { status: 500 }
    )
  }
}

// POST - 创建新分类
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, code, description, sort } = body

    // 验证必填字段
    if (!name) {
      return NextResponse.json(
        { success: false, error: '分类名称不能为空' },
        { status: 400 }
      )
    }

    // 检查编码是否重复
    if (code) {
      const existing = await prisma.inspectionStandardCategory.findUnique({
        where: { code }
      })
      if (existing) {
        return NextResponse.json(
          { success: false, error: '分类编码已存在' },
          { status: 400 }
        )
      }
    }

    const category = await prisma.inspectionStandardCategory.create({
      data: {
        name,
        code,
        description,
        sort: sort || 0,
        status: 1
      },
      include: {
        standards: {
          select: {
            id: true,
            standardNo: true,
            name: true,
            validity: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: category
    }, { status: 201 })
  } catch (error) {
    console.error('创建分类失败:', error)
    return NextResponse.json(
      { success: false, error: '创建分类失败' },
      { status: 500 }
    )
  }
}
