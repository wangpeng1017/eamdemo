import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const invoice = await prisma.financeInvoice.findUnique({ where: { id } })
  return NextResponse.json(invoice)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()

    // 过滤掉不允许直接更新的字段（关联对象、主键、时间戳等）
    const {
      id: _id,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      client: _client,
      entrustment: _entrustment,
      receivable: _receivable,
      clientId: _clientId,
      receivableId: _receivableId,
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

    const invoice = await prisma.financeInvoice.update({ where: { id }, data })
    return NextResponse.json({ success: true, data: invoice })
  } catch (error: any) {
    console.error('更新发票失败:', error)
    return NextResponse.json(
      { success: false, error: error.message || '更新发票失败' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.financeInvoice.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
