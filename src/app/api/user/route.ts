import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const deptId = searchParams.get('deptId')

  let whereClause: any = {}

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

  return NextResponse.json({ list, total, page, pageSize })
}

export async function POST(request: NextRequest) {
  const data = await request.json()
  const hashedPassword = await bcrypt.hash(data.password || '123456', 10)

  const user = await prisma.user.create({
    data: {
      username: data.username,
      password: hashedPassword,
      name: data.name,
      phone: data.phone,
      email: data.email,
      status: data.status ?? 1,
    }
  })
  return NextResponse.json(user)
}
