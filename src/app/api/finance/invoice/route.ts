import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success, error } from '@/lib/api-handler'
import { generateInvoiceNo, generateReceivableNo } from '@/lib/generate-no'
import { Prisma } from '@prisma/client'

// 获取发票列表 - 需要登录
export const GET = withAuth(async (request: NextRequest, user) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const keyword = searchParams.get('keyword')
  const status = searchParams.get('status')

  const where: Record<string, unknown> = {}
  if (keyword) {
    where.OR = [
      { invoiceNo: { contains: keyword } },
      { clientName: { contains: keyword } },
    ]
  }
  if (status) {
    where.status = status
  }

  const [list, total] = await Promise.all([
    prisma.financeInvoice.findMany({
      where,
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
    prisma.financeInvoice.count({ where }),
  ])

  // Prisma Decimal 对象无法直接 JSON 序列化，需转为 Number
  const serializedList = list.map((item) => ({
    ...item,
    invoiceAmount: Number(item.invoiceAmount),
    taxRate: Number(item.taxRate),
    taxAmount: Number(item.taxAmount),
    totalAmount: Number(item.totalAmount),
  }))

  return success({ list: serializedList, total, page, pageSize })
})

// 创建发票 - 需要登录
// 创建发票后自动创建关联的应收款记录
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

  const invoiceNo = await generateInvoiceNo()

  // 计算税额和总金额
  const invoiceAmount = Number(data.invoiceAmount) || 0
  const taxRate = Number(data.taxRate) || 0.06
  const taxAmount = Math.round(invoiceAmount * taxRate * 100) / 100
  const totalAmount = Math.round((invoiceAmount + taxAmount) * 100) / 100

  // 使用事务：创建发票 + 自动创建应收款
  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const invoice = await tx.financeInvoice.create({
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
        attachments: data.attachments ? JSON.stringify(data.attachments) : null,
        status: data.status || 'pending',
      }
    })

    // 自动创建关联应收款记录
    const receivableNo = await generateReceivableNo()
    const dueDate = data.paymentDate
      ? new Date(data.paymentDate)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 默认30天后

    const receivable = await tx.financeReceivable.create({
      data: {
        receivableNo,
        entrustmentId: data.entrustmentId || null,
        clientName: data.clientName || '',
        amount: totalAmount,
        receivedAmount: 0,
        status: 'pending',
        dueDate,
        remark: JSON.stringify({ invoiceNo }),
      },
    })

    // 将应收款ID写回发票
    await tx.financeInvoice.update({
      where: { id: invoice.id },
      data: { receivableId: receivable.id },
    })

    return { ...invoice, receivableId: receivable.id }
  })

  // Prisma Decimal 对象无法直接 JSON 序列化，需转为 Number
  return success({
    ...result,
    invoiceAmount: Number(result.invoiceAmount),
    taxRate: Number(result.taxRate),
    taxAmount: Number(result.taxAmount),
    totalAmount: Number(result.totalAmount),
  })
})
