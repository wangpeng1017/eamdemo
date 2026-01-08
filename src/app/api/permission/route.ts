import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, validateRequired } from '@/lib/api-handler'

type PermissionWithChildren = {
  id: string
  name: string
  code: string
  type: number
  parentId: string | null
  sort: number
  status: number
  createdAt: Date
  updatedAt: Date
  children?: PermissionWithChildren[]
}

// 获取权限列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const tree = searchParams.get('tree') === 'true'
  const type = searchParams.get('type')

  const where: Record<string, unknown> = {}
  if (type) where.type = parseInt(type)

  const permissions = await prisma.permission.findMany({
    where,
    orderBy: { sort: 'asc' },
  })

  // 如果需要树形结构
  if (tree) {
    const buildTree = (items: typeof permissions, parentId: string | null = null): PermissionWithChildren[] => {
      return items
        .filter((item: any) => item.parentId === parentId)
        .map((item: any) => ({
          ...item,
          children: buildTree(items, item.id),
        }))
    }
    return success(buildTree(permissions))
  }

  return success({ list: permissions, total: permissions.length })
})

// 创建权限
export const POST = withErrorHandler(async (request: NextRequest) => {
  const data = await request.json()

  validateRequired(data, ['name', 'code', 'type'])

  const permission = await prisma.permission.create({
    data: {
      name: data.name,
      code: data.code,
      type: parseInt(data.type),
      parentId: data.parentId || null,
      sort: data.sort || 0,
      status: data.status ?? 1,
    },
  })

  return success(permission)
})
