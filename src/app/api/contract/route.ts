import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success } from '@/lib/api-handler'
import { auth } from '@/lib/auth'
import { getDataFilter } from '@/lib/data-permission'

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const status = searchParams.get('status')
  const keyword = searchParams.get('keyword')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  const where: any = {}

  if (status) where.status = status
  if (keyword) {
    where.OR = [
      { contractNo: { contains: keyword } },
      { contractName: { contains: keyword } },
      { client: { name: { contains: keyword } } },
    ]
  }
  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) where.createdAt.gte = new Date(startDate)
    if (endDate) where.createdAt.lte = new Date(endDate)
    if (endDate) where.createdAt.lte = new Date(endDate)
  }

  // 注入数据权限过滤
  const permissionFilter = await getDataFilter()
  Object.assign(where, permissionFilter)

  const [rawList, total] = await Promise.all([
    prisma.contract.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { client: true, quotation: true },
    }),
    prisma.contract.count({ where }),
  ])

  // 字段映射:将数据库字段名映射为前端期望的字段名
  const list = rawList.map((contract: any) => ({
    ...contract,
    // 前端期望的字段名
    clientName: contract.partyACompany || contract.client?.name || null,
    clientContact: contract.partyAContact || null,
    clientPhone: contract.partyATel || contract.client?.phone || null,
    clientAddress: contract.partyAAddress || contract.client?.address || null,
    amount: contract.contractAmount ? Number(contract.contractAmount) : null,
    prepaymentAmount: contract.advancePaymentAmount ? Number(contract.advancePaymentAmount) : null,
    prepaymentRatio: contract.hasAdvancePayment && contract.contractAmount && contract.advancePaymentAmount
      ? Math.round(Number(contract.advancePaymentAmount) / Number(contract.contractAmount) * 100)
      : null,
    quotationNo: contract.quotation?.quotationNo || null,
    startDate: contract.effectiveDate,
    endDate: contract.expiryDate,
    // 合同条款字段映射
    paymentTerms: contract.termsPaymentTerms,
    deliveryTerms: contract.termsDeliveryTerms,
    qualityTerms: contract.termsQualityTerms,
    confidentialityTerms: contract.termsConfidentialityTerms,
    breachTerms: contract.termsLiabilityTerms,
    disputeTerms: contract.termsDisputeResolution,
  }))

  return success({ list, total, page, pageSize })
})

export const POST = withErrorHandler(async (request: NextRequest) => {
  const session = await auth()
  const data = await request.json()

  // 生成合同编号
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const count = await prisma.contract.count({
    where: { contractNo: { startsWith: `HT${today}` } }
  })
  const contractNo = `HT${today}${String(count + 1).padStart(4, '0')}`

  // 查询报价单获取客户ID
  let clientId = null
  if (data.quotationId) {
    const quotation = await prisma.quotation.findUnique({
      where: { id: data.quotationId },
      select: { clientId: true }
    })
    clientId = quotation?.clientId
  }

  // 构建合同创建数据
  const createData: any = {
    createdById: session?.user?.id,
    contractNo,
    contractName: data.contractName,
    quotationId: data.quotationId,
    clientId: clientId,
    partyACompany: data.clientName,
    partyAContact: data.clientContact,
    contractAmount: data.amount ? parseFloat(data.amount) : null,
    sampleName: data.sampleName,
    signDate: data.signDate ? new Date(data.signDate) : null,
    effectiveDate: data.startDate ? new Date(data.startDate) : null,
    expiryDate: data.endDate ? new Date(data.endDate) : null,
    termsPaymentTerms: data.paymentTerms,
    termsDeliveryTerms: data.deliveryTerms,
    status: 'draft',
  }

  const contract = await prisma.contract.create({
    data: createData
  })

  // 回写报价单：更新 contractNo
  if (data.quotationId) {
    await prisma.quotation.update({
      where: { id: data.quotationId },
      data: { contractNo },
    })
  }

  return success(contract)
})

