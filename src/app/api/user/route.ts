import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { withAuth, success, badRequest } from '@/lib/api-handler'
import { validate, validatePagination, createUserSchema } from '@/lib/validation'

// 获取用户列表 - 需要登录
export const GET = withAuth(async (request: NextRequest, user) => {
  const { searchParams } = new URL(request.url)
  const { page, pageSize } = validatePagination(searchParams)
  const deptId = searchParams.get('deptId')

  const whereClause: Record<string, unknown> = {}

  // 如果指定了部门，递归查询该部门及所有子部门的用户
  if (deptId && deptId !== 'undefined' && deptId !== 'null') {
    // 1. 获取所有部门关系
    const allDepts = await prisma.dept.findMany({
      select: { id: true, parentId: true }
    })

    // 2. 递归查找所有子部门ID
    const findAllDescendants = (parentId: string): string[] => {
      const children = allDepts.filter(d => d.parentId === parentId)
      let ids = children.map(c => c.id)
      for (const child of children) {
        ids = [...ids, ...findAllDescendants(child.id)]
      }
      return ids
    }

    const descendantIds = findAllDescendants(deptId)
    const allDeptIds = [deptId, ...descendantIds]

    whereClause.deptId = { in: allDeptIds }
  }

  const [list, total] = await Promise.all([
    prisma.user.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, username: true, name: true, phone: true, email: true,
        status: true, createdAt: true, dept: true,
        roles: { include: { role: true } }
      }
    }),
    prisma.user.count({ where: whereClause }),
  ])

  return success({ list, total, page, pageSize })
})

// 创建用户 - 需要登录（管理员操作）
export const POST = withAuth(async (request: NextRequest, user) => {
  const data = await request.json()

  // 使用 Zod 验证输入
  const validated = validate(createUserSchema, data)

  // 检查用户名是否已存在
  const existing = await prisma.user.findUnique({
    where: { username: validated.username }
  })
  if (existing) {
    badRequest('用户名已存在')
  }

  // 密码必须由用户提供或使用随机密码
  const password = validated.password || Math.random().toString(36).slice(-10)
  const hashedPassword = await bcrypt.hash(password, 10)

  const newUser = await prisma.user.create({
    data: {
      username: validated.username,
      password: hashedPassword,
      name: validated.name,
      phone: validated.phone,
      email: validated.email,
      deptId: validated.deptId,
      status: validated.status,
    }
  })

  return success(newUser)
})
