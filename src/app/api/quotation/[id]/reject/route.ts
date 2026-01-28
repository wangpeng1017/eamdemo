/**
 * @file 驳回报价单API
 * @desc POST /api/quotation/[id]/reject
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { rejectDocument } from '@/lib/approval-rejection'

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

    // 验证请求参数
    const rejectReason = body?.rejectReason
    if (!rejectReason?.trim()) {
      return NextResponse.json(
        { success: false, error: '驳回原因不能为空' },
        { status: 400 }
      )
    }

    // 执行驳回
    const result = await rejectDocument(
      'quotation',
      id,
      { rejectReason },
      session.user.id
    )

    return NextResponse.json({
      success: true,
      data: result,
      message: '驳回成功'
    })

  } catch (error: any) {
    console.error('驳回报价单失败:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || '驳回失败'
      },
      { status: error.message.includes('不能') || error.message.includes('无法') ? 400 : 500 }
    )
  }
}
