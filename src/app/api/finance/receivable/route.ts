import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success } from '@/lib/api-handler'

// 获取应收账款列表 - 需要登录
export const GET = withAuth(async (request: NextRequest, user) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')

  const [list, total] = await Promise.all([
    prisma.financeReceivable.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.financeReceivable.count(),
  ])

  return success({ list, total, page, pageSize })
})

// 创建应收账款 - 需要登录
export const POST = withAuth(async (request: NextRequest, user) => {
  const data = await request.json()
  const receivable = await prisma.financeReceivable.create({ data })
  return success(receivable)
})
