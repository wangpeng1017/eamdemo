import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// 获取报价列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const status = searchParams.get('status')
  const keyword = searchParams.get('keyword')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  const where: any = {}

  if (status) {
    where.status = status
  }
  if (keyword) {
    where.OR = [
      { clientCompany: { contains: keyword } },
      { clientContact: { contains: keyword } },
      { quotationNo: { contains: keyword } },
    ]
  }
  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) where.createdAt.gte = new Date(startDate)
    if (endDate) where.createdAt.lte = new Date(endDate)
  }

  const [list, total] = await Promise.all([
    prisma.quotation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        items: true,
        approvals: {
          orderBy: { timestamp: 'desc' },
        },
      },
    }),
    prisma.quotation.count({ where }),
  ])

  // 格式化数据以匹配前端期望的字段名
  const formattedList = list.map((item: any) => ({
    ...item,
    clientName: item.clientCompany,
    contactPerson: item.clientContact,
    contactPhone: item.clientTel,
    quotationDate: item.createdAt,
    validDays: 30,
    totalAmount: item.subtotal,
    taxRate: 0.06,
    taxAmount: item.taxTotal ? (Number(item.taxTotal) - Number(item.subtotal)) : 0,
    totalWithTax: item.taxTotal || item.subtotal,
    discountAmount: item.discountTotal ? (Number(item.taxTotal || item.subtotal) - Number(item.discountTotal)) : 0,
    finalAmount: item.discountTotal || item.taxTotal || item.subtotal,
    paymentTerms: item.clientRemark,
    clientResponse: item.clientStatus,
  }))

  return NextResponse.json({ list: formattedList, total, page, pageSize })
}

// 创建报价
export async function POST(request: NextRequest) {
  const data = await request.json()

  // 生成报价单号
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const count = await prisma.quotation.count({
    where: { quotationNo: { startsWith: `BJ${today}` } }
  })
  const quotationNo = `BJ${today}${String(count + 1).padStart(4, '0')}`

  // 计算总金额
  const items = data.items || []
  const subtotal = items.reduce((sum: number, item: any) => {
    return sum + (item.quantity || 1) * (item.unitPrice || 0)
  }, 0)
  const taxTotal = subtotal * 1.06
  const discountTotal = data.finalAmount || taxTotal

  const quotation = await prisma.quotation.create({
    data: {
      quotationNo,
      clientCompany: data.clientName,
      clientContact: data.contactPerson,
      clientTel: data.contactPhone,
      clientEmail: data.clientEmail,
      clientAddress: data.clientAddress,
      consultationNo: data.consultationId,
      sampleName: data.sampleName,
      clientRemark: data.paymentTerms,
      subtotal,
      taxTotal,
      discountTotal,
      status: data.status || 'draft',
      clientStatus: data.clientResponse || 'pending',
      items: {
        create: items.map((item: any) => ({
          serviceItem: item.serviceItem,
          methodStandard: item.methodStandard,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          totalPrice: (item.quantity || 1) * (item.unitPrice || 0),
        })),
      },
    },
    include: {
      items: true,
    },
  })

  return NextResponse.json(quotation)
}
