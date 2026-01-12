import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success } from '@/lib/api-handler'

// 获取检测报告列表 - 需要登录
export const GET = withAuth(async (request: NextRequest, user) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')

  const [list, total] = await Promise.all([
    prisma.testReport.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { task: true }
    }),
    prisma.testReport.count(),
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
