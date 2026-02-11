/**
 * @file route.ts
 * @desc 检测标准分类 API - 更新和删除单条记录
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT - 更新分类
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, code, description, sort, status, parentId } = body

    const existing = await prisma.inspectionStandardCategory.findUnique({
      where: { id },
    })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: '分类不存在' },
        { status: 404 }
      )
    }

    // 编码重复检查
    if (code && code !== existing.code) {
      const codeExists = await prisma.inspectionStandardCategory.findUnique({
        where: { code },
      })
      if (codeExists) {
        return NextResponse.json(
          { success: false, error: '分类编码已存在' },
          { status: 400 }
        )
      }
    }

    const category = await prisma.inspectionStandardCategory.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code }),
        ...(description !== undefined && { description }),
        ...(sort !== undefined && { sort }),
        ...(status !== undefined && { status }),
        ...(parentId !== undefined && { parentId }),
      },
    })

    return NextResponse.json({ success: true, data: category })
  } catch (error) {
    console.error('更新分类失败:', error)
    return NextResponse.json(
      { success: false, error: '更新分类失败' },
      { status: 500 }
    )
  }
}

// DELETE - 删除分类（检查子分类和项目）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await prisma.inspectionStandardCategory.findUnique({
      where: { id },
      include: {
        children: true,
        items: true,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '分类不存在' },
        { status: 404 }
      )
    }

    // 检查是否有子分类
    if (existing.children && existing.children.length > 0) {
      return NextResponse.json(
        { success: false, error: '该分类下存在子分类，请先删除子分类' },
        { status: 400 }
      )
    }

    // 检查是否有关联的检测项目
    if (existing.items && existing.items.length > 0) {
      return NextResponse.json(
        { success: false, error: '该分类下存在检测项目，请先删除检测项目' },
        { status: 400 }
      )
    }

    // 软删除
    await prisma.inspectionStandardCategory.update({
      where: { id },
      data: { status: 0 },
    })

    return NextResponse.json({ success: true, message: '删除成功' })
  } catch (error) {
    console.error('删除分类失败:', error)
    return NextResponse.json(
      { success: false, error: '删除分类失败' },
      { status: 500 }
    )
  }
}
