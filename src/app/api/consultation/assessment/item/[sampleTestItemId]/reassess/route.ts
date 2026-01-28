/**
 * @file 重新评估样品检测项API
 * @desc POST /api/consultation/assessment/item/[sampleTestItemId]/reassess
 * @see PRD: docs/plans/2026-01-28-sample-item-assessment-design.md
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'

// 请求体验证 schema
const ReassessSchema = z.object({
  assessorId: z.string().min(1, '评估人ID不能为空'),
  assessorName: z.string().min(1, '评估人姓名不能为空'),
  modifiedData: z.object({
    sampleName: z.string().optional(),
    testItemName: z.string().optional(),
    quantity: z.number().optional(),
    material: z.string().optional(),
  }).optional(),
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
    const validationResult = ReassessSchema.safeParse(body)
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors?.[0]?.message || '请求参数验证失败'
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      )
    }

    const { assessorId, assessorName, modifiedData } = validationResult.data

    // 查询样品检测项
    const sampleTestItem = await prisma.sampleTestItem.findUnique({
      where: { id: sampleTestItemId },
      select: {
        id: true,
        bizId: true,
        bizType: true,
        assessmentStatus: true,
        sampleName: true,
        testItemName: true,
        quantity: true,
        material: true,
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

    // 查询该样品检测项的所有评估记录
    const existingAssessments = await prisma.consultationSampleAssessment.findMany({
      where: { sampleTestItemId },
      select: {
        id: true,
        round: true,
        isLatest: true,
      },
      orderBy: {
        round: 'desc',
      },
    })

    // 计算新的 round - 使用 Math.max 确保找到最大值
    const maxRound = existingAssessments.length > 0
      ? Math.max(...existingAssessments.map(a => a.round))
      : 0
    const newRound = maxRound + 1

    // 在事务中执行重新评估
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
          assessorId,
          assessorName,
          round: newRound,
          isLatest: true,
          feasibility: 'feasible', // 初始值，待评估人提交
          feasibilityNote: null,
          assessedAt: new Date(),
        },
      })

      // 3. 更新样品检测项
      const updateData: any = {
        assessmentStatus: 'assessing',
        currentAssessorId: assessorId,
        currentAssessorName: assessorName,
      }

      // 如果提供了修改数据，合并更新
      if (modifiedData) {
        if (modifiedData.sampleName !== undefined) {
          updateData.sampleName = modifiedData.sampleName
        }
        if (modifiedData.testItemName !== undefined) {
          updateData.testItemName = modifiedData.testItemName
        }
        if (modifiedData.quantity !== undefined) {
          updateData.quantity = modifiedData.quantity
        }
        if (modifiedData.material !== undefined) {
          updateData.material = modifiedData.material
        }
      }

      await tx.sampleTestItem.update({
        where: { id: sampleTestItemId },
        data: updateData,
      })

      // 4. 重新计算咨询单统计
      let newPendingCount = consultation.assessmentPendingCount
      let newFailedCount = consultation.assessmentFailedCount

      // 如果该项之前是 failed 状态，现在重新评估
      if (sampleTestItem.assessmentStatus === 'failed') {
        newFailedCount -= 1
        newPendingCount += 1
      } else if (sampleTestItem.assessmentStatus === 'passed') {
        // 如果之前是 passed，现在重新评估（罕见情况）
        consultation.assessmentPassedCount -= 1
        newPendingCount += 1
      }

      // 5. 更新咨询单状态
      const updatedConsultation = await tx.consultation.update({
        where: { id: consultationId },
        data: {
          status: 'assessing',
          assessmentPendingCount: newPendingCount,
          assessmentFailedCount: newFailedCount,
        },
      })

      return {
        newAssessment,
        consultation: updatedConsultation,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        sampleTestItemId,
        newAssessmentId: result.newAssessment.id,
        round: newRound,
      },
    })

  } catch (error) {
    console.error('重新评估失败:', error)
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    )
  }
}
