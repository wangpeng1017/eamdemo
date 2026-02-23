import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success, notFound, badRequest } from '@/lib/api-handler'

// 获取应收款详情 - 需要登录
export const GET = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const receivable = await prisma.financeReceivable.findUnique({
    where: { id },
    include: {
      entrustment: { select: { entrustmentNo: true } },
    }
  })
  if (!receivable) notFound('应收款不存在')
  return success(receivable)
})

// 更新应收款 - 需要登录，字段白名单过滤
export const PUT = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const data = await request.json()

  const existing = await prisma.financeReceivable.findUnique({ where: { id } })
  if (!existing) notFound('应收款不存在')

  // 字段白名单：仅允许修改备注、状态、到期日
  const receivable = await prisma.financeReceivable.update({
    where: { id },
    data: {
      ...(data.status !== undefined && { status: data.status }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
      ...(data.remark !== undefined && { remark: data.remark }),
    }
  })
  return success(receivable)
})

// 删除应收款 - 需要登录，检查关联数据
export const DELETE = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params

  const existing = await prisma.financeReceivable.findUnique({ where: { id } })
  if (!existing) notFound('应收款不存在')

  // 已有收款记录不允许删除
  const paymentCount = await prisma.financePayment.count({ where: { receivableId: id } })
  if (paymentCount > 0) {
    badRequest(`无法删除：该应收款有 ${paymentCount} 条收款记录，请先删除收款记录`)
  }

  await prisma.financeReceivable.delete({ where: { id } })
  return success({ success: true })
})

