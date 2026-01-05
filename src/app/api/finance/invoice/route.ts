import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')

  const [list, total] = await Promise.all([
    prisma.financeInvoice.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.financeInvoice.count(),
  ])

  return NextResponse.json({ list, total, page, pageSize })
}

export async function POST(request: NextRequest) {
  const data = await request.json()
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const count = await prisma.financeInvoice.count({
    where: { invoiceNo: { startsWith: `FP${today}` } }
  })
  const invoiceNo = `FP${today}${String(count + 1).padStart(4, '0')}`

  const invoice = await prisma.financeInvoice.create({
    data: { ...data, invoiceNo }
  })
  return NextResponse.json(invoice)
}
