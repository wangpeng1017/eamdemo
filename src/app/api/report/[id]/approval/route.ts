import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth()
    if (!session?.user) {
        return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id } = await params
    const { action, comment } = await request.json()

    // 获取报告
    const report = await prisma.testReport.findUnique({ where: { id } })
    if (!report) {
        return NextResponse.json({ error: '报告不存在' }, { status: 404 })
    }

    let newStatus = report.status
    let reviewType = ''
    let result = 'pass'

    switch (action) {
        case 'submit':  // 提交审核
            if (report.status !== 'draft') {
                return NextResponse.json({ error: '只有草稿状态可以提交审核' }, { status: 400 })
            }
            newStatus = 'reviewing'
            reviewType = 'submit'
            break

        case 'approve':  // 审核通过
            if (report.status !== 'reviewing') {
                return NextResponse.json({ error: '只有审核中状态可以审核' }, { status: 400 })
            }
            newStatus = 'approved'
            reviewType = 'review'
            break

        case 'reject':  // 审核驳回
            if (report.status !== 'reviewing') {
                return NextResponse.json({ error: '只有审核中状态可以驳回' }, { status: 400 })
            }
            newStatus = 'draft'
            reviewType = 'review'
            result = 'reject'
            break

        case 'issue':  // 发布
            if (report.status !== 'approved') {
                return NextResponse.json({ error: '只有已批准状态可以发布' }, { status: 400 })
            }
            newStatus = 'issued'
            reviewType = 'issue'
            break

        default:
            return NextResponse.json({ error: '无效的操作' }, { status: 400 })
    }

    // 更新报告状态
    await prisma.testReport.update({
        where: { id },
        data: {
            status: newStatus,
            ...(newStatus === 'issued' && { issuedDate: new Date() }),
            ...(newStatus === 'approved' && { reviewer: session.user.name || session.user.id }),
        }
    })

    // 创建审批记录
    await prisma.testReportApproval.create({
        data: {
            reportId: id,
            reviewType,
            reviewer: session.user.name || session.user.id || '系统',
            result,
            comments: comment || null
        }
    })

    const messages: Record<string, string> = {
        submit: '报告已提交审核',
        approve: '报告审核通过',
        reject: '报告已驳回',
        issue: '报告已发布'
    }

    return NextResponse.json({
        success: true,
        message: messages[action] || '操作成功',
        data: { status: newStatus }
    })
}

// 获取审批历史
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

    const approvals = await prisma.testReportApproval.findMany({
        where: { reportId: id },
        orderBy: { reviewDate: 'desc' }
    })

    return NextResponse.json({
        success: true,
        data: approvals
    })
}
