/**
 * @file route.ts
 * @desc 客户单位审批 API - 提交客户审批
 * @method POST
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { approvalEngine } from '@/lib/approval/engine'
import { withErrorHandler, success, notFound, badRequest } from '@/lib/api-handler'

/**
 * 提交客户单位审批
 * POST /api/client/:id/approval
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

    // 检查客户是否存在
    const client = await prisma.client.findUnique({
      where: { id },
    })

    if (!client) {
      notFound('客户不存在')
    }

    // 检查客户状态
    if (client.status !== 'draft') {
      badRequest('只有草稿状态可以提交审批')
    }

    // 提交审批
    const instance = await approvalEngine.submit({
      bizType: 'client',
      bizId: id,
      flowCode: 'CLIENT_APPROVAL',
      submitterId: data.submitterId,
      submitterName: data.submitterName,
    })

    // 更新客户状态
    await prisma.client.update({
      where: { id },
      data: { status: 'pending' },
    })

    return success(instance)
  }
)
