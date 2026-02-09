import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success, error } from '@/lib/api-handler'

// 获取发票列表 - 需要登录
export const GET = withAuth(async (request: NextRequest, user) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')

  const [list, total] = await Promise.all([
    prisma.financeInvoice.findMany({
      include: {
        entrustment: {
          select: {
            entrustmentNo: true,
            clientId: true,
            contactPerson: true,
          }
        },
        client: {
          select: {
            name: true,
            contact: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.financeInvoice.count(),
  ])

  return success({ list, total, page, pageSize })
})

// 创建发票 - 需要登录
export const POST = withAuth(async (request: NextRequest, user) => {
  const data = await request.json()

  // 校验 paymentDate 必填
  if (!data.paymentDate) {
    return error('PAYMENT_DATE_REQUIRED', '回款日期为必填项')
  }

  // 校验 entrustmentId 唯一性
  if (data.entrustmentId) {
    const existing = await prisma.financeInvoice.findFirst({
      where: { entrustmentId: data.entrustmentId }
    })
    if (existing) {
      return error('ENTRUSTMENT_ALREADY_LINKED', '该委托单已关联发票')
    }
  }

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const count = await prisma.financeInvoice.count({
    where: { invoiceNo: { startsWith: `FP${today}` } }
  })
  const invoiceNo = `FP${today}${String(count + 1).padStart(4, '0')}`

  // 计算税额和总金额
  const invoiceAmount = Number(data.invoiceAmount) || 0
  const taxRate = Number(data.taxRate) || 0.06
  const taxAmount = Math.round(invoiceAmount * taxRate * 100) / 100
  const totalAmount = Math.round((invoiceAmount + taxAmount) * 100) / 100

  const invoice = await prisma.financeInvoice.create({
    data: {
      invoiceNo,
      entrustmentId: data.entrustmentId || null,
      clientName: data.clientName || '',
      clientTaxNo: data.clientTaxNo || null,
      invoiceAmount,
      taxRate,
      taxAmount,
      totalAmount,
      invoiceType: data.invoiceType || '增值税普通发票',
      issuedDate: data.issuedDate || null,
      paymentDate: data.paymentDate || null,
      status: data.status || 'pending',
    }
  })
  return success(invoice)
})
