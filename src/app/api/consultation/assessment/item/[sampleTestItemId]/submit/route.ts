/**
 * @file 提交样品检测项评估API (基于 sampleTestItemId)
 * @desc POST /api/consultation/assessment/item/[sampleTestItemId]/submit
 * @see PRD: docs/plans/2026-01-28-sample-item-assessment-design.md
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, success, badRequest, notFound, forbidden } from '@/lib/api-handler'
import { z } from 'zod'

// 请求体验证 schema
const SubmitAssessmentSchema = z.object({
  feasibility: z.enum(['feasible', 'infeasible'], {
    error: '可行性必须是: feasible 或 infeasible',
  }),
  feasibilityNote: z.string().optional(),
})

/**
 * POST /api/consultation/assessment/item/[sampleTestItemId]/submit
 * 提交样品检测项评估 - 需要登录 + 评估人身份验证
 */
export const POST = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { sampleTestItemId } = await context!.params

  // 解析请求体
  const body = await request.json()

  // 验证请求参数
  const validationResult = SubmitAssessmentSchema.safeParse(body)
  if (!validationResult.success) {
    const errorMessage = validationResult.error.issues?.[0]?.message || '请求参数验证失败'
    badRequest(errorMessage)
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
    notFound('样品检测项不存在')
  }

  // 验证评估人身份 - 只有指定的当前评估人才能提交
  if (sampleTestItem.currentAssessorId !== user.id) {
    forbidden('无权操作，只有指定的评估人才能提交评估')
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
    notFound('咨询单不存在')
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
        assessorId: user.id,
        assessorName: user.name || '',
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

    // 4. 实时查询统计（避免增量计数导致的不一致）
    const allItems = await tx.sampleTestItem.findMany({
      where: { bizId: consultationId, bizType: 'consultation' },
      select: { id: true, assessmentStatus: true },
    })

    let passedCount = 0
    let failedCount = 0
    let pendingCount = 0
    for (const item of allItems) {
      // 当前这条刚更新过，用新状态
      const status = item.id === sampleTestItemId ? itemStatus : item.assessmentStatus
      if (status === 'passed') passedCount++
      else if (status === 'failed') failedCount++
      else pendingCount++ // assessing / pending
    }

    // 5. 确定新状态
    let newConsultationStatus = consultation.status
    if (pendingCount === 0) {
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

  return success({
    sampleTestItemId,
    assessmentId: result.assessment.id,
    consultationStatus: result.consultation.status,
  })
})
