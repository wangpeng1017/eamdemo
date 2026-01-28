/**
 * @file 提交业务单位审批API
 * @desc POST /api/client/[id]/submit
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { submitClientForApproval } from '@/lib/client-approval'

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

    // 执行提交审批
    const result = await submitClientForApproval(
      id,
      {
        comment: body?.comment
      },
      session.user.id
    )

    return NextResponse.json({
      success: true,
      data: result,
      message: result.message
    })

  } catch (error: any) {
    console.error('提交业务单位审批失败:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || '提交失败'
      },
      { status: error.message.includes('无法') || error.message.includes('不能') ? 400 : 500 }
    )
  }
}
