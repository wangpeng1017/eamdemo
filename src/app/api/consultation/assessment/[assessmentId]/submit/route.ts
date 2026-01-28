/**
 * @file 提交样品检测项评估API
 * @desc POST /api/consultation/assessment/[assessmentId]/submit
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
  context: { params: Promise<{ assessmentId: string }> }
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

    const { assessmentId } = await context.params

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

    // 查询评估记录
    const assessment = await prisma.consultationSampleAssessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        consultationId: true,
        sampleTestItemId: true,
        assessorId: true,
        round: true,
      },
    })

    if (!assessment) {
      return NextResponse.json(
        { success: false, error: '评估记录不存在' },
        { status: 404 }
      )
    }

    // 查询样品检测项
    const sampleTestItem = await prisma.sampleTestItem.findUnique({
      where: { id: assessment.sampleTestItemId },
    })

    if (!sampleTestItem) {
      return NextResponse.json(
        { success: false, error: '样品检测项不存在' },
        { status: 404 }
      )
    }

    // 查询咨询单
    const consultation = await prisma.consultation.findUnique({
      where: { id: assessment.consultationId },
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

    // 在事务中执行提交评估
    const result = await prisma.$transaction(async (tx) => {
      // 1. 更新评估记录
      const updatedAssessment = await tx.consultationSampleAssessment.update({
        where: { id: assessmentId },
        data: {
          feasibility,
          feasibilityNote: feasibilityNote || null,
          assessedAt: new Date(),
          isLatest: true,
        },
      })

      // 2. 将该样品检测项的其他旧评估记录标记为 isLatest = false
      await tx.consultationSampleAssessment.updateMany({
        where: {
          sampleTestItemId: assessment.sampleTestItemId,
          id: { not: assessmentId },
        },
        data: {
          isLatest: false,
        },
      })

      // 3. 更新样品检测项的评估状态
      const itemStatus = feasibility === 'feasible' ? 'passed' : 'failed'
      const updatedItem = await tx.sampleTestItem.update({
        where: { id: assessment.sampleTestItemId },
        data: {
          assessmentStatus: itemStatus,
        },
      })

      // 4. 计算新的评估统计
      const passedCount = feasibility === 'feasible'
        ? consultation.assessmentPassedCount + 1
        : consultation.assessmentPassedCount

      const failedCount = feasibility !== 'feasible'
        ? consultation.assessmentFailedCount + 1
        : consultation.assessmentFailedCount

      const pendingCount = consultation.assessmentPendingCount - 1

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
        where: { id: assessment.consultationId },
        data: {
          status: newConsultationStatus,
          assessmentPassedCount: passedCount,
          assessmentFailedCount: failedCount,
          assessmentPendingCount: pendingCount,
        },
      })

      return {
        assessment: updatedAssessment,
        item: updatedItem,
        consultation: updatedConsultation,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        assessmentId,
        sampleTestItemId: assessment.sampleTestItemId,
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
