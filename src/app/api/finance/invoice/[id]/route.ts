/**
 * @file route.ts
 * @desc 发票详情API（GET/PUT/DELETE）
 *       PUT: 更新发票信息，状态变为 issued 时自动创建应收款
 */

import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { generateReceivableNo } from '@/lib/generate-no'
import { Prisma } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const invoice = await prisma.financeInvoice.findUnique({
    where: { id },
    include: {
      receivable: true,
      entrustment: { select: { entrustmentNo: true, followerId: true } },
    },
  })
  return NextResponse.json(invoice)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
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
      return NextResponse.json(
        { success: false, error: '发票不存在' },
        { status: 404 }
      )
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

      return NextResponse.json({ success: true, data: result })
    }

    // 普通更新（非开票）
    const invoice = await prisma.financeInvoice.update({ where: { id }, data })
    return NextResponse.json({ success: true, data: invoice })
  } catch (error: any) {
    console.error('更新发票失败:', error)
    return NextResponse.json(
      { success: false, error: error.message || '更新发票失败' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.financeInvoice.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
