import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success } from '@/lib/api-handler'

// 获取角色列表 - 需要登录
export const GET = withAuth(async (request: NextRequest, user) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '100')

  const [list, total] = await Promise.all([
    prisma.role.findMany({
      orderBy: { id: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { users: true } },
        permissions: { select: { permissionId: true } },
      }
    }),
    prisma.role.count(),
  ])

  // 将 permissions 转换为 permissionId 数组，方便前端使用
  const formattedList = list.map(role => ({
    ...role,
    permissions: role.permissions.map(rp => rp.permissionId),
  }))

  return success({ list: formattedList, total, page, pageSize })
})

// 创建角色 - 需要登录
export const POST = withAuth(async (request: NextRequest, user) => {
  const data = await request.json()
  const role = await prisma.role.create({ data })
  return success(role)
})
