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

  // 如果包含 permissions 数组，处理权限关联
  if (data.permissions && Array.isArray(data.permissions)) {
    const permissionIds: string[] = data.permissions

    // 使用事务：先删除旧权限，再创建新权限
    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      ...permissionIds.map(permissionId =>
        prisma.rolePermission.create({
          data: { roleId: id, permissionId }
        })
      ),
    ])

    // 返回更新后的角色
    const updatedRole = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: { select: { permissionId: true } },
        _count: { select: { users: true } },
      }
    })
    return success({
      ...updatedRole,
      permissions: updatedRole?.permissions.map(rp => rp.permissionId) || [],
    })
  }

  // 普通字段更新
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
