import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// 获取样品明细（包含借还记录）
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const status = searchParams.get('status')
  const keyword = searchParams.get('keyword')

  const where: any = {}
  if (status) where.status = status
  if (keyword) {
    where.OR = [
      { sampleNo: { contains: keyword } },
      { name: { contains: keyword } },
    ]
  }

  const [list, total] = await Promise.all([
    prisma.sample.findMany({
      where,
      include: {
        entrustment: {
          select: { clientName: true },
        },
        requisitions: {
          where: { status: { in: ['requisitioned', 'overdue'] } },
          orderBy: { requisitionDate: 'desc' },
          take: 10,
        },
      },
      orderBy: { receiptDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.sample.count({ where }),
  ])

  // 格式化数据
  const formattedList = list.map((item: any) => ({
    ...item,
    clientName: item.entrustment?.clientName,
  }))

  return NextResponse.json({
    list: formattedList,
    total,
    page,
    pageSize,
  })
}
