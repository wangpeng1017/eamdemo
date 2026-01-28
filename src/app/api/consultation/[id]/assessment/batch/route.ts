/**
 * @file 批量分配样品检测项评估API
 * @desc POST /api/consultation/[id]/assessment/batch
 * @see PRD: docs/plans/2026-01-28-sample-item-assessment-design.md
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'

// 请求体验证 schema
const BatchAssessmentSchema = z.object({
  assignments: z.array(
    z.object({
      sampleTestItemId: z.string().min(1, '样品检测项ID不能为空'),
      assessorId: z.string().min(1, '评估人ID不能为空'),
      assessorName: z.string().min(1, '评估人姓名不能为空'),
    })
  ).min(1, '至少需要分配一个样品检测项'),
})

export async function POST(
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

    // 解析请求体
    const body = await request.json()

    // 验证请求参数
    const validationResult = BatchAssessmentSchema.safeParse(body)
    if (!validationResult.success) {
      // 提取第一个错误消息
      const formattedErrors = validationResult.error.format()
      let errorMessage = '请求参数验证失败'

      // 尝试获取更具体的错误消息
      if (formattedErrors.assignments?._errors?.[0]) {
        errorMessage = formattedErrors.assignments._errors[0]
      } else if (validationResult.error.errors?.[0]?.message) {
        errorMessage = validationResult.error.errors[0].message
      }

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      )
    }

    const { assignments } = validationResult.data

    // 检查咨询单是否存在
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
      select: {
        id: true,
        status: true,
        assessmentVersion: true,
      },
    })

    if (!consultation) {
      return NextResponse.json(
        { success: false, error: '咨询单不存在' },
        { status: 404 }
      )
    }

    // 检查咨询单状态
    if (consultation.status !== 'following') {
      return NextResponse.json(
        { success: false, error: '咨询单状态必须是跟进中才能发起评估' },
        { status: 400 }
      )
    }

    // 提取所有样品检测项ID
    const sampleTestItemIds = assignments.map(a => a.sampleTestItemId)

    // 检查样品检测项是否存在且属于该咨询单
    const sampleTestItems = await prisma.sampleTestItem.findMany({
      where: {
        id: { in: sampleTestItemIds },
        bizType: 'consultation',
        bizId: consultationId,
      },
      select: { id: true },
    })

    if (sampleTestItems.length !== sampleTestItemIds.length) {
      return NextResponse.json(
        { success: false, error: '部分样品检测项不存在或不属于该咨询单' },
        { status: 400 }
      )
    }

    // 在事务中执行批量更新
    const result = await prisma.$transaction(async (tx) => {
      // 1. 更新样品检测项状态和评估人信息
      for (const assignment of assignments) {
        await tx.sampleTestItem.updateMany({
          where: { id: assignment.sampleTestItemId },
          data: {
            assessmentStatus: 'assessing',
            currentAssessorId: assignment.assessorId,
            currentAssessorName: assignment.assessorName,
          },
        })
      }

      // 2. 更新咨询单状态和统计信息
      const updatedConsultation = await tx.consultation.update({
        where: { id: consultationId },
        data: {
          status: 'assessing',
          assessmentTotalCount: assignments.length,
          assessmentPendingCount: assignments.length,
          assessmentPassedCount: 0,
          assessmentFailedCount: 0,
        },
      })

      return {
        assignedCount: assignments.length,
        consultation: updatedConsultation,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        consultationId,
        totalAssignments: assignments.length,
        createdAssessments: result.assignedCount,
      },
    })

  } catch (error) {
    console.error('批量分配评估失败:', error)
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    )
  }
}
