/**
 * @file 获取咨询评估详情API
 * @desc GET /api/consultation/[id]/assessment/details
 * @see PRD: docs/plans/2026-01-28-sample-item-assessment-design.md
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
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

    const { id: consultationId } = await context.params

    // 查询咨询单
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
      select: {
        id: true,
        consultationNo: true,
        status: true,
        assessmentVersion: true,
        assessmentTotalCount: true,
        assessmentPassedCount: true,
        assessmentFailedCount: true,
        assessmentPendingCount: true,
      },
    })

    if (!consultation) {
      return NextResponse.json(
        { success: false, error: '咨询单不存在' },
        { status: 404 }
      )
    }

    // 查询样品检测项
    const sampleTestItems = await prisma.sampleTestItem.findMany({
      where: {
        bizType: 'consultation',
        bizId: consultationId,
      },
      select: {
        id: true,
        sampleName: true,
        testItemName: true,
        quantity: true,
        material: true,
        assessmentStatus: true,
        currentAssessorId: true,
        currentAssessorName: true,
      },
    })

    // 查询所有评估记录
    const assessments = await prisma.consultationSampleAssessment.findMany({
      where: {
        consultationId,
      },
      select: {
        id: true,
        sampleTestItemId: true,
        assessorId: true,
        assessorName: true,
        feasibility: true,
        feasibilityNote: true,
        assessedAt: true,
        round: true,
        isLatest: true,
      },
      orderBy: {
        round: 'asc',
      },
    })

    // 将评估记录按样品检测项分组
    const assessmentMap = new Map<string, typeof assessments>()
    for (const assessment of assessments) {
      const itemId = assessment.sampleTestItemId
      if (!assessmentMap.has(itemId)) {
        assessmentMap.set(itemId, [])
      }
      assessmentMap.get(itemId)!.push(assessment)
    }

    // 组装样品检测项数据
    const sampleItems = sampleTestItems.map((item) => {
      const itemAssessments = assessmentMap.get(item.id) || []
      const latestAssessment = itemAssessments.find((a) => a.isLatest)

      return {
        id: item.id,
        sampleName: item.sampleName,
        testItem: item.testItemName,
        quantity: item.quantity,
        material: item.material,
        assessmentStatus: item.assessmentStatus,
        currentAssessor: item.currentAssessorName,
        latestAssessment: latestAssessment
          ? {
              feasibility: latestAssessment.feasibility,
              feasibilityNote: latestAssessment.feasibilityNote,
              assessedAt: latestAssessment.assessedAt.toISOString(),
              round: latestAssessment.round,
            }
          : undefined,
        assessmentHistory: itemAssessments.map((a) => ({
          feasibility: a.feasibility,
          feasibilityNote: a.feasibilityNote,
          assessedAt: a.assessedAt.toISOString(),
          round: a.round,
        })),
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        consultation: {
          id: consultation.id,
          consultationNo: consultation.consultationNo,
          status: consultation.status,
          assessmentVersion: consultation.assessmentVersion,
          assessmentTotalCount: consultation.assessmentTotalCount,
          assessmentPassedCount: consultation.assessmentPassedCount,
          assessmentFailedCount: consultation.assessmentFailedCount,
          assessmentPendingCount: consultation.assessmentPendingCount,
        },
        sampleItems,
      },
    })
  } catch (error) {
    console.error('获取评估详情失败:', error)
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    )
  }
}
