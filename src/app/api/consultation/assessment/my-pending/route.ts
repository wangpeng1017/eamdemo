import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success } from '@/lib/api-handler'

/**
 * GET /api/consultation/assessment/my-pending
 * 查询我的待评估列表
 */
export const GET = withAuth(async (
  request: NextRequest,
  user
) => {
  // 查询当前用户的待评估记录
  const assessments = await prisma.consultationAssessment.findMany({
    where: {
      assessorId: user?.id,
      status: 'pending'
    },
    include: {
      consultation: {
        include: {
          client: true
        }
      }
    },
    orderBy: {
      requestedAt: 'desc'
    }
  })

  // 格式化数据
  const formattedData = assessments.map(assessment => ({
    id: assessment.id,
    consultationNo: assessment.consultation.consultationNo,
    clientName: assessment.consultation.client?.name || '未知客户',
    testItems: assessment.consultation.testItems 
      ? JSON.parse(assessment.consultation.testItems)
      : [],
    requestedBy: assessment.requestedBy,
    requestedAt: assessment.requestedAt,
    round: assessment.round,
  }))

  return success(formattedData)
})
