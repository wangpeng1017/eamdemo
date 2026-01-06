import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// 获取可借用的样品列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '100')

  // 可借用条件：已收样且未被借出
  const [list, total] = await Promise.all([
    prisma.sample.findMany({
      where: {
        status: { in: ['received', 'allocated'] },
      },
      select: {
        id: true,
        sampleNo: true,
        name: true,
        specification: true,
        unit: true,
        quantity: true,
        storageLocation: true,
      },
      orderBy: { receiptDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.sample.count({
      where: { status: { in: ['received', 'allocated'] } },
    }),
  ])

  return NextResponse.json({
    list,
    total,
    page,
    pageSize,
  })
}
