import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success } from '@/lib/api-handler'

// 获取报告分类列表 - 需要登录
export const GET = withAuth(async (request: NextRequest, user) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')

  const [list, total] = await Promise.all([
    prisma.reportCategory.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.reportCategory.count(),
  ])

  // 解析 JSON 字段
  const parsedList = list.map((item: any) => ({
    ...item,
    testTypes: item.testTypes ? JSON.parse(item.testTypes as string) : [],
  }))

  return success({ list: parsedList, total, page, pageSize })
})

// 创建报告分类 - 需要登录
export const POST = withAuth(async (request: NextRequest, user) => {
  const data = await request.json()

  const category = await prisma.reportCategory.create({
    data: {
      ...data,
      testTypes: data.testTypes ? JSON.stringify(data.testTypes) : null,
    }
  })

  return success(category)
})
