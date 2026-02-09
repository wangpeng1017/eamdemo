import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ApprovalEngine } from '@/lib/approval/engine'
import { getDataFilter } from '@/lib/data-permission'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const status = searchParams.get('status')

  const where: any = {}
  if (status) where.status = status

  // 注入数据权限过滤
  const permissionFilter = await getDataFilter()
  Object.assign(where, permissionFilter)

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

export async function POST(request: NextRequest) {
  const session = await auth()
  const data = await request.json()

  // 新增委托单位时，状态默认为 draft（草稿），需用户手动提交审批
  const client = await prisma.client.create({
    data: {
      ...data,
      status: 'draft',
      createdById: session?.user?.id,
    }
  })

  return NextResponse.json(client)
}

