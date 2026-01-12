import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success } from '@/lib/api-handler'
import { getDataFilter } from '@/lib/data-permission'

// 获取检测任务列表 - 需要登录
export const GET = withAuth(async (request: NextRequest, user) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')

  // 注入数据权限过滤
  const permissionFilter = await getDataFilter()
  const where = permissionFilter as Record<string, unknown>

  const [list, total] = await Promise.all([
    prisma.testTask.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { sample: true, device: true }
    }),
    prisma.testTask.count({ where }),
  ])

  return success({ list, total, page, pageSize })
})

// 创建检测任务 - 需要登录
export const POST = withAuth(async (request: NextRequest, user) => {
  const data = await request.json()
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const count = await prisma.testTask.count({
    where: { taskNo: { startsWith: `JC${today}` } }
  })
  const taskNo = `JC${today}${String(count + 1).padStart(4, '0')}`

  const task = await prisma.testTask.create({
    data: { ...data, taskNo, createdById: user.id }
  })
  return success(task)
})
