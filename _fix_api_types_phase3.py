# -*- coding: utf-8 -*-
"""
Fix TypeScript type errors in API routes - Phase 3
"""

import os

def fix_external_entrustment_validate():
    """Fix external/entrustment/validate/route.ts"""
    file_path = '/Users/wangpeng/Downloads/limsnext/src/app/api/external/entrustment/validate/route.ts'

    content = """import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success } from '@/lib/api-handler'

/**
 * @file route.ts
 * @desc 验证外部链接 token 并获取委托单信息
 * @input GET /api/external/entrustment/validate?token=xxx
 * @output { entrustmentNo, clientName, isValid, expiresAt }
 */

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return Response.json({ success: false, message: '缺少 token' }, { status: 400 })
  }

  // 查找包含该 token 的委托单
  const entrustments = await prisma.entrustment.findMany({
    where: {
      remark: {
        not: null,
      },
    },
  })

  // 找到匹配的委托单
  const matched = entrustments.find((e) => {
    if (!e.remark) return false
    try {
      const data = JSON.parse(e.remark as string)
      return data.externalLink?.token === token
    } catch {
      return false
    }
  })

  if (!matched) {
    return Response.json({ success: false, message: '链接无效或已过期' }, { status: 404 })
  }

  // 检查是否过期
  let remarkData: Record<string, any> = {}
  try {
    remarkData = JSON.parse(matched.remark as string || '{}')
  } catch {
    remarkData = {}
  }

  const expiresAt = remarkData.externalLink?.expiresAt
  if (expiresAt && new Date(expiresAt) < new Date()) {
    return Response.json({ success: false, message: '链接已过期' }, { status: 410 })
  }

  // 返回委托单基本信息
  return success({
    id: matched.id,
    entrustmentNo: matched.entrustmentNo,
    clientName: matched.client?.name || null,
    sampleName: matched.sampleName || null,
    sampleModel: matched.sampleModel || null,
    sampleMaterial: matched.sampleMaterial || null,
    sampleQuantity: matched.sampleQuantity || null,
    expiresAt,
  })
})
"""

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'✓ Fixed: {file_path}')

def fix_inspection_standard():
    """Fix inspection-standard/route.ts"""
    file_path = '/Users/wangpeng/Downloads/limsnext/src/app/api/inspection-standard/route.ts'

    content = """import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success } from '@/lib/api-handler'

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const validity = searchParams.get('validity')

  const where: Record<string, unknown> = {}
  if (validity) where.validity = validity

  const [list, total] = await Promise.all([
    prisma.inspectionStandard.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.inspectionStandard.count({ where }),
  ])

  // 解析 JSON 字段
  const parsedList = list.map((item) => ({
    ...item,
    devices: item.devices ? JSON.parse(item.devices as string) : [],
    parameters: item.parameters ? JSON.parse(item.parameters as string) : [],
    personnel: item.personnel ? JSON.parse(item.personnel as string) : [],
  }))

  return success({ list: parsedList, total, page, pageSize })
})

export const POST = withErrorHandler(async (request: NextRequest) => {
  const data = await request.json()

  const standard = await prisma.inspectionStandard.create({
    data: {
      ...data,
      devices: data.devices ? JSON.stringify(data.devices) : null,
      parameters: data.parameters ? JSON.stringify(data.parameters) : null,
      personnel: data.personnel ? JSON.stringify(data.personnel) : null,
    }
  })

  return success(standard)
})
"""

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'✓ Fixed: {file_path}')

def fix_finance_payment():
    """Fix finance/payment/route.ts"""
    file_path = '/Users/wangpeng/Downloads/limsnext/src/app/api/finance/payment/route.ts'

    content = """import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import {
  withErrorHandler,
  success,
  validateRequired,
  badRequest,
} from '@/lib/api-handler'
import { Prisma } from '@prisma/client'

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
  const currentReceived = Number(receivable!.receivedAmount)
  const totalAmount = Number(receivable!.amount)

  // 检查收款金额是否超过剩余应收
  if (paymentAmount > totalAmount - currentReceived) {
    badRequest('收款金额超过剩余应收金额')
  }

  // 使用事务创建收款记录并更新应收账款
  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
"""

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'✓ Fixed: {file_path}')

def fix_finance_payment_id():
    """Fix finance/payment/[id]/route.ts"""
    file_path = '/Users/wangpeng/Downloads/limsnext/src/app/api/finance/payment/[id]/route.ts'

    content = """import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import {
  withErrorHandler,
  success,
  notFound,
} from '@/lib/api-handler'
import { Prisma } from '@prisma/client'

interface RouteParams {
  params: Promise<{ id: string }>
}

// 获取收款记录详情
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: RouteParams
) => {
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
  { params }: RouteParams
) => {
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
"""

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'✓ Fixed: {file_path}')

# Run all fixes
if __name__ == '__main__':
    print('Fixing API route TypeScript type errors - Phase 3...\n')

    fix_external_entrustment_validate()
    fix_inspection_standard()
    fix_finance_payment()
    fix_finance_payment_id()

    print('\n✓ Phase 3 complete: Fixed 4 files')
