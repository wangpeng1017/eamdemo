/**
 * @file 从报价单创建委托单API
 * @desc POST /api/quotation/[id]/create-entrustment
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createEntrustmentFromQuotation } from '@/lib/quotation-to-entrustment'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证用户登录
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: '未授权' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()

    // 从报价单创建委托单
    const result = await createEntrustmentFromQuotation({
      quotationId: id,
      contactPerson: body?.contactPerson,
      sampleDate: body?.sampleDate,
      followerId: body?.followerId,
      remark: body?.remark
    }, session.user.id)

    return NextResponse.json({
      success: true,
      data: result,
      message: result.message
    })

  } catch (error: any) {
    console.error('从报价单创建委托单失败:', error)

    // 业务校验错误统一返回 400，只有系统异常返回 500
    const msg = error.message || '创建失败'
    const isBusinessError = error instanceof Error && (
      msg.includes('已生成') || msg.includes('无法') || msg.includes('未') ||
      msg.includes('不可') || msg.includes('不存在')
    )

    return NextResponse.json(
      { success: false, error: msg },
      { status: isBusinessError ? 400 : 500 }
    )
  }
}
