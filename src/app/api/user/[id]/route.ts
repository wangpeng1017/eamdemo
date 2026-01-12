import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { withAuth, success, notFound, badRequest } from '@/lib/api-handler'

// 获取用户详情 - 需要登录
export const GET = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, username: true, name: true, phone: true, email: true,
      status: true, createdAt: true, deptId: true, dept: true,
      roles: { include: { role: true } }
    }
  })

  if (!targetUser) {
    notFound('用户不存在')
  }

  return success(targetUser)
})

// 更新用户 - 需要登录
export const PUT = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const data = await request.json()

  const updateData: Record<string, unknown> = {
    name: data.name,
    phone: data.phone,
    email: data.email,
    status: data.status,
    deptId: data.deptId,
  }

  if (data.password) {
    // 密码复杂度验证
    if (data.password.length < 6) {
      badRequest('密码至少6个字符')
    }
    updateData.password = await bcrypt.hash(data.password, 10)
  }

  const updatedUser = await prisma.user.update({ where: { id }, data: updateData })
  return success(updatedUser)
})

// 删除用户 - 需要登录，检查关联数据
export const DELETE = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params

  // 不能删除自己
  if (id === user.id) {
    badRequest('不能删除当前登录用户')
  }

  // 先删除用户角色关联
  await prisma.userRole.deleteMany({ where: { userId: id } })

  // 再删除用户
  await prisma.user.delete({ where: { id } })
  return success({ success: true })
})
