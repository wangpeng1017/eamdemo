/**
 * @file route.ts
 * @desc 发票详情API（GET/PUT/DELETE）
 *       PUT: 更新发票信息，状态变为 issued 时自动创建应收款
 */

import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success, notFound, badRequest } from '@/lib/api-handler'
import { generateReceivableNo } from '@/lib/generate-no'
import { Prisma } from '@prisma/client'

// 获取发票详情 - 需要登录
export const GET = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const invoice = await prisma.financeInvoice.findUnique({
    where: { id },
    include: {
      receivable: true,
      entrustment: { select: { entrustmentNo: true, followerId: true } },
    },
  })
  if (!invoice) notFound('发票不存在')

  return success({
    ...invoice,
    invoiceAmount: Number(invoice.invoiceAmount),
    taxRate: Number(invoice.taxRate),
    taxAmount: Number(invoice.taxAmount),
    totalAmount: Number(invoice.totalAmount),
  })
})

// 更新发票 - 需要登录
export const PUT = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const body = await request.json()

  // 过滤掉不允许直接更新的字段
  const {
    id: _id,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    client: _client,
    entrustment: _entrustment,
    receivable: _receivable,
    clientId: _clientId,
    receivableId: _receivableId,
    ...rest
  } = body

  // 查询当前发票状态
  const current = await prisma.financeInvoice.findUnique({ where: { id } })
  if (!current) {
    notFound('发票不存在')
  }

  // 根据 invoiceAmount 和 taxRate 自动计算税额和价税合计
  const invoiceAmount = rest.invoiceAmount != null ? Number(rest.invoiceAmount) : undefined
  const taxRate = rest.taxRate != null ? Number(rest.taxRate) : undefined

  const data: Record<string, unknown> = { ...rest }

  if (invoiceAmount != null && taxRate != null) {
    data.invoiceAmount = invoiceAmount
    data.taxRate = taxRate
    data.taxAmount = Math.round(invoiceAmount * taxRate * 100) / 100
    data.totalAmount = Math.round(invoiceAmount * (1 + taxRate) * 100) / 100
  }

  // 处理 attachments：前端传数组，存为 JSON 字符串
  if (data.attachments && Array.isArray(data.attachments)) {
    data.attachments = JSON.stringify(data.attachments)
  }

  const isBecomingIssued = current.status !== 'issued' && rest.status === 'issued'

  if (isBecomingIssued) {
    // 使用事务：更新发票 + 自动创建应收款
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updatedInvoice = await tx.financeInvoice.update({ where: { id }, data })

      // 检查是否已有关联应收款
      if (current.receivableId) {
        return updatedInvoice
      }

      // 查找委托单获取 followerId
      let followerId: string | null = null
      if (current.entrustmentId) {
        const entrustment = await tx.entrustment.findUnique({
          where: { id: current.entrustmentId },
          select: { followerId: true },
        })
        followerId = entrustment?.followerId || null
      }

      // 自动创建应收款
      const receivableNo = await generateReceivableNo()
      const dueDate = current.paymentDate
        ? new Date(current.paymentDate)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 默认30天后

      const receivable = await tx.financeReceivable.create({
        data: {
          receivableNo,
          entrustmentId: current.entrustmentId || null,
          clientName: current.clientName,
          amount: updatedInvoice.totalAmount,
          receivedAmount: 0,
          status: 'pending',
          dueDate,
          remark: followerId
            ? JSON.stringify({ followerId, invoiceNo: current.invoiceNo })
            : JSON.stringify({ invoiceNo: current.invoiceNo }),
        },
      })

      // 反向关联：将应收款ID写回发票
      await tx.financeInvoice.update({
        where: { id },
        data: { receivableId: receivable.id },
      })

      return { ...updatedInvoice, receivableId: receivable.id, receivable }
    })

    return success(result)
  }

  // 普通更新（非开票）
  const invoice = await prisma.financeInvoice.update({ where: { id }, data })
  return success({
    ...invoice,
    invoiceAmount: Number(invoice.invoiceAmount),
    taxRate: Number(invoice.taxRate),
    taxAmount: Number(invoice.taxAmount),
    totalAmount: Number(invoice.totalAmount),
  })
})

// 删除发票 - 需要登录，检查状态，清理关联应收款
export const DELETE = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params

  const invoice = await prisma.financeInvoice.findUnique({ where: { id } })
  if (!invoice) notFound('发票不存在')

  // 已开票状态不允许删除
  if (invoice.status === 'issued') {
    badRequest('已开票的发票不允许删除')
  }

  // 事务：删除发票 + 处理关联应收款
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // 如果有关联应收款且无收款记录，一并删除
    if (invoice.receivableId) {
      const paymentCount = await tx.financePayment.count({
        where: { receivableId: invoice.receivableId }
      })
      if (paymentCount === 0) {
        await tx.financeReceivable.delete({ where: { id: invoice.receivableId } })
      }
    }
    await tx.financeInvoice.delete({ where: { id } })
  })

  return success({ success: true })
})
