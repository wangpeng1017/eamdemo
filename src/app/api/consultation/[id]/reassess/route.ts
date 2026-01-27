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

  // 验证请求参数
  if (!data.assessors || !Array.isArray(data.assessors) || data.assessors.length === 0) {
    badRequest('请选择至少一个评估人')
  }

  // 查询咨询单
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

  // 验证状态 - 只有assessment_failed状态可以重新评估
  if (consultation.status !== 'assessment_failed') {
    badRequest(\`当前状态（\${consultation.status}）不能重新评估，只有评估未通过的咨询单可以重新评估\`)
  }

  // 获取下一轮次
  const nextRound = (consultation.assessments[0]?.round || 0) + 1

  // 使用事务更新咨询单并创建新评估
  await prisma.\$transaction(async (tx) => {
    // 更新咨询单的业务数据
    const updateData: any = {
      status: 'assessing'
    }
    
    if (data.consultationData) {
      if (data.consultationData.testItems) {
        updateData.testItems = JSON.stringify(data.consultationData.testItems)
      }
      if (data.consultationData.clientRequirement) {
        updateData.clientRequirement = data.consultationData.clientRequirement
      }
      // 可以添加其他需要修改的字段
    }

    await tx.consultation.update({
      where: { id },
      data: updateData
    })

    // 为每个评估人创建新轮次的评估记录
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
  })

  return success({
    message: \`已开始第 \${nextRound} 轮评估，等待 \${data.assessors.length} 人反馈\`,
    round: nextRound,
    assessorCount: data.assessors.length
  })
})
