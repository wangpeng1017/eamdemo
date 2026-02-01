/**
 * @file 我的待评估 API (v2)
 * @desc 查询 SampleTestItem 表的 currentAssessorId，按咨询单分组返回
 * @input NextRequest, 当前登录用户
 * @output JSON - 按咨询单分组的待评估任务列表
 */

import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success } from '@/lib/api-handler'

/**
 * GET /api/consultation/assessment/my-pending
 * v2: 查询 SampleTestItem 表中 currentAssessorId 为当前用户且 assessmentStatus=assessing 的记录
 * 按咨询单分组返回
 */
export const GET = withAuth(async (
  request: NextRequest,
  user
) => {
  // v2: 查询 SampleTestItem 表
  const pendingItems = await prisma.sampleTestItem.findMany({
    where: {
      currentAssessorId: user?.id,
      assessmentStatus: 'assessing',
      bizType: 'consultation',
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // 如果没有待评估项, 直接返回空数组
  if (pendingItems.length === 0) {
    return success([])
  }

  // 获取所有涉及的咨询单ID
  const consultationIds = [...new Set(pendingItems.map(item => item.bizId))]

  // 批量查询咨询单信息
  const consultations = await prisma.consultation.findMany({
    where: {
      id: { in: consultationIds },
    },
    include: {
      client: true,
    },
  })

  // 构建咨询单 Map
  const consultationMap = new Map(
    consultations.map(c => [c.id, c])
  )

  // 按咨询单分组
  const groupedMap = new Map<string, typeof pendingItems>()
  for (const item of pendingItems) {
    const existing = groupedMap.get(item.bizId) || []
    groupedMap.set(item.bizId, [...existing, item])
  }

  // 格式化输出
  const formattedData = Array.from(groupedMap.entries()).map(([bizId, items]) => {
    const consultation = consultationMap.get(bizId)
    return {
      consultationId: bizId,
      consultationNo: consultation?.consultationNo || '',
      clientName: consultation?.client?.name || '未知客户',
      testItems: consultation?.testItems
        ? JSON.parse(consultation.testItems as string)
        : [],
      createdAt: consultation?.createdAt,
      sampleTestItems: items.map(item => ({
        id: item.id,
        sampleName: item.sampleName,
        testItemName: item.testItemName,
        testStandard: item.testStandard,
        assessmentStatus: item.assessmentStatus,
      })),
    }
  })

  return success(formattedData)
})
