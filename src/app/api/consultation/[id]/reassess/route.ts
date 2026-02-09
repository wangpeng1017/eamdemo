import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success, badRequest, notFound } from '@/lib/api-handler'

/**
 * POST /api/consultation/[id]/reassess
 * 修改需求并重新评估
 */
export const POST = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const data = await request.json()

  // 提取样品检测项数据
  const sampleTestItems = data.sampleTestItems || []

  // 查询咨询单以获取当前轮次
  const consultation = await prisma.consultation.findUnique({
    where: { id },
    include: {
      assessments: {
        orderBy: { round: 'desc' },
        take: 1
      }
    }
  })

  if (!consultation) {
    notFound('咨询单不存在')
  }

  // 获取下一轮次
  const nextRound = (consultation.assessments[0]?.round || 0) + 1

  // 准备咨询单更新数据（逻辑同 PUT）
  const updateData: any = {}
  const allowedFields = [
    'clientId',
    'clientContactPerson',
    'clientReportDeadline',
    'budgetRange',
    'followerId',
    'clientRequirement',
    'estimatedQuantity'
  ]

  allowedFields.forEach(field => {
    if (data[field] !== undefined) {
      updateData[field] = data[field]
    }
  })

  if (Array.isArray(data.testItems)) {
    updateData.testItems = JSON.stringify(data.testItems)
  }

  // 状态设置为评估中
  updateData.status = 'assessing'

  // 处理评估计数
  const hasAssessors = sampleTestItems.some((item: any) => item.assessorId)
  const assessorCount = sampleTestItems.filter((item: any) => item.assessorId).length

  if (hasAssessors) {
    updateData.assessmentVersion = 'v2'
    updateData.assessmentTotalCount = assessorCount
    updateData.assessmentPendingCount = assessorCount
    updateData.assessmentPassedCount = 0
    updateData.assessmentFailedCount = 0
  }

  // 使用事务更新并创建新轮次评估
  const result = await prisma.$transaction(async (tx) => {
    // 1. 更新咨询单
    await tx.consultation.update({
      where: { id },
      data: updateData
    })

    // 2. 更新样品检测项（逻辑同 PUT）
    await tx.sampleTestItem.deleteMany({
      where: { bizType: 'consultation', bizId: id },
    })

    if (sampleTestItems.length > 0) {
      await Promise.all(
        sampleTestItems.map((item: any, index: number) =>
          tx.sampleTestItem.create({
            data: {
              bizType: 'consultation',
              bizId: id,
              sampleName: item.sampleName || '未命名样品',
              batchNo: item.batchNo || null,
              material: item.material || null,
              appearance: item.appearance || null,
              quantity: parseInt(item.quantity) || 1,
              testTemplateId: item.testTemplateId || null,
              testItemName: item.testItemName || '',
              testStandard: item.testStandard || null,
              judgmentStandard: item.judgmentStandard || null,
              currentAssessorId: item.assessorId || null,
              currentAssessorName: item.assessorName || null,
              assessmentStatus: item.assessorId ? 'assessing' : 'pending',
              sortOrder: index,
            },
          })
        )
      )
    }

    // 3. 创建新轮次的评估记录
    // 找出所有需要参与评估的人（去重）
    const assessorMap = new Map<string, string>()
    sampleTestItems.forEach((item: any) => {
      if (item.assessorId && item.assessorName) {
        assessorMap.set(item.assessorId, item.assessorName)
      }
    })

    const uniqueAssessors = Array.from(assessorMap.entries()).map(([id, name]) => ({ id, name }))

    if (uniqueAssessors.length > 0) {
      await tx.consultationAssessment.createMany({
        data: uniqueAssessors.map((assessor: any) => ({
          consultationId: id,
          assessorId: assessor.id,
          assessorName: assessor.name,
          round: nextRound,
          status: 'pending',
          requestedBy: user?.name || 'unknown',
        }))
      })
    }

    return { round: nextRound, assessorCount: uniqueAssessors.length }
  })

  return success({
    message: `已开始第 ${result.round} 轮评估，共 ${result.assessorCount} 名评估人`,
    round: result.round,
    assessorCount: result.assessorCount
  })
})
