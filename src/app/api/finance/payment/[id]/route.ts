import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import {
  withErrorHandler,
  success,
  notFound,
} from '@/lib/api-handler'
import { Prisma } from '@prisma/client'

// 获取收款记录详情
export const GET = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { params } = context!
  const { id } = await params

  const payment = await prisma.financePayment.findUnique({
    where: { id },
    include: {
      receivable: {
        select: {
          id: true,
          receivableNo: true,
          clientName: true,
          amount: true,
          receivedAmount: true,
          status: true,
          entrustment: {
            select: {
              entrustmentNo: true,
              sampleName: true,
            },
          },
        },
      },
    },
  })

  if (!payment) {
    notFound('收款记录不存在')
  }

  return success(payment)
})

// 删除收款记录（需要回滚应收账款）
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { params } = context!
  const { id } = await params

  const payment = await prisma.financePayment.findUnique({
    where: { id },
    include: { receivable: true },
  })

  if (!payment) {
    notFound('收款记录不存在')
  }

  // 使用事务删除收款记录并回滚应收账款
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // 删除收款记录
    await tx.financePayment.delete({ where: { id } })

    // 回滚应收账款的已收金额
    const newReceivedAmount = Number(payment.receivable.receivedAmount) - Number(payment.amount)
    const newStatus = newReceivedAmount <= 0 ? 'pending' : 'partial'

    await tx.financeReceivable.update({
      where: { id: payment.receivableId },
      data: {
        receivedAmount: Math.max(0, newReceivedAmount),
        status: newStatus,
      },
    })
  })

  return success({ success: true })
})
