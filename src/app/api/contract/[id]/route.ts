import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success, notFound } from '@/lib/api-handler'

export const GET = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const contract = await prisma.contract.findUnique({
    where: { id },
    include: { client: true, quotation: true, items: { orderBy: { sort: 'asc' } }, createdBy: true },
  })
  if (!contract) notFound('合同不存在')

  // 字段映射：与列表API保持一致
  const mapped = {
    ...contract,
    clientName: contract.partyACompany || contract.client?.name || null,
    clientContact: contract.partyAContact || null,
    clientPhone: contract.partyATel || contract.client?.phone || null,
    clientAddress: contract.partyAAddress || contract.client?.address || null,
    clientEmail: contract.partyAEmail || null,
    amount: contract.contractAmount ? Number(contract.contractAmount) : null,
    prepaymentAmount: contract.advancePaymentAmount ? Number(contract.advancePaymentAmount) : null,
    prepaymentRatio: contract.hasAdvancePayment && contract.contractAmount && contract.advancePaymentAmount
      ? Math.round(Number(contract.advancePaymentAmount) / Number(contract.contractAmount) * 100)
      : null,
    quotationNo: contract.quotation?.quotationNo || null,
    startDate: contract.effectiveDate,
    endDate: contract.expiryDate,
    followerId: contract.followerId || null,
    // 合同条款字段映射
    paymentTerms: contract.termsPaymentTerms,
    deliveryTerms: contract.termsDeliveryTerms,
    qualityTerms: contract.termsQualityTerms,
    confidentialityTerms: contract.termsConfidentialityTerms,
    breachTerms: contract.termsLiabilityTerms,
    disputeTerms: contract.termsDisputeResolution,
    clientReportDeadline: contract.clientReportDeadline,
    items: contract.items || [],
  }

  return success(mapped)
})

export const PUT = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const data = await request.json()

  // 分离 items 数据
  const { items, ...contractData } = data

  const result = await prisma.$transaction(async (tx) => {
    // 1. 更新合同主体
    const contract = await tx.contract.update({
      where: { id },
      data: contractData
    })

    // 2. 如果提供了 items，则更新明细
    if (items && Array.isArray(items)) {
      // 删除旧明细
      await tx.contractItem.deleteMany({
        where: { contractId: id }
      })

      // 创建新明细
      if (items.length > 0) {
        await tx.contractItem.createMany({
          data: items.map((item: any, index: number) => ({
            contractId: id,
            serviceItem: item.serviceItem,
            methodStandard: item.methodStandard,
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unitPrice) || 0,
            totalPrice: Number(item.totalPrice) || 0,
            sort: index
          }))
        })
      }
    }

    return contract
  })

  return success(result)
})

export const DELETE = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  await prisma.contract.delete({ where: { id } })
  return success({ success: true })
})
