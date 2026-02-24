import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// 获取客户报告详情
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

    const report = await prisma.clientReport.findUnique({
        where: { id },
        include: {
            template: true // 获取模板详情
        }
    })

    if (!report) {
        return NextResponse.json({ error: '报告不存在' }, { status: 404 })
    }

    // 获取关联的任务报告详情
    let taskReports: any[] = []
    if (report.taskReportNos) {
        try {
            const reportNos = JSON.parse(report.taskReportNos)
            if (Array.isArray(reportNos) && reportNos.length > 0) {
                taskReports = await prisma.testReport.findMany({
                    where: {
                        reportNo: { in: reportNos }
                    },
                    include: {
                        task: {
                            select: {
                                taskNo: true,
                                sampleName: true,
                                sheetData: true,
                            }
                        }
                    }
                })
            }
        } catch (e) {
            console.error('解析 taskReportNos 失败', e)
        }
    }

    return NextResponse.json({
        success: true,
        data: {
            ...report,
            taskReports
        }
    })
}

// 更新客户报告
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const body = await request.json()

    const report = await prisma.clientReport.update({
        where: { id },
        // 问题-4 修复：字段白名单过滤，防止修改不该修改的字段
        data: {
            ...(body.projectName !== undefined && { projectName: body.projectName }),
            ...(body.clientName !== undefined && { clientName: body.clientName }),
            ...(body.clientAddress !== undefined && { clientAddress: body.clientAddress }),
            ...(body.sampleName !== undefined && { sampleName: body.sampleName }),
            ...(body.sampleNo !== undefined && { sampleNo: body.sampleNo }),
            ...(body.specification !== undefined && { specification: body.specification }),
            ...(body.sampleQuantity !== undefined && { sampleQuantity: body.sampleQuantity }),
            ...(body.overallConclusion !== undefined && { overallConclusion: body.overallConclusion }),
            ...(body.reviewer !== undefined && { reviewer: body.reviewer }),
            ...(body.approver !== undefined && { approver: body.approver }),
            ...(body.status !== undefined && { status: body.status }),
            ...(body.issuedDate !== undefined && { issuedDate: body.issuedDate }),
            ...(body.attachmentUrl !== undefined && { attachmentUrl: body.attachmentUrl }),
            ...(body.templateId !== undefined && { templateId: body.templateId }),
            ...(body.coverData !== undefined && { coverData: body.coverData }),
            ...(body.backCoverData !== undefined && { backCoverData: body.backCoverData }),
            ...(body.approvalFlow !== undefined && { approvalFlow: body.approvalFlow }),
            ...(body.taskReportNos !== undefined && { taskReportNos: body.taskReportNos }),
            ...(body.testItems !== undefined && { testItems: body.testItems }),
            ...(body.testStandards !== undefined && { testStandards: body.testStandards }),
            ...(body.followerId !== undefined && { followerId: body.followerId }),
        }
    })

    // 当报告状态变为 issued/approved 时，回写委托单报告状态
    if (body.status === 'issued' && report.entrustmentId) {
        await prisma.entrustment.update({
            where: { id: report.entrustmentId },
            data: { reportStatus: 'issued' }
        })
    } else if (body.status === 'voided' && report.entrustmentId) {
        // 报告作废时，检查该委托单是否还有其他有效报告
        const otherReports = await prisma.clientReport.count({
            where: {
                entrustmentId: report.entrustmentId,
                id: { not: id },
                status: { not: 'voided' }
            }
        })
        if (otherReports === 0) {
            await prisma.entrustment.update({
                where: { id: report.entrustmentId },
                data: { reportStatus: 'none' }
            })
        }
    }

    return NextResponse.json({
        success: true,
        data: report
    })
}

// 删除客户报告
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    // 问题-3 修复：增加认证检查
    const session = await auth()
    if (!session?.user) {
        return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id } = await params

    // 检查报告是否存在及其状态
    const report = await prisma.clientReport.findUnique({
        where: { id },
        select: { id: true, status: true, entrustmentId: true }
    })

    if (!report) {
        return NextResponse.json({ error: '报告不存在' }, { status: 404 })
    }

    // 已签发或审核中的报告不允许删除
    if (['issued', 'approved', 'pending_review', 'pending_approve'].includes(report.status)) {
        return NextResponse.json({ error: `状态为「${report.status}」的报告不允许删除` }, { status: 400 })
    }

    await prisma.clientReport.delete({
        where: { id }
    })

    // 回写委托单 reportStatus
    if (report.entrustmentId) {
        const otherReports = await prisma.clientReport.count({
            where: {
                entrustmentId: report.entrustmentId,
                status: { not: 'voided' }
            }
        })
        if (otherReports === 0) {
            await prisma.entrustment.update({
                where: { id: report.entrustmentId },
                data: { reportStatus: 'none' }
            })
        }
    }

    return NextResponse.json({
        success: true,
        message: '删除成功'
    })
}
