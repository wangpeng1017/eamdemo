import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success } from '@/lib/api-handler'
import { auth } from '@/lib/auth'
import { getDataFilter } from '@/lib/data-permission'
import { addCurrentApproverInfo } from '@/lib/approval/utils'

export const GET = withAuth(async (request: NextRequest, user) => {
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
      include: {
        client: true,
        quotation: true,
        createdBy: true,
        items: {
          orderBy: { sort: 'asc' }
        }
      },
    }),
    prisma.contract.count({ where }),
  ])

  // 为每个合同添加当前审批人信息
  const listWithApprover = await addCurrentApproverInfo(rawList, prisma, 'contract')

  // 字段映射:将数据库字段名映射为前端期望的字段名
  const list = listWithApprover.map((contract: any) => ({
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

    // 样品信息(已迁移到Sample模型)
    // contractSamples: contract.contractSamples || [],

    // 跟进人 (默认为合同创建人)
    salesPerson: contract.createdBy?.name || null,

    // 合同条款字段映射
    paymentTerms: contract.termsPaymentTerms,
    deliveryTerms: contract.termsDeliveryTerms,
    qualityTerms: contract.termsQualityTerms,
    confidentialityTerms: contract.termsConfidentialityTerms,
    breachTerms: contract.termsLiabilityTerms,
    disputeTerms: contract.termsDisputeResolution,
    items: contract.items || [],
  }))

  return success({ list, total, page, pageSize })
})

export const POST = withAuth(async (request: NextRequest, user) => {
  const data = await request.json()
  console.log('[Contract Create] Received Payload:', JSON.stringify(data, null, 2))

  // 生成合同编号
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const count = await prisma.contract.count({
    where: { contractNo: { startsWith: `HT${today}` } }
  })
  const contractNo = `HT${today}${String(count + 1).padStart(4, '0')}`

  // 查询报价单获取客户ID (如果未提供)
  let clientId = data.clientId
  if (!clientId && data.quotationId) {
    const quotation = await prisma.quotation.findUnique({
      where: { id: data.quotationId },
      select: { clientId: true }
    })
    clientId = quotation?.clientId
  }

  // 查询报价单以继承 clientReportDeadline 和 followerId
  let inheritedDeadline = data.clientReportDeadline ? new Date(data.clientReportDeadline) : null
  let inheritedFollowerId = data.followerId || null
  if (data.quotationId && (!inheritedDeadline || !inheritedFollowerId)) {
    const quotation = await prisma.quotation.findUnique({
      where: { id: data.quotationId },
      select: { clientReportDeadline: true, followerId: true, clientEmail: true }
    })
    if (!inheritedDeadline && quotation?.clientReportDeadline) inheritedDeadline = quotation.clientReportDeadline
    if (!inheritedFollowerId && quotation?.followerId) inheritedFollowerId = quotation.followerId
    data.clientEmail = data.clientEmail || quotation?.clientEmail
  }

  // 构建合同创建数据
  const createData: any = {
    createdBy: user?.id ? { connect: { id: user.id } } : undefined,
    contractNo,
    contractName: data.contractName,
    quotation: data.quotationId ? { connect: { id: data.quotationId } } : undefined,
    // quotationNo removed as it does not exist in Contract schema
    client: clientId ? { connect: { id: clientId } } : undefined,
    partyACompany: data.clientName,
    partyAContact: data.clientContact,
    partyATel: data.clientPhone,
    partyAEmail: data.clientEmail,
    partyAAddress: data.clientAddress,
    contractAmount: data.amount != null ? Number(data.amount) : null,
    hasAdvancePayment: data.prepaymentAmount != null && data.prepaymentAmount > 0,
    advancePaymentAmount: data.prepaymentAmount != null ? Number(data.prepaymentAmount) : null,

    // 继承字段
    clientReportDeadline: inheritedDeadline,
    followerId: inheritedFollowerId,

    // 样品信息 (兼容旧字段)
    sampleName: data.sampleName || (data.samples?.[0]?.name),
    sampleModel: data.sampleModel || (data.samples?.[0]?.model),
    sampleMaterial: data.sampleMaterial || (data.samples?.[0]?.material),
    sampleQuantity: data.sampleQuantity != null ? parseInt(data.sampleQuantity) : (data.samples?.[0]?.quantity != null ? Number(data.samples[0].quantity) : null),

    signDate: data.signDate ? new Date(data.signDate) : null,
    effectiveDate: data.startDate ? new Date(data.startDate) : null,
    expiryDate: data.endDate ? new Date(data.endDate) : null,
    termsPaymentTerms: data.paymentTerms || null,
    termsDeliveryTerms: data.deliveryTerms || null,
    termsQualityTerms: data.qualityTerms || null,
    termsConfidentialityTerms: data.confidentialityTerms || null,
    termsLiabilityTerms: data.breachTerms || null,
    termsDisputeResolution: data.disputeTerms || null,
    // termsOtherTerms 字段在 schema 中不存在，已移除
    status: 'draft',
    items: {
      create: data.items?.map((item: any, index: number) => ({
        serviceItem: item.serviceItem,
        methodStandard: item.methodStandard,
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        totalPrice: Number(item.totalPrice) || 0,
        sort: index
      })) || []
    }
  }

  // 处理样品列表 - 功能已移除，跳过contractSamples
  // if (Array.isArray(data.samples) && data.samples.length > 0) {...}

  console.log('[Contract Create] Prisma Data:', JSON.stringify(createData, null, 2))

  try {
    const contract = await prisma.contract.create({
      data: createData,
      include: {
        items: true,
      }
    })

    // 回写报价单：更新 contractNo
    if (data.quotationId) {
      await prisma.quotation.update({
        where: { id: data.quotationId },
        data: { contractNo },
      })
    }

    return success(contract)
  } catch (error) {
    console.error('[Contract Create] Error:', error)
    throw error // Re-throw to be handled by withErrorHandler
  }
})
