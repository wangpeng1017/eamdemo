import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success, notFound, badRequest } from '@/lib/api-handler'

// 获取客户详情 - 需要登录
export const GET = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: { name: true, email: true }
      }
    }
  })

  if (!client) {
    notFound('客户不存在')
  }

  // 查询审批实例和记录
  const approvalInstance = await prisma.approvalInstance.findFirst({
    where: {
      bizType: 'client',
      bizId: id,
    },
    orderBy: { submittedAt: 'desc' },
    include: {
      records: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  // 如果有审批实例，查询审批流配置获取节点信息
  let approvalFlow = null
  if (approvalInstance) {
    approvalFlow = await prisma.approvalFlow.findUnique({
      where: { code: approvalInstance.flowCode },
    })
  }

  return success({
    ...client,
    approvalInstance,
    approvalFlow,
  })
})

// 更新客户 - 需要登录
export const PUT = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const data = await request.json()

  // 1. 更新客户信息，并设置状态为 pending
  const client = await prisma.client.update({
    where: { id },
    data: {
      ...data,
      status: 'pending', // 触发审批
      // 避免更新一些不可变字段
      createdAt: undefined,
      updatedAt: undefined,
      createdById: undefined,
    }
  })

  // 2. 自动提交审批
  if (user?.id) {
    try {
      const { ApprovalEngine } = await import('@/lib/approval/engine')
      const engine = new ApprovalEngine()

      // 检查是否已存在 pending 状态的审批实例，如果有则不做处理（避免重复提交）
      // 或者这里业务逻辑是每次修改都重新提交审批？
      // 假设每次修改都会触发新的审批请求

      await engine.submit({
        bizType: 'client',
        bizId: client.id,
        flowCode: 'CLIENT_APPROVAL',
        submitterId: user.id,
        submitterName: user.name || '提交人',
      })
    } catch (error) {
      console.error('更新客户触发审批失败:', error)
      // 即使审批提交失败，数据已更新为 pending，用户可以手动提交或联系管理员
      // 但最好 warn 用户
    }
  }

  return success(client)
})

// 删除客户 - 需要登录，检查关联数据
export const DELETE = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params

  // 检查是否有关联的委托单
  const entrustmentCount = await prisma.entrustment.count({
    where: { clientId: id }
  })
  if (entrustmentCount > 0) {
    badRequest(`无法删除：该客户有 ${entrustmentCount} 个关联委托单`)
  }

  // 检查是否有关联的报价单
  const quotationCount = await prisma.quotation.count({
    where: { clientId: id }
  })
  if (quotationCount > 0) {
    badRequest(`无法删除：该客户有 ${quotationCount} 个关联报价单`)
  }

  // 检查是否有关联的合同
  const contractCount = await prisma.contract.count({
    where: { clientId: id }
  })
  if (contractCount > 0) {
    badRequest(`无法删除：该客户有 ${contractCount} 个关联合同`)
  }

  await prisma.client.delete({ where: { id } })
  return success({ success: true })
})
