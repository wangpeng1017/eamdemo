import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// 获取样品领用记录列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const sampleId = searchParams.get('sampleId')
  const status = searchParams.get('status')
  const requisitionBy = searchParams.get('requisitionBy')

  const where: any = {}
  if (sampleId) where.sampleId = sampleId
  if (status) where.status = status
  if (requisitionBy) where.requisitionBy = requisitionBy

  const [list, total] = await Promise.all([
    prisma.sampleRequisition.findMany({
      where,
      include: {
        sample: {
          select: {
            sampleNo: true,
            name: true,
            specification: true,
            unit: true,
          }
        }
      },
      orderBy: { requisitionDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.sampleRequisition.count({ where }),
  ])

  return NextResponse.json({ list, total, page, pageSize })
}

// 创建样品领用记录
export async function POST(request: NextRequest) {
  const data = await request.json()
  const { sampleId, quantity, remark, expectedReturnDate, requisitionBy } = data

  // 验证样品是否存在
  const sample = await prisma.sample.findUnique({
    where: { id: sampleId }
  })

  if (!sample) {
    return NextResponse.json({ error: '样品不存在' }, { status: 404 })
  }

  // 生成领用单号
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const count = await prisma.sampleRequisition.count({
    where: { requisitionNo: { startsWith: `LY${today}` } }
  })
  const requisitionNo = `LY${today}${String(count + 1).padStart(4, '0')}`

  // 创建领用记录
  const requisition = await prisma.sampleRequisition.create({
    data: {
      sampleId,
      requisitionNo,
      quantity,
      remark,
      expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : null,
      requisitionBy,
    }
  })

  return NextResponse.json(requisition)
}
