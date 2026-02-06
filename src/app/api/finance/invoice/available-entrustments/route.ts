import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success } from '@/lib/api-handler'

// 获取可关联的委托单列表（未被其他发票关联的）
export const GET = withAuth(async (request: NextRequest, user) => {
  const { searchParams } = new URL(request.url)
  const keyword = searchParams.get('keyword') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')

  // 查询已被关联的委托单ID列表
  const linkedEntrustmentIds = await prisma.financeInvoice.findMany({
    where: { entrustmentId: { not: null } },
    select: { entrustmentId: true }
  })
  const excludeIds = linkedEntrustmentIds.map(item => item.entrustmentId)

  // 查询未被关联的委托单
  const where = {
    id: { notIn: excludeIds as string[] },
    ...(keyword && {
      OR: [
        { entrustmentNo: { contains: keyword } },
        { client: { name: { contains: keyword } } }
      ]
    })
  }

  const [list, total] = await Promise.all([
    prisma.entrustment.findMany({
      where,
      include: {
        client: {
          select: {
            name: true,
            contact: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.entrustment.count({ where })
  ])

  return success({ list, total, page, pageSize })
})
