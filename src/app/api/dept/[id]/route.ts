import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success, badRequest } from '@/lib/api-handler'

// 更新部门 - 需要登录
export const PUT = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const data = await request.json()
  const dept = await prisma.dept.update({ where: { id }, data })
  return success(dept)
})

// 删除部门 - 需要登录，检查关联数据
export const DELETE = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params

  // 检查是否有子部门
  const childCount = await prisma.dept.count({
    where: { parentId: id }
  })
  if (childCount > 0) {
    badRequest(`无法删除：该部门有 ${childCount} 个子部门`)
  }

  // 检查是否有关联用户
  const userCount = await prisma.user.count({
    where: { deptId: id }
  })
  if (userCount > 0) {
    badRequest(`无法删除：该部门有 ${userCount} 个关联用户`)
  }

  await prisma.dept.delete({ where: { id } })
  return success({ success: true })
})
