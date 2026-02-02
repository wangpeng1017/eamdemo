import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success, badRequest, notFound } from '@/lib/api-handler'

/**
 * POST /api/consultation/[id]/assessment
 * 发起评估 - 为咨询单选择评估人
 */
export const POST = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const data = await request.json()

  // 验证请求参数
  if (!data.assessors || !Array.isArray(data.assessors) || data.assessors.length === 0) {
    badRequest('请选择至少一个评估人')
  }

  // 检查咨询单是否存在
  const consultation = await prisma.consultation.findUnique({
    where: { id },
    include: {
      assessments: {
        where: { status: 'pending' }
      }
    }
  })

  if (!consultation) {
    notFound('咨询单不存在')
  }

  // 验证咨询单状态 - 只有following状态可以发起评估
  if (consultation.status !== 'following') {
    badRequest(`当前状态（${consultation.status}）不能发起评估，只有跟进中的咨询单可以发起评估`)
  }

  // 检查是否已有进行中的评估
  if (consultation.assessments && consultation.assessments.length > 0) {
    badRequest('该咨询单已有进行中的评估，请等待评估完成')
  }

  // 查询当前最大轮次
  const maxRoundAssessment = await prisma.consultationAssessment.findFirst({
    where: { consultationId: id },
    orderBy: { round: 'desc' },
    select: { round: true }
  })
  const nextRound = (maxRoundAssessment?.round || 0) + 1

  // 使用事务创建评估记录并更新咨询单状态
  await prisma.$transaction(async (tx) => {
    // 为每个评估人创建评估记录
    await tx.consultationAssessment.createMany({
      data: data.assessors.map((assessor: { id: string; name: string }) => ({
        consultationId: id,
        assessorId: assessor.id,
        assessorName: assessor.name,
        round: nextRound,
        status: 'pending',
        requestedBy: user?.name || 'unknown',
      }))
    })

    // 更新咨询单状态为评估中
    await tx.consultation.update({
      where: { id },
      data: { status: 'assessing' }
    })
  })

  return success({
    message: `评估已发起，等待 ${data.assessors.length} 人反馈`,
    round: nextRound,
    assessorCount: data.assessors.length
  })
})

/**
 * GET /api/consultation/[id]/assessment
 * 查询评估详情 - 同时查询新旧两种评估记录
 */
export const GET = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params

  // 查询咨询单
  const consultation = await prisma.consultation.findUnique({
    where: { id },
  })

  if (!consultation) {
    notFound('咨询单不存在')
  }

  // 查询新版评估记录（ConsultationSampleAssessment）
  const sampleAssessments = await prisma.consultationSampleAssessment.findMany({
    where: { consultationId: id },
    include: {
      sampleTestItem: {
        select: {
          sampleName: true,
          testItemName: true,
          testStandard: true,
        }
      }
    },
    orderBy: [
      { round: 'desc' },
      { assessedAt: 'asc' }
    ]
  })

  // 查询旧版评估记录（ConsultationAssessment）
  const oldAssessments = await prisma.consultationAssessment.findMany({
    where: { consultationId: id },
    orderBy: [
      { round: 'desc' },
      { requestedAt: 'asc' }
    ]
  })

  // 合并评估记录，优先使用新版数据
  // 将新版评估记录格式化为与旧版兼容的格式
  const formattedSampleAssessments = sampleAssessments.map(a => ({
    id: a.id,
    assessorId: a.assessorId,
    assessorName: a.assessorName || '',
    conclusion: a.feasibility,
    feedback: a.feasibilityNote,
    round: a.round,
    status: 'completed', // 新版记录都是已完成的
    requestedAt: a.createdAt,
    completedAt: a.assessedAt,
    requestedBy: '-',
    // 额外信息
    sampleName: a.sampleTestItem?.sampleName || '-',
    testItemName: a.sampleTestItem?.testItemName || '-',
    testStandard: a.sampleTestItem?.testStandard || '-',
  }))

  // 获取最大轮次
  const newMaxRound = sampleAssessments.length > 0
    ? Math.max(...sampleAssessments.map(a => a.round))
    : 0
  const oldMaxRound = oldAssessments.length > 0
    ? Math.max(...oldAssessments.map(a => a.round))
    : 0
  const maxRound = Math.max(newMaxRound, oldMaxRound)

  // 如果有新版记录，返回新版；否则返回旧版
  const assessments = formattedSampleAssessments.length > 0
    ? formattedSampleAssessments
    : oldAssessments

  return success({
    consultationId: id,
    status: consultation.status,
    maxRound,
    assessments
  })
})
