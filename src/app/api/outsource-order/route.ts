import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success, validateRequired } from '@/lib/api-handler'
import { generateNo, NumberPrefixes } from '@/lib/generate-no'
import { getEntrustmentBasedFilter } from '@/lib/data-permission'

// 获取委外订单列表 - 需要登录 + 数据权限过滤
export const GET = withAuth(async (request: NextRequest, user) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const status = searchParams.get('status')
  const supplierId = searchParams.get('supplierId')
  const keyword = searchParams.get('keyword')
  const filter = searchParams.get('filter')

  // 注入数据权限过滤（通过 task 关联委托单链路）
  const permissionFilter = await getEntrustmentBasedFilter(user.id)
  const where: Record<string, unknown> = {}
  // 如果有权限过滤（非 all 权限），通过 task 关联过滤
  if (Object.keys(permissionFilter).length > 0) {
    where.task = permissionFilter
  }
  if (status) where.status = status
  if (supplierId) where.supplierId = supplierId
  if (keyword) {
    where.OR = [
      { orderNo: { contains: keyword } },
      { supplierName: { contains: keyword } },
      { supplier: { name: { contains: keyword } } },
    ]
  }

  // filter=my: 只显示当前用户作为内部负责人的订单
  // 使用合并逻辑，不覆盖已有的权限过滤
  if (filter === 'my') {
    const myFilter = {
      project: {
        subcontractAssignee: user.id
      }
    }
    if (where.task) {
      // 合并权限过滤和 my 过滤
      where.task = { ...(where.task as object), ...myFilter }
    } else {
      where.task = myFilter
    }
  }

  const [list, total] = await Promise.all([
    prisma.outsourceOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        supplier: { select: { id: true, name: true } },
        task: {
          include: {
            project: {
              select: {
                id: true,
                subcontractAssignee: true,
                subcontractAssigneeName: true,
              }
            }
          }
        }
      },
    }),
    prisma.outsourceOrder.count({ where }),
  ])

  // 统计各状态数量
  const stats = await prisma.outsourceOrder.groupBy({
    by: ['status'],
    _count: true,
  })

  // 统计总费用
  const totalAmount = await prisma.outsourceOrder.aggregate({
    _sum: { amount: true },
  })

  return success({
    list: list.map((item: any) => ({
      ...item,
      amount: item.amount ? Number(item.amount) : 0,
    })),
    total,
    page,
    pageSize,
    stats: {
      ...stats.reduce((acc: any, item: any) => {
        acc[item.status] = item._count
        return acc
      }, {} as Record<string, number>),
      totalAmount: Number(totalAmount._sum?.amount || 0),
    },
  })
})

// 创建委外订单 - 需要登录
export const POST = withAuth(async (request: NextRequest, user) => {
  const data = await request.json()

  validateRequired(data, ['supplierId'])

  const orderNo = await generateNo(NumberPrefixes.OUTSOURCE)

  const order = await prisma.outsourceOrder.create({
    data: {
      orderNo,
      supplierId: data.supplierId,
      supplierName: data.supplierName || null,
      taskId: data.taskId || null,
      items: data.items ? JSON.stringify(data.items) : null,
      status: 'pending',
      expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
      amount: data.amount || 0,
      remark: data.remark || null,
    },
    include: { supplier: true },
  })

  return success({
    ...order,
    amount: order.amount ? Number(order.amount) : 0,
  })
})
