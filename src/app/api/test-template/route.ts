import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const category = searchParams.get('category')
  const status = searchParams.get('status')

  const where: any = {}
  if (category) where.category = category
  if (status) where.status = status

  const [list, total] = await Promise.all([
    prisma.testTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.testTemplate.count({ where }),
  ])

  return NextResponse.json({ list, total, page, pageSize })
}

export async function POST(request: NextRequest) {
  const data = await request.json()

  // 生成模版编号
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const count = await prisma.testTemplate.count({
    where: { code: { startsWith: `MB${today}` } }
  })
  const code = `MB${today}${String(count + 1).padStart(3, '0')}`

  const template = await prisma.testTemplate.create({
    data: {
      ...data,
      code,
      schema: typeof data.schema === 'string' ? data.schema : JSON.stringify(data.schema),
    }
  })

  return NextResponse.json(template)
}
