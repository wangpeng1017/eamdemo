import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// 获取咨询列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const status = searchParams.get('status')

  const where = status ? { status } : {}

  const [list, total] = await Promise.all([
    prisma.consultation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.consultation.count({ where }),
  ])

  return NextResponse.json({ list, total, page, pageSize })
}

// 创建咨询
export async function POST(request: NextRequest) {
  const data = await request.json()

  // 生成咨询单号
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const count = await prisma.consultation.count({
    where: { consultationNo: { startsWith: `ZX${today}` } }
  })
  const consultationNo = `ZX${today}${String(count + 1).padStart(4, '0')}`

  const consultation = await prisma.consultation.create({
    data: { ...data, consultationNo }
  })

  return NextResponse.json(consultation)
}
