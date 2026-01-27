/**
 * @file 样品检测项单条操作 API
 * @desc 删除单条样品检测项
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'

/**
 * DELETE /api/sample-test-item/[id]
 * 删除单条样品检测项
 */
export const DELETE = withAuth(async (
  req: NextRequest,
  session,
  context
) => {
  try {
    const params = await context?.params
    const id = params?.id

    if (!id) {
      return NextResponse.json(
        { success: false, error: { message: '缺少 ID 参数' } },
        { status: 400 }
      )
    }

    // 检查记录是否存在
    const existing = await prisma.sampleTestItem.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { message: '记录不存在' } },
        { status: 404 }
      )
    }

    // 删除记录
    await prisma.sampleTestItem.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: '删除成功' })
  } catch (error) {
    console.error('删除样品检测项失败:', error)
    return NextResponse.json(
      { success: false, error: { message: '删除失败' } },
      { status: 500 }
    )
  }
})
