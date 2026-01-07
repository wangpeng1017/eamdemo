import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// 获取客户列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const type = searchParams.get('type')
  const status = searchParams.get('status')
  const keyword = searchParams.get('keyword')

  const where: any = { status: 'approved' }  // 默认只返回已审批客户
  if (type) where.type = type
  // 允许通过参数覆盖默认状态过滤
  if (status && status !== 'approved') where.status = status
  if (keyword) {
    where.OR = [
      { name: { contains: keyword } },
      { shortName: { contains: keyword } },
      { contact: { contains: keyword } },
    ]
  }

  const [list, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.client.count({ where }),
  ])

  return NextResponse.json({ list, total, page, pageSize })
}

// 创建客户
export async function POST(request: NextRequest) {
  const data = await request.json()

  const client = await prisma.client.create({
    data: {
      ...data,
    }
  })

  return NextResponse.json(client)
}
