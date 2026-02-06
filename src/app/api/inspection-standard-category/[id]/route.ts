/**
 * @file route.ts
 * @desc 检测标准分类 API - 更新和删除单条记录
 * @input 依赖: Prisma Client
 * @output 导出: PUT/DELETE 处理函数
 * @see PRD: docs/PRD.md
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// PUT - 更新分类
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { name, code, description, sort, status } = body

    // 检查分类是否存在
    const existing = await prisma.inspectionStandardCategory.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '分类不存在' },
        { status: 404 }
      )
    }

    // 如果修改了编码，检查新编码是否重复
    if (code && code !== existing.code) {
      const codeExists = await prisma.inspectionStandardCategory.findUnique({
        where: { code }
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
        ...(status !== undefined && { status })
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
    })
  } catch (error) {
    console.error('更新分类失败:', error)
    return NextResponse.json(
      { success: false, error: '更新分类失败' },
      { status: 500 }
    )
  }
}

// DELETE - 删除分类（软删除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // 检查分类是否存在
    const existing = await prisma.inspectionStandardCategory.findUnique({
      where: { id },
      include: {
        standards: true
      }
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '分类不存在' },
        { status: 404 }
      )
    }

    // 检查是否有关联的标准
    if (existing.standards.length > 0) {
      return NextResponse.json(
        { success: false, error: '该分类下存在标准，无法删除' },
        { status: 400 }
      )
    }

    // 软删除：将 status 设为 0
    await prisma.inspectionStandardCategory.update({
      where: { id },
      data: { status: 0 }
    })

    return NextResponse.json({
      success: true,
      message: '删除成功'
    })
  } catch (error) {
    console.error('删除分类失败:', error)
    return NextResponse.json(
      { success: false, error: '删除分类失败' },
      { status: 500 }
    )
  }
}
