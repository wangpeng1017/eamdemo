/**
 * @file route.ts
 * @desc 统一审批 API - 提交审批、查询列表
 * @method POST, GET
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { approvalEngine } from '@/lib/approval/engine'
import { withErrorHandler, success, validateRequired } from '@/lib/api-handler'

/**
 * 查询审批实例列表
 * GET /api/approval
 *
 * @query status - 审批状态 (pending/approved/rejected/cancelled)
 * @query submitterId - 提交人ID
 * @query bizType - 业务类型 (quotation/contract/client)
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const submitterId = searchParams.get('submitterId')
  const bizType = searchParams.get('bizType')

  const where: any = {}

  if (status) {
    where.status = status
  }

  if (submitterId) {
    where.submitterId = submitterId
  }

  if (bizType) {
    where.bizType = bizType
  }

  // 查询审批实例
  const instances = await prisma.approvalInstance.findMany({
    where,
    include: {
      quotation: {
        select: {
          quotationNo: true,
          subtotal: true,
          taxTotal: true,
        },
      },
      contract: {
        select: {
          contractNo: true,
          contractAmount: true,
        },
      },
      client: {
        select: {
          name: true,
          shortName: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return success(instances)
})

/**
 * 提交审批
 * POST /api/approval
 *
 * @body {
 *   bizType: string      // 业务类型 (quotation/contract/client)
 *   bizId: string        // 业务ID
 *   flowCode: string     // 流程编码
 *   submitterId: string  // 提交人ID
 *   submitterName: string // 提交人姓名
 * }
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const data = await request.json()

  validateRequired(data, ['bizType', 'bizId', 'flowCode', 'submitterId', 'submitterName'])

  const instance = await approvalEngine.submit({
    bizType: data.bizType,
    bizId: data.bizId,
    flowCode: data.flowCode,
    submitterId: data.submitterId,
    submitterName: data.submitterName,
  })

  return success(instance)
})
