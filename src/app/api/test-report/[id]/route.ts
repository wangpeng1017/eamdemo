import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-handler'


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const report = await prisma.testReport.findUnique({ where: { id }, include: { task: true } })
  return NextResponse.json(report)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const data = await request.json()
  const report = await prisma.testReport.update({ where: { id }, data })
  return NextResponse.json(report)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.testReport.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

export const PATCH = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { params } = context!
  const { id } = await params
  const data = await request.json()

  const { action, comment, approver, submitterName } = data

  const report = await prisma.testReport.findUnique({
    where: { id }
  })

  if (!report) {
    return NextResponse.json({ success: false, error: { message: '报告不存在' } }, { status: 404 })
  }

  const { approvalEngine } = await import('@/lib/approval/engine')

  if (action === 'submit') {
    if (report.status !== 'draft') {
      return NextResponse.json({ success: false, error: { message: '只有草稿状态的报告可以提交审批' } }, { status: 400 })
    }

    await approvalEngine.submit({
      bizType: 'test_report',
      bizId: id,
      flowCode: 'TEST_REPORT_APPROVAL',
      submitterId: user.id,
      submitterName: user.name || '未知用户',
    })
  }
  else if (action === 'approve' || action === 'reject') {
    const instance = await prisma.approvalInstance.findFirst({
      where: {
        bizType: 'test_report',
        bizId: id,
        status: 'pending'
      },
      orderBy: { submittedAt: 'desc' }
    })

    if (!instance) {
      return NextResponse.json({ success: false, error: { message: '未找到进行中的审批实例' } }, { status: 400 })
    }

    await approvalEngine.approve({
      instanceId: instance.id,
      action: action,
      approverId: user.id,
      approverName: user.name || '未知用户',
      comment,
    })
  } else if (action === 'review') {
    // 兼容前端原有的 action: 'review'
    const instance = await prisma.approvalInstance.findFirst({
      where: {
        bizType: 'test_report',
        bizId: id,
        status: 'pending'
      },
      orderBy: { submittedAt: 'desc' }
    })

    if (instance) {
      await approvalEngine.approve({
        instanceId: instance.id,
        action: 'approve',
        approverId: user.id,
        approverName: user.name || '未知用户',
        comment,
      })
    } else {
      // 如果没有实例，可能是旧流程，暂时手动更新
      await prisma.testReport.update({
        where: { id },
        data: { status: 'approved' }
      })
    }
  } else if (action === 'issue') {
    if (report.status !== 'approved') {
      return NextResponse.json({ success: false, error: { message: '只有已批准状态可以发布' } }, { status: 400 })
    }
    await prisma.testReport.update({
      where: { id },
      data: {
        status: 'issued',
        issuedDate: new Date()
      }
    })
  }

  const updated = await prisma.testReport.findUnique({
    where: { id },
    include: { task: true }
  })

  return NextResponse.json({ success: true, data: updated })
})
