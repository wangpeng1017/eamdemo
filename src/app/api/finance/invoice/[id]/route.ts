/**
 * @file route.ts
 * @desc 发票详情API（GET/PUT/DELETE）
 *       PUT: 更新发票信息，支持提交审批
 */

import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success, notFound, badRequest } from '@/lib/api-handler'

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

  // 查询当前发票状态
  const current = await prisma.financeInvoice.findUnique({ where: { id } })
  if (!current) {
    notFound('发票不存在')
  }

  // ========== 提交审批 ==========
  if (body.action === 'submit') {
    if (current.status !== 'pending') {
      badRequest('只有待开票状态才能提交审批')
    }

    // 更新发票的附件和开票日期
    const updateData: Record<string, unknown> = {}
    if (body.issuedDate) updateData.issuedDate = new Date(body.issuedDate)
    if (body.attachments && Array.isArray(body.attachments)) {
      // 合并已有附件
      let existingFiles: any[] = []
      if (current.attachments) {
        try { existingFiles = JSON.parse(current.attachments) } catch { existingFiles = [] }
      }
      updateData.attachments = JSON.stringify([...existingFiles, ...body.attachments])
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.financeInvoice.update({ where: { id }, data: updateData })
    }

    // 调用审批引擎
    const { approvalEngine } = await import('@/lib/approval/engine')
    try {
      await approvalEngine.submit({
        bizType: 'invoice',
        bizId: id,
        flowCode: 'INVOICE_APPROVAL',
        submitterId: user.id,
        submitterName: user.name || '未知用户',
      })
    } catch (err: any) {
      return badRequest(err.message || '提交审批失败')
    }

    const updated = await prisma.financeInvoice.findUnique({ where: { id } })
    return success({
      ...updated,
      invoiceAmount: Number(updated!.invoiceAmount),
      taxRate: Number(updated!.taxRate),
      taxAmount: Number(updated!.taxAmount),
      totalAmount: Number(updated!.totalAmount),
    })
  }

  // ========== 普通编辑更新 ==========
  // 审批中不允许编辑
  if (current.status === 'pending_approval') {
    badRequest('审批中的发票不允许编辑')
  }

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
    action: _action,
    ...rest
  } = body

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

  // 不允许直接修改 status 为 issued（必须走审批）
  if (rest.status === 'issued' && current.status !== 'issued') {
    badRequest('开票必须通过审批流程')
  }

  // 普通更新
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

  // 已开票或审批中不允许删除
  if (invoice.status === 'issued') {
    badRequest('已开票的发票不允许删除')
  }
  if (invoice.status === 'pending_approval') {
    badRequest('审批中的发票不允许删除，请先撤回审批')
  }

  // 事务：删除发票 + 处理关联应收款 + 清理审批实例
  await prisma.$transaction(async (tx) => {
    // 如果有关联审批实例，先删除
    if (invoice.approvalInstanceId) {
      await tx.approvalRecord.deleteMany({ where: { instanceId: invoice.approvalInstanceId } })
      await tx.financeInvoice.update({ where: { id }, data: { approvalInstanceId: null } })
      await tx.approvalInstance.delete({ where: { id: invoice.approvalInstanceId } })
    }
    // 如果有关联应收款且无收款记录，一并删除
    if (invoice.receivableId) {
      const paymentCount = await tx.financePayment.count({
        where: { receivableId: invoice.receivableId }
      })
      if (paymentCount === 0) {
        await tx.financeInvoice.update({ where: { id }, data: { receivableId: null } })
        await tx.financeReceivable.delete({ where: { id: invoice.receivableId } })
      }
    }
    await tx.financeInvoice.delete({ where: { id } })
  })

  return success({ success: true })
})
