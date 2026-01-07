/**
 * @file route.ts
 * @desc 审批操作 API - 查询详情/审批/撤回
 * @method GET, PATCH, DELETE
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { approvalEngine } from '@/lib/approval/engine'
import { withErrorHandler, success, notFound, badRequest } from '@/lib/api-handler'

/**
 * 获取审批详情
 * GET /api/approval/:id
 */
export const GET = withErrorHandler(
  async (
    request: NextRequest,
    context?: { params: Promise<Record<string, string>> }
  ) => {
    const { id } = await context!.params

    const instance = await prisma.approvalInstance.findUnique({
      where: { id },
      include: { records: { orderBy: { createdAt: 'desc' } } },
    })

    if (!instance) {
      notFound('审批实例不存在')
    }

    // 获取流程配置
    const flow = await approvalEngine.getFlowConfig(instance.flowCode)
    const nodes = flow ? approvalEngine.parseNodes(flow) : []

    return success({
      ...instance,
      flowConfig: nodes,
    })
  }
)

/**
 * 审批操作 (通过/驳回)
 * PATCH /api/approval/:id
 *
 * @body {
 *   action: 'approve' | 'reject'
 *   approverId: string
 *   approverName: string
 *   comment?: string
 * }
 */
export const PATCH = withErrorHandler(
  async (
    request: NextRequest,
    context?: { params: Promise<Record<string, string>> }
  ) => {
    const { id } = await context!.params
    const data = await request.json()

    if (!data.action || !data.approverId || !data.approverName) {
      badRequest('缺少必填字段')
    }

    if (data.action !== 'approve' && data.action !== 'reject') {
      badRequest('无效的审批动作')
    }

    await approvalEngine.approve({
      instanceId: id,
      action: data.action,
      approverId: data.approverId,
      approverName: data.approverName,
      comment: data.comment,
    })

    return success({ success: true })
  }
)

/**
 * 撤回审批
 * DELETE /api/approval/:id?operatorId=xxx
 */
export const DELETE = withErrorHandler(
  async (
    request: NextRequest,
    context?: { params: Promise<Record<string, string>> }
  ) => {
    const { id } = await context!.params
    const { searchParams } = new URL(request.url)
    const operatorId = searchParams.get('operatorId')

    if (!operatorId) {
      badRequest('缺少 operatorId 参数')
    }

    await approvalEngine.cancel({
      instanceId: id,
      operatorId,
    })

    return success({ success: true })
  }
)
