import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success, badRequest } from '@/lib/api-handler'

// 获取部门列表 - 需要登录
export const GET = withAuth(async (request: NextRequest, user) => {
  const { searchParams } = new URL(request.url)
  const isTree = searchParams.get('tree') === 'true'

  const list = await prisma.dept.findMany({
    orderBy: { sort: 'asc' },
    include: { _count: { select: { users: true } } }
  })

  if (isTree) {
    const buildTree = (parentId: string | null = null): unknown[] => {
      return list
        .filter(item => item.parentId === parentId)
        .map(item => ({
          key: item.id,
          title: item.name,
          value: item.id,
          children: buildTree(item.id),
          ...item
        }))
    }
    const tree = buildTree(null)
    return success(tree)
  }

  return success({ list })
})

// 创建部门 - 需要登录
export const POST = withAuth(async (request: NextRequest, user) => {
  const data = await request.json()
  const dept = await prisma.dept.create({ data })
  return success(dept)
})

// 更新部门 - 需要登录
export const PUT = withAuth(async (request: NextRequest, user) => {
  const data = await request.json()
  const { id, ...updateData } = data
  if (!id) {
    badRequest('ID is required')
  }

  const dept = await prisma.dept.update({
    where: { id },
    data: updateData
  })
  return success(dept)
})
