/**
 * @file route.ts
 * @desc 合同审批 API - 提交合同审批
 * @method POST
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { approvalEngine } from '@/lib/approval/engine'
import { withErrorHandler, success, notFound, badRequest } from '@/lib/api-handler'

/**
 * 提交合同审批
 * POST /api/contract/:id/approval
 *
 * @body {
 *   submitterId: string
 *   submitterName: string
 * }
 */
export const POST = withErrorHandler(
  async (
    request: NextRequest,
    context?: { params: Promise<Record<string, string>> }
  ) => {
    const { id } = await context!.params
    const data = await request.json()

    // 检查合同是否存在
    const contract = await prisma.contract.findUnique({
      where: { id },
    })

    if (!contract) {
      notFound('合同不存在')
    }

    // 检查合同状态
    if (contract.status !== 'draft') {
      badRequest('只有草稿状态可以提交审批')
    }

    // 提交审批
    const instance = await approvalEngine.submit({
      bizType: 'contract',
      bizId: id,
      flowCode: 'CONTRACT_APPROVAL',
      submitterId: data.submitterId,
      submitterName: data.submitterName,
    })

    // 更新合同状态
    await prisma.contract.update({
      where: { id },
      data: { status: 'pending_approval' },
    })

    return success(instance)
  }
)
