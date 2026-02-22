import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

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
                            include: {
                                testData: true
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
        data: body
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
    const { id } = await params

    await prisma.clientReport.delete({
        where: { id }
    })

    return NextResponse.json({
        success: true,
        message: '删除成功'
    })
}
