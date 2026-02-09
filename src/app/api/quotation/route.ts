import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success } from '@/lib/api-handler'
import { auth } from '@/lib/auth'
import { getDataFilter } from '@/lib/data-permission'
import { addCurrentApproverInfo } from '@/lib/approval/utils'

// 获取报价列表
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
      { client: { name: { contains: keyword } } },
      { clientContactPerson: { contains: keyword } },
      { quotationNo: { contains: keyword } },
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

  const [list, total] = await Promise.all([
    prisma.quotation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        items: true,
        approvals: { orderBy: { timestamp: 'desc' } },
        client: true,
      },
    }),
    prisma.quotation.count({ where }),
  ])

  // 为每个报价单添加当前审批人信息
  const listWithApprover = await addCurrentApproverInfo(list, prisma, 'quotation')

  // 格式化返回数据
  const formattedList = listWithApprover.map((item: any) => {
    const subtotal = Number(item.subtotal) || 0
    const taxRate = Number(item.taxRate) || 0.06
    const taxTotal = Number(item.taxTotal) || subtotal * (1 + taxRate)
    const discountTotal = Number(item.discountTotal) || taxTotal
    const discountAmount = taxTotal - discountTotal
    return {
      ...item,
      clientName: item.client?.name || '',
      consultationNo: item.consultationNo,
      quotationDate: item.createdAt,
      totalAmount: subtotal,
      taxRate,
      taxAmount: subtotal * taxRate,
      totalWithTax: taxTotal,
      discountAmount,
      finalAmount: discountTotal,
      paymentTerms: item.clientRemark,
      clientResponse: item.clientStatus,
      currentApproverName: item.currentApproverName,
    }
  })

  return success({ list: formattedList, total, page, pageSize })
})

// 创建报价
export const POST = withAuth(async (request: NextRequest, user) => {
  const data = await request.json()

  // 如果从咨询单创建，查询咨询单以继承 clientReportDeadline 和 followerId
  let inheritedDeadline = null
  let inheritedFollowerId = null
  const consultationNo = data.consultationNo || data.consultationId
  if (consultationNo && (!data.clientReportDeadline || !data.followerId)) {
    const consultation = await prisma.consultation.findUnique({
      where: { consultationNo },
      select: { clientReportDeadline: true, followerId: true, clientPhone: true, clientEmail: true, clientAddress: true },
    })
    inheritedDeadline = consultation?.clientReportDeadline
    inheritedFollowerId = consultation?.followerId
    data.clientPhone = data.clientPhone || consultation?.clientPhone
    data.clientEmail = data.clientEmail || consultation?.clientEmail
    data.clientAddress = data.clientAddress || consultation?.clientAddress
  }

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const count = await prisma.quotation.count({
    where: { quotationNo: { startsWith: `BJ${today}` } }
  })
  const quotationNo = `BJ${today}${String(count + 1).padStart(4, '0')}`

  const items = data.items || []
  // 费用计算：报价合计 = 各项总价之和，含税合计 = 报价合计 × (1 + 6%)
  const subtotal = items.reduce((sum: number, item: any) => {
    const qty = parseFloat(String(item.quantity)) || 1
    return sum + qty * (Number(item.unitPrice) || 0)
  }, 0)
  const taxRate = 0.06 // 固定 6%
  const taxTotal = subtotal * (1 + taxRate)
  const discountAmount = Number(data.discountAmount) || 0
  const discountTotal = data.finalAmount || (taxTotal - discountAmount)

  // 构造创建数据
  const createData: any = {
    quotationNo,
    client: data.clientId ? { connect: { id: data.clientId } } : undefined,
    clientContactPerson: data.clientContactPerson,
    clientPhone: data.clientPhone,
    clientEmail: data.clientEmail,
    clientAddress: data.clientAddress,
    consultationNo: data.consultationNo || data.consultationId || undefined,

    // 服务方信息
    serviceContact: data.serviceContact,
    serviceTel: data.serviceTel,
    serviceEmail: data.serviceEmail,
    serviceAddress: data.serviceAddress,

    followerId: data.followerId || inheritedFollowerId,
    clientRemark: data.clientRemark || data.paymentTerms,
    taxRate,
    subtotal,
    taxTotal,
    discountTotal,
    status: data.status || 'draft',
    clientStatus: data.clientResponse || 'pending',
    clientReportDeadline: data.clientReportDeadline ? new Date(data.clientReportDeadline) : (inheritedDeadline || null),
    createdBy: user?.id ? { connect: { id: user.id } } : undefined,
    items: {
      create: items.map((item: any, idx: number) => ({
        sampleName: item.sampleName || '',
        serviceItem: item.serviceItem || '',
        methodStandard: item.methodStandard || '',
        quantity: String(item.quantity || '1'),
        unitPrice: Number(item.unitPrice) || 0,
        totalPrice: (parseFloat(String(item.quantity)) || 1) * (Number(item.unitPrice) || 0),
        remark: item.remark || null,
        sort: idx,
      })),
    },
  }

  const quotation = await prisma.quotation.create({
    data: createData,
    include: {
      items: true,
    }
  })

  // 回写咨询单
  if (consultationNo) {
    await prisma.consultation.updateMany({
      where: { consultationNo },
      data: { quotationNo, status: 'quoted' },
    })
  }

  return success(quotation)
})
