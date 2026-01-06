import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, notFound, badRequest } from '@/lib/api-handler'

// 获取单个权限
export const GET = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<{ id: string }> }
) => {
  const { id } = await context!.params

  const permission = await prisma.permission.findUnique({
    where: { id },
  })

  if (!permission) {
    notFound('权限不存在')
  }

  return success(permission)
})

// 更新权限
export const PUT = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<{ id: string }> }
) => {
  const { id } = await context!.params
  const data = await request.json()

  const existing = await prisma.permission.findUnique({ where: { id } })
  if (!existing) {
    notFound('权限不存在')
  }

  const permission = await prisma.permission.update({
    where: { id },
    data: {
      name: data.name,
      code: data.code,
      type: data.type,
      parentId: data.parentId,
      path: data.path,
      icon: data.icon,
      sort: data.sort,
      status: data.status,
    },
  })

  return success(permission)
})

// 删除权限
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<{ id: string }> }
) => {
  const { id } = await context!.params

  // 检查是否有子权限
  const children = await prisma.permission.count({ where: { parentId: id } })
  if (children > 0) {
    badRequest('请先删除子权限')
  }

  // 检查是否有角色关联
  const rolePermissions = await prisma.rolePermission.count({ where: { permissionId: id } })
  if (rolePermissions > 0) {
    badRequest('该权限已分配给角色，无法删除')
  }

  await prisma.permission.delete({ where: { id } })

  return success({ success: true })
})
