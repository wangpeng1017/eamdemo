import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success } from '@/lib/api-handler'
import { auth } from '@/lib/auth'
import { getDataFilter } from '@/lib/data-permission'

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

  const formattedList = list.map((item: any) => ({
    ...item,
    clientName: item.client?.name || '',
    quotationDate: item.createdAt,
    totalAmount: item.subtotal,
    taxRate: 0.06,
    taxAmount: item.taxTotal ? (Number(item.taxTotal) - Number(item.subtotal)) : 0,
    totalWithTax: item.taxTotal || item.subtotal,
    discountAmount: item.discountTotal ? (Number(item.taxTotal || item.subtotal) - Number(item.discountTotal)) : 0,
    finalAmount: item.discountTotal || item.taxTotal || item.subtotal,
    paymentTerms: item.clientRemark,
    clientResponse: item.clientStatus,
  }))

  return success({ list: formattedList, total, page, pageSize })
})

// 创建报价
export const POST = withAuth(async (request: NextRequest, user) => {
  const data = await request.json()

  // 如果从咨询单创建，查询咨询单以继承 clientReportDeadline
  let inheritedDeadline = null
  const consultationNo = data.consultationNo || data.consultationId
  if (consultationNo && !data.clientReportDeadline) {
    const consultation = await prisma.consultation.findUnique({
      where: { consultationNo },
      select: { clientReportDeadline: true },
    })
    inheritedDeadline = consultation?.clientReportDeadline
  }

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const count = await prisma.quotation.count({
    where: { quotationNo: { startsWith: `BJ${today}` } }
  })
  const quotationNo = `BJ${today}${String(count + 1).padStart(4, '0')}`

  const items = data.items || []
  const subtotal = items.reduce((sum: number, item: any) => sum + (item.quantity || 1) * (item.unitPrice || 0), 0)
  const taxTotal = subtotal * 1.06
  const discountTotal = data.finalAmount || taxTotal

  // 构造创建数据
  const createData: any = {
    quotationNo,
    client: data.clientId ? { connect: { id: data.clientId } } : undefined,
    clientContactPerson: data.clientContactPerson,
    consultationNo: data.consultationNo || data.consultationId || undefined,

    // 注意：Quotation 模型不再包含 sampleName 等扁平化字段，这些信息在 items 或 samples 中

    follower: data.follower,
    clientRemark: data.paymentTerms,
    subtotal,
    taxTotal,
    discountTotal,
    status: data.status || 'draft',
    clientStatus: data.clientResponse || 'pending',
    // 优先使用手动提供的值，否则继承咨询单的值
    clientReportDeadline: data.clientReportDeadline ? new Date(data.clientReportDeadline) : (inheritedDeadline || null),
    createdBy: user?.id ? { connect: { id: user.id } } : undefined,
    items: {
      create: items.map((item: any) => ({
        sampleName: item.sampleName || '',
        serviceItem: item.serviceItem || '',
        methodStandard: item.methodStandard || '',
        quantity: Number(item.quantity) || 1,
        unitPrice: item.unitPrice || 0,
        totalPrice: (Number(item.quantity) || 1) * (item.unitPrice || 0),
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
