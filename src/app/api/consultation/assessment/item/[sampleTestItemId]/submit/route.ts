/**
 * @file 提交样品检测项评估API (基于 sampleTestItemId)
 * @desc POST /api/consultation/assessment/item/[sampleTestItemId]/submit
 * @see PRD: docs/plans/2026-01-28-sample-item-assessment-design.md
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'

// 请求体验证 schema
const SubmitAssessmentSchema = z.object({
  feasibility: z.enum(['feasible', 'difficult', 'infeasible'], {
    errorMap: () => ({ message: '可行性必须是: feasible, difficult, 或 infeasible' }),
  }),
  feasibilityNote: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sampleTestItemId: string }> }
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

    const { sampleTestItemId } = await context.params

    // 解析请求体
    const body = await request.json()

    // 验证请求参数
    const validationResult = SubmitAssessmentSchema.safeParse(body)
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors?.[0]?.message || '请求参数验证失败'
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      )
    }

    const { feasibility, feasibilityNote } = validationResult.data

    // 查询样品检测项
    const sampleTestItem = await prisma.sampleTestItem.findUnique({
      where: { id: sampleTestItemId },
      select: {
        id: true,
        bizId: true,
        bizType: true,
        assessmentStatus: true,
        currentAssessorId: true,
        currentAssessorName: true,
      },
    })

    if (!sampleTestItem) {
      return NextResponse.json(
        { success: false, error: '样品检测项不存在' },
        { status: 404 }
      )
    }

    const consultationId = sampleTestItem.bizId

    // 查询咨询单
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
      select: {
        id: true,
        status: true,
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

    // 查找最新的评估记录
    const existingAssessments = await prisma.consultationSampleAssessment.findMany({
      where: { sampleTestItemId },
      orderBy: { round: 'desc' },
      take: 1,
    })

    const currentRound = existingAssessments.length > 0 ? existingAssessments[0].round : 0
    const newRound = currentRound + 1

    // 在事务中执行提交评估
    const result = await prisma.$transaction(async (tx) => {
      // 1. 将所有旧评估记录标记为 isLatest = false
      await tx.consultationSampleAssessment.updateMany({
        where: { sampleTestItemId },
        data: { isLatest: false },
      })

      // 2. 创建新评估记录
      const newAssessment = await tx.consultationSampleAssessment.create({
        data: {
          consultationId,
          sampleTestItemId,
          assessorId: session.user.id,
          assessorName: session.user.name || '',
          feasibility,
          feasibilityNote: feasibilityNote || null,
          assessedAt: new Date(),
          round: newRound,
          isLatest: true,
        },
      })

      // 3. 更新样品检测项的评估状态
      const itemStatus = feasibility === 'feasible' ? 'passed' : 'failed'
      await tx.sampleTestItem.update({
        where: { id: sampleTestItemId },
        data: {
          assessmentStatus: itemStatus,
        },
      })

      // 4. 计算新的评估统计
      // 如果之前是 pending，现在变成 passed/failed
      let passedCount = consultation.assessmentPassedCount
      let failedCount = consultation.assessmentFailedCount
      let pendingCount = consultation.assessmentPendingCount

      if (sampleTestItem.assessmentStatus === 'assessing') {
        // 从 assessing 变为 passed/failed
        if (feasibility === 'feasible') {
          passedCount += 1
        } else {
          failedCount += 1
        }
        pendingCount -= 1
      } else if (sampleTestItem.assessmentStatus === 'passed') {
        // 重新评估：从 passed 变为 failed
        if (feasibility !== 'feasible') {
          passedCount -= 1
          failedCount += 1
        }
      } else if (sampleTestItem.assessmentStatus === 'failed') {
        // 重新评估：从 failed 变为 passed
        if (feasibility === 'feasible') {
          failedCount -= 1
          passedCount += 1
        }
      }

      // 5. 确定新状态
      let newConsultationStatus = consultation.status
      if (pendingCount === 0) {
        // 所有项都已评估
        if (failedCount > 0) {
          newConsultationStatus = 'assessment_failed'
        } else {
          newConsultationStatus = 'assessment_passed'
        }
      }

      // 6. 更新咨询单
      const updatedConsultation = await tx.consultation.update({
        where: { id: consultationId },
        data: {
          status: newConsultationStatus,
          assessmentPassedCount: passedCount,
          assessmentFailedCount: failedCount,
          assessmentPendingCount: pendingCount,
        },
      })

      return {
        assessment: newAssessment,
        consultation: updatedConsultation,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        sampleTestItemId,
        assessmentId: result.assessment.id,
        consultationStatus: result.consultation.status,
      },
    })

  } catch (error) {
    console.error('提交评估失败:', error)
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    )
  }
}
