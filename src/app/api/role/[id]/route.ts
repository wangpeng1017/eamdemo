import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success, notFound, badRequest } from '@/lib/api-handler'

// 获取角色详情 - 需要登录
export const GET = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { users: true } }
    }
  })

  if (!role) {
    notFound('角色不存在')
  }

  return success(role)
})

// 更新角色 - 需要登录
export const PUT = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const data = await request.json()
  const role = await prisma.role.update({ where: { id }, data })
  return success(role)
})

// 删除角色 - 需要登录，检查关联数据
export const DELETE = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params

  // 检查是否有关联的用户
  const userCount = await prisma.userRole.count({
    where: { roleId: id }
  })
  if (userCount > 0) {
    badRequest(`无法删除：该角色已分配给 ${userCount} 个用户`)
  }

  // 先删除角色权限关联
  await prisma.rolePermission.deleteMany({ where: { roleId: id } })

  // 再删除角色
  await prisma.role.delete({ where: { id } })
  return success({ success: true })
})
