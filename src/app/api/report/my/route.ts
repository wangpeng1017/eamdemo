import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import {
    withErrorHandler,
    success,
} from '@/lib/api-handler'

// 获取当前用户跟单的委托单及其客户报告
export const GET = withErrorHandler(async (request: NextRequest) => {
    const session = await auth()
    if (!session?.user?.id) {
        return Response.json({ success: false, error: { message: '未登录' } }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const keyword = searchParams.get('keyword')
    const reportStatus = searchParams.get('reportStatus') // 客户报告状态筛选

    // 查询当前用户作为跟单人的委托单
    const where: Record<string, unknown> = {
        followerId: session.user.id,
    }

    if (keyword) {
        where.OR = [
            { entrustmentNo: { contains: keyword } },
            { client: { name: { contains: keyword } } },
        ]
    }

    const [entrustments, total] = await Promise.all([
        prisma.entrustment.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
            select: {
                id: true,
                entrustmentNo: true,
                contractNo: true,
                status: true,
                createdAt: true,
                client: {
                    select: { id: true, name: true }
                },
                followerUser: {
                    select: { id: true, name: true }
                },
                samples: {
                    select: { name: true, specification: true },
                    take: 3,
                },
            },
        }),
        prisma.entrustment.count({ where }),
    ])

    // 查询每个委托单关联的客户报告
    const entrustmentIds = entrustments.map(e => e.id)
    const clientReports = await prisma.clientReport.findMany({
        where: {
            entrustmentId: { in: entrustmentIds },
        },
        select: {
            id: true,
            reportNo: true,
            entrustmentId: true,
            status: true,
            sampleName: true,
            clientName: true,
            issuedDate: true,
            createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
    })

    // 按委托单 ID 分组客户报告
    const reportMap = new Map<string, typeof clientReports>()
    for (const report of clientReports) {
        if (!report.entrustmentId) continue
        const list = reportMap.get(report.entrustmentId) || []
        list.push(report)
        reportMap.set(report.entrustmentId, list)
    }

    // 组装返回数据
    let result = entrustments.map((e: any) => {
        const reports = reportMap.get(e.id) || []
        const sampleNames = e.samples?.map((s: any) => s.name).filter(Boolean).join(', ')
        return {
            id: e.id,
            entrustmentNo: e.entrustmentNo,
            clientName: e.client?.name || '',
            contractNo: e.contractNo,
            sampleNames,
            entrustmentStatus: e.status,
            createdAt: e.createdAt,
            // 客户报告信息
            hasReport: reports.length > 0,
            reportCount: reports.length,
            reports: reports.map(r => ({
                id: r.id,
                reportNo: r.reportNo,
                status: r.status,
                issuedDate: r.issuedDate,
            })),
            // 首个报告的状态（便于显示）
            latestReportStatus: reports.length > 0 ? reports[0].status : null,
            latestReportNo: reports.length > 0 ? reports[0].reportNo : null,
            latestReportId: reports.length > 0 ? reports[0].id : null,
        }
    })

    // 根据报告状态筛选
    if (reportStatus) {
        if (reportStatus === 'none') {
            result = result.filter(r => !r.hasReport)
        } else {
            result = result.filter(r => r.reports.some(rep => rep.status === reportStatus))
        }
    }

    return success({
        list: result,
        total,
        page,
        pageSize,
    })
})
