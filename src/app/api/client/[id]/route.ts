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
  const client = await prisma.client.findUnique({ where: { id } })

  if (!client) {
    notFound('客户不存在')
  }

  return success(client)
})

// 更新客户 - 需要登录
export const PUT = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const data = await request.json()
  const client = await prisma.client.update({ where: { id }, data })
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
