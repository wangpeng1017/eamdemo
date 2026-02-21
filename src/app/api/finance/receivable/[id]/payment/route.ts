/**
 * @file route.ts
 * @desc 应收款收款记录API - 上传凭证并记录收款
 * POST: 创建收款记录，自动更新应收款已收金额和状态
 */

import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success, error } from '@/lib/api-handler'
import { Prisma } from '@prisma/client'

export const POST = withAuth(async (request: NextRequest, user, context) => {
    const { id } = await context!.params as { id: string }
    const body = await request.json()

    // 校验必填字段
    if (!body.amount || body.amount <= 0) {
        return error('INVALID_AMOUNT', '到账金额必须大于0')
    }
    if (!body.paymentDate) {
        return error('MISSING_DATE', '到账日期为必填项')
    }

    // 查找应收款
    const receivable = await prisma.financeReceivable.findUnique({ where: { id } })
    if (!receivable) {
        return error('NOT_FOUND', '应收款记录不存在')
    }
    if (receivable.status === 'completed') {
        return error('ALREADY_COMPLETED', '该应收款已关闭')
    }

    // 使用事务：创建收款记录 + 更新应收款
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // 创建收款记录
        const payment = await tx.financePayment.create({
            data: {
                receivableId: id,
                amount: body.amount,
                paymentDate: new Date(body.paymentDate),
                paymentMethod: body.paymentMethod || '银行转账',
                handlerName: user.name || null,
                bankName: body.bankName || null,
                transactionNo: body.transactionNo || null,
                attachments: body.attachments ? JSON.stringify(body.attachments) : null,
                remark: body.remark || null,
            },
        })

        // 计算新的已收金额
        const newReceivedAmount = Number(receivable.receivedAmount) + Number(body.amount)
        const totalAmount = Number(receivable.amount)

        // 判断状态：已收金额 >= 应收金额 → completed，否则 partial
        const newStatus = newReceivedAmount >= totalAmount ? 'completed' : 'partial'

        // 更新应收款
        const updatedReceivable = await tx.financeReceivable.update({
            where: { id },
            data: {
                receivedAmount: newReceivedAmount,
                status: newStatus,
            },
        })

        return { payment, receivable: updatedReceivable }
    })

    return success(result)
})
