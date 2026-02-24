import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-handler'
import { getEntrustmentBasedFilter } from '@/lib/data-permission'

// 获取全部外包任务列表 - 使用数据权限过滤
export const GET = withAuth(async (request: NextRequest, user) => {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const status = searchParams.get('status')
    const keyword = searchParams.get('keyword')

    // 数据权限过滤 + 只看外包任务
    const permissionFilter = await getEntrustmentBasedFilter(user.id)
    let where: any = { isOutsourced: true }

    if (Object.keys(permissionFilter).length > 0) {
        // 有权限过滤：委托单链路 或 直接分配给我 或 我是内部负责人
        where.OR = [
            permissionFilter,
            { assignedToId: user.id },
            { entrustmentProject: { subcontractAssignee: user.id } },
        ]
    }

    if (status) where.status = status
    if (keyword) {
        where.AND = [
            ...(where.AND || []),
            {
                OR: [
                    { taskNo: { contains: keyword } },
                    { sampleName: { contains: keyword } },
                ]
            }
        ]
    }

    const [list, total] = await Promise.all([
        prisma.testTask.findMany({
            where,
            include: {
                sample: {
                    select: {
                        sampleNo: true,
                        name: true,
                        specification: true,
                    }
                },
                device: {
                    select: {
                        deviceNo: true,
                        name: true,
                    }
                },
                entrustmentProject: {
                    select: {
                        name: true,
                        subcontractor: true,
                        subcontractAssignee: true,
                    }
                },
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.testTask.count({ where }),
    ])

    // 批量查询委托编号
    const entrustmentIds = [...new Set(list.map((t: any) => t.entrustmentId).filter(Boolean))]
    let entrustmentMap: Record<string, string> = {}
    if (entrustmentIds.length > 0) {
        const entrustments = await prisma.entrustment.findMany({
            where: { id: { in: entrustmentIds } },
            select: { id: true, entrustmentNo: true },
        })
        entrustmentMap = entrustments.reduce((acc: Record<string, string>, e: any) => {
            acc[e.id] = e.entrustmentNo
            return acc
        }, {})
    }

    // 批量回填样品数据
    const tasksNeedSample = list.filter((t: any) => !t.sampleId && t.entrustmentId)
    const needSampleEntrustmentIds = [...new Set(tasksNeedSample.map((t: any) => t.entrustmentId))]
    let samplesByEntrustment: Record<string, any[]> = {}
    if (needSampleEntrustmentIds.length > 0) {
        const samples = await prisma.sample.findMany({
            where: { entrustmentId: { in: needSampleEntrustmentIds } },
            select: { id: true, sampleNo: true, name: true, entrustmentId: true, specification: true },
        })
        for (const s of samples) {
            if (!samplesByEntrustment[s.entrustmentId!]) samplesByEntrustment[s.entrustmentId!] = []
            samplesByEntrustment[s.entrustmentId!].push(s)
        }
    }

    const enrichedList = list.map((task: any) => {
        const enriched = {
            ...task,
            entrustmentNo: task.entrustmentId ? entrustmentMap[task.entrustmentId] || null : null,
        }
        if (!enriched.sample && task.entrustmentId) {
            const candidates = samplesByEntrustment[task.entrustmentId] || []
            const matched = candidates.find((s: any) => s.name === task.sampleName) || candidates[0]
            if (matched) {
                enriched.sample = { sampleNo: matched.sampleNo, name: matched.name, specification: matched.specification }
            }
        }
        return enriched
    })

    // 统计各状态数量（使用相同的 where 条件）
    const statsWhere: any = { isOutsourced: true }
    if (Object.keys(permissionFilter).length > 0) {
        statsWhere.OR = [
            permissionFilter,
            { assignedToId: user.id }
        ]
    }
    const stats = await prisma.testTask.groupBy({
        by: ['status'],
        where: statsWhere,
        _count: true
    })

    return NextResponse.json({
        list: enrichedList,
        total,
        page,
        pageSize,
        stats: stats.reduce((acc: Record<string, number>, item: { status: string; _count: number }) => {
            acc[item.status] = item._count
            return acc
        }, {} as Record<string, number>)
    })
})

