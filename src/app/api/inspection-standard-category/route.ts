/**
 * @file route.ts
 * @desc 检测标准分类 API - 获取树形列表和创建分类
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - 获取分类树形列表（一级+二级）
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const flat = searchParams.get('flat') === 'true' // 是否返回扁平列表

    if (flat) {
      // 扁平列表模式（兼容旧逻辑）
      const categories = await prisma.inspectionStandardCategory.findMany({
        where: { status: 1 },
        orderBy: { sort: 'asc' },
      })
      return NextResponse.json({ success: true, data: categories })
    }

    // 树形模式：获取一级分类（parentId 为 null）+ 其子分类
    const categories = await prisma.inspectionStandardCategory.findMany({
      where: { status: 1, parentId: null },
      orderBy: { sort: 'asc' },
      include: {
        children: {
          where: { status: 1 },
          orderBy: { sort: 'asc' },
          include: {
            _count: { select: { items: true } },
          },
        },
        _count: { select: { items: true } },
      },
    })

    return NextResponse.json({ success: true, data: categories })
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
    const { name, code, description, sort, parentId } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: '分类名称不能为空' },
        { status: 400 }
      )
    }

    // 检查编码是否重复
    if (code) {
      const existing = await prisma.inspectionStandardCategory.findUnique({
        where: { code },
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
        code: code || null,
        description,
        sort: sort || 0,
        parentId: parentId || null,
        status: 1,
      },
    })

    return NextResponse.json({ success: true, data: category }, { status: 201 })
  } catch (error) {
    console.error('创建分类失败:', error)
    return NextResponse.json(
      { success: false, error: '创建分类失败' },
      { status: 500 }
    )
  }
}
