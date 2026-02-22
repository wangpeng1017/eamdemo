import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success } from '@/lib/api-handler'
import { getEntrustmentBasedFilter } from '@/lib/data-permission'

// 获取检测报告列表 - 需要登录 + 数据权限过滤
export const GET = withAuth(async (request: NextRequest, user) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')

  // 注入数据权限过滤
  const permissionFilter = await getEntrustmentBasedFilter(user.id)
  const where = permissionFilter as Record<string, unknown>

  const [list, total] = await Promise.all([
    prisma.testReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { task: true }
    }),
    prisma.testReport.count({ where }),
  ])

  return success({ list, total, page, pageSize })
})

// 创建检测报告 - 需要登录
export const POST = withAuth(async (request: NextRequest, user) => {
  const data = await request.json()
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const count = await prisma.testReport.count({
    where: { reportNo: { startsWith: `BG${today}` } }
  })
  const reportNo = `BG${today}${String(count + 1).padStart(4, '0')}`

  const report = await prisma.testReport.create({
    data: { ...data, reportNo }
  })
  return success(report)
})
