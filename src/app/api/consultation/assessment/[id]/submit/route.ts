import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success, badRequest, notFound } from '@/lib/api-handler'

/**
 * POST /api/consultation/assessment/[id]/submit
 * 提交评估反馈
 */
export const POST = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const data = await request.json()

  // 验证请求参数
  if (!data.conclusion) {
    badRequest('请选择可行性结论')
  }
  if (!data.feedback) {
    badRequest('请输入评估意见')
  }
  if (!['feasible', 'difficult', 'infeasible'].includes(data.conclusion)) {
    badRequest('可行性结论必须是 feasible、difficult 或 infeasible')
  }

  // 查询评估记录
  const assessment = await prisma.consultationAssessment.findUnique({
    where: { id },
    include: {
      consultation: true
    }
  })

  if (!assessment) {
    notFound('评估记录不存在')
  }

  // 验证权限 - 只有评估人本人可以提交
  if (assessment.assessorId !== user?.id) {
    badRequest('无权操作，只有评估人本人可以提交评估反馈')
  }

  // 使用事务更新评估和检查咨询单状态
  await prisma.$transaction(async (tx) => {
    // 更新评估记录
    await tx.consultationAssessment.update({
      where: { id },
      data: {
        conclusion: data.conclusion,
        feedback: data.feedback,
        status: 'completed',
        completedAt: new Date(),
      }
    })

    // 查询该咨询单当前轮次的所有评估
    const allAssessments = await tx.consultationAssessment.findMany({
      where: {
        consultationId: assessment.consultationId,
        round: assessment.round
      }
    })

    // 检查是否所有人都已反馈
    const allCompleted = allAssessments.every(a => 
      a.id === id ? true : a.status === 'completed'
    )

    if (allCompleted) {
      // 检查是否有人给出"不可行"结论
      const hasInfeasible = allAssessments.some(a => 
        a.id === id 
          ? data.conclusion === 'infeasible'
          : a.conclusion === 'infeasible'
      )

      // 更新咨询单状态
      await tx.consultation.update({
        where: { id: assessment.consultationId },
        data: {
          status: hasInfeasible ? 'assessment_failed' : 'following'
        }
      })
    }
  })

  return success({
    message: '评估反馈已提交'
  })
})
