import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import {
  withErrorHandler,
  success,
  validateRequired,
  badRequest,
} from '@/lib/api-handler'

// 获取收款记录列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const receivableId = searchParams.get('receivableId')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const paymentMethod = searchParams.get('paymentMethod')

  const where: Record<string, unknown> = {}

  if (receivableId) {
    where.receivableId = receivableId
  }

  if (paymentMethod) {
    where.paymentMethod = paymentMethod
  }

  if (startDate || endDate) {
    where.paymentDate = {}
    if (startDate) (where.paymentDate as Record<string, Date>).gte = new Date(startDate)
    if (endDate) (where.paymentDate as Record<string, Date>).lte = new Date(endDate)
  }

  const [list, total] = await Promise.all([
    prisma.financePayment.findMany({
      where,
      orderBy: { paymentDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        receivable: {
          select: {
            id: true,
            receivableNo: true,
            clientName: true,
            amount: true,
            receivedAmount: true,
            status: true,
          },
        },
      },
    }),
    prisma.financePayment.count({ where }),
  ])

  // 统计总收款金额
  const totalAmount = await prisma.financePayment.aggregate({
    where,
    _sum: { amount: true },
  })

  return success({
    list,
    total,
    page,
    pageSize,
    totalAmount: totalAmount._sum.amount || 0,
  })
})

// 创建收款记录
export const POST = withErrorHandler(async (request: NextRequest) => {
  const data = await request.json()

  validateRequired(data, ['receivableId', 'amount', 'paymentDate', 'paymentMethod'])

  // 检查应收账款是否存在
  const receivable = await prisma.financeReceivable.findUnique({
    where: { id: data.receivableId },
  })

  if (!receivable) {
    badRequest('应收账款不存在')
  }

  const paymentAmount = parseFloat(data.amount)
  const currentReceived = Number(receivable.receivedAmount)
  const totalAmount = Number(receivable.amount)

  // 检查收款金额是否超过剩余应收
  if (paymentAmount > totalAmount - currentReceived) {
    badRequest('收款金额超过剩余应收金额')
  }

  // 使用事务创建收款记录并更新应收账款
  const result = await prisma.$transaction(async (tx) => {
    // 创建收款记录
    const payment = await tx.financePayment.create({
      data: {
        receivableId: data.receivableId,
        amount: paymentAmount,
        paymentDate: new Date(data.paymentDate),
        paymentMethod: data.paymentMethod,
        handlerName: data.handlerName,
        bankName: data.bankName,
        transactionNo: data.transactionNo,
        remark: data.remark,
      },
      include: {
        receivable: true,
      },
    })

    // 更新应收账款的已收金额和状态
    const newReceivedAmount = currentReceived + paymentAmount
    const newStatus = newReceivedAmount >= totalAmount ? 'completed' : 'partial'

    await tx.financeReceivable.update({
      where: { id: data.receivableId },
      data: {
        receivedAmount: newReceivedAmount,
        status: newStatus,
      },
    })

    return payment
  })

  return success(result)
})
