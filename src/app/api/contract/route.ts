import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success } from '@/lib/api-handler'

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
  }

  const [list, total] = await Promise.all([
    prisma.contract.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { client: true, quotation: true },
    }),
    prisma.contract.count({ where }),
  ])

  return success({ list, total, page, pageSize })
})

export const POST = withErrorHandler(async (request: NextRequest) => {
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

