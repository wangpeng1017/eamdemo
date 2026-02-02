/**
 * @file 我的评估历史API
 * @desc GET /api/consultation/assessment/my-history
 * @param status - 评估状态过滤：assessed(已评估), rejected(已驳回)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: '请先登录' },
                { status: 401 }
            )
        }

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status') || 'assessed'

        const userId = session.user.id

        // 根据状态查询当前用户评估过的记录
        // 评估完成后状态是 passed/failed，不是 assessed
        const statusFilter = status === 'assessed'
            ? { in: ['passed', 'failed'] as string[] }
            : status

        // SampleTestItem使用多态关联(bizType/bizId)
        const items = await prisma.sampleTestItem.findMany({
            where: {
                currentAssessorId: userId,
                assessmentStatus: statusFilter,
                bizType: 'consultation',
            },
            include: {
                assessments: {
                    where: { isLatest: true },
                    take: 1,
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
            take: 100,
        })

        // 获取相关的咨询单信息
        const bizIds = [...new Set(items.map(item => item.bizId))]
        const consultations = await prisma.consultation.findMany({
            where: { id: { in: bizIds } },
            select: {
                id: true,
                consultationNo: true,
                client: {
                    select: { name: true },
                },
            },
        })
        const consultationMap = new Map(consultations.map(c => [c.id, c]))

        // 格式化返回数据
        const formattedItems = items.map(item => {
            const consultation = consultationMap.get(item.bizId)
            const latestAssessment = item.assessments?.[0]
            return {
                id: item.id,
                sampleName: item.sampleName,
                testItemName: item.testItemName,
                testStandard: item.testStandard,
                quantity: item.quantity,
                material: item.material,
                assessmentStatus: item.assessmentStatus,
                currentAssessorId: item.currentAssessorId,
                currentAssessorName: item.currentAssessorName,
                feasibility: latestAssessment?.feasibility || null,
                feasibilityNote: latestAssessment?.feasibilityNote || null,
                assessedAt: latestAssessment?.assessedAt || item.updatedAt,
                consultationId: item.bizId,
                consultationNo: consultation?.consultationNo || '-',
                clientName: consultation?.client?.name || '-',
            }
        })

        return NextResponse.json({
            success: true,
            data: formattedItems,
        })
    } catch (error) {
        console.error('获取评估历史失败:', error)
        return NextResponse.json(
            { success: false, error: '获取评估历史失败' },
            { status: 500 }
        )
    }
}
