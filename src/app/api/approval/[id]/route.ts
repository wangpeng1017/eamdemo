/**
 * @file route.ts
 * @desc 审批操作 API - 查询详情/审批/撤回
 * @method GET, PATCH, DELETE
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { approvalEngine } from '@/lib/approval/engine'
import { withAuth, success, notFound, badRequest } from '@/lib/api-handler'

/**
 * 获取审批详情
 * GET /api/approval/:id
 */
export const GET = withAuth(
  async (
    request: NextRequest,
    user,
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
 *   comment?: string
 * }
 */
export const PATCH = withAuth(
  async (
    request: NextRequest,
    user,
    context?: { params: Promise<Record<string, string>> }
  ) => {
    const { id } = await context!.params
    const data = await request.json()

    if (!data.action) {
      badRequest('缺少 action 字段')
    }

    if (data.action !== 'approve' && data.action !== 'reject') {
      badRequest('无效的审批动作')
    }

    // 使用当前登录用户的信息进行审批
    await approvalEngine.approve({
      instanceId: id,
      action: data.action,
      approverId: user.id,
      approverName: user.name || '未知用户',
      comment: data.comment,
    })

    return success({ success: true })
  }
)

/**
 * 撤回审批
 * DELETE /api/approval/:id
 */
export const DELETE = withAuth(
  async (
    request: NextRequest,
    user,
    context?: { params: Promise<Record<string, string>> }
  ) => {
    const { id } = await context!.params

    // 使用当前登录用户的 ID 进行撤回
    await approvalEngine.cancel({
      instanceId: id,
      operatorId: user.id,
    })

    return success({ success: true })
  }
)
