/**
 * @file 审批通过业务单位API
 * @desc POST /api/client/[id]/approve
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { approveClient } from '@/lib/client-approval'

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

    // 执行审批通过
    const result = await approveClient(
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
    console.error('审批通过业务单位失败:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || '审批失败'
      },
      { status: error.message.includes('无法') || error.message.includes('不能') ? 400 : 500 }
    )
  }
}
