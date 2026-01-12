import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success, validateRequired } from '@/lib/api-handler'

// 获取供应商分类列表 - 需要登录
export const GET = withAuth(async (request: NextRequest, user) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')

  const [list, total] = await Promise.all([
    prisma.supplierCategory.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.supplierCategory.count(),
  ])

  return success({ list, total, page, pageSize })
})

// 创建供应商分类 - 需要登录
export const POST = withAuth(async (request: NextRequest, user) => {
  const data = await request.json()

  validateRequired(data, ['name'])

  // 生成分类编码
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const count = await prisma.supplierCategory.count({
    where: { code: { startsWith: `SC${today}` } }
  })
  const code = `SC${today}${String(count + 1).padStart(3, '0')}`

  const category = await prisma.supplierCategory.create({
    data: {
      name: data.name as string,
      code,
      description: (data.description as string) || null,
    },
  })

  return success(category)
})
