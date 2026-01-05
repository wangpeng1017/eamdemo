import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')

  const [list, total] = await Promise.all([
    prisma.supplier.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.supplier.count(),
  ])

  return NextResponse.json({ list, total, page, pageSize })
}

export async function POST(request: NextRequest) {
  const data = await request.json()
  const supplier = await prisma.supplier.create({ data })
  return NextResponse.json(supplier)
}
