import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success } from '@/lib/api-handler'
import { generateReceivableNo } from '@/lib/generate-no'
import { getEntrustmentBasedFilter } from '@/lib/data-permission'

// 获取应收账款列表 - 需要登录 + 数据权限过滤
export const GET = withAuth(async (request: NextRequest, user) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const keyword = searchParams.get('keyword')
  const status = searchParams.get('status')

  // 注入数据权限过滤
  // 财务角色需要查看所有应收款，不受委托单链路限制
  const { prisma: db } = await import('@/lib/prisma')
  const userWithRoles = await db.user.findUnique({
    where: { id: user.id },
    select: { roles: { select: { role: { select: { code: true, dataScope: true } } } } }
  })
  const roleCodes = userWithRoles?.roles.map(r => r.role.code) || []
  const hasFinanceRole = roleCodes.some(c => ['admin', 'finance', 'finance_manager', 'cashier'].includes(c))
  const hasAllScope = userWithRoles?.roles.some(r => r.role.dataScope === 'all')

  let permissionFilter: Record<string, unknown> = {}
  if (!hasFinanceRole && !hasAllScope) {
    permissionFilter = await getEntrustmentBasedFilter(user.id)
  }
  const where: Record<string, unknown> = { ...permissionFilter }
  if (keyword) {
    where.OR = [
      { receivableNo: { contains: keyword } },
      { clientName: { contains: keyword } },
    ]
  }
  if (status) {
    where.status = status
  }

  const [list, total] = await Promise.all([
    prisma.financeReceivable.findMany({
      where,
      include: {
        invoices: { select: { invoiceNo: true, totalAmount: true, status: true } },
        entrustment: { select: { entrustmentNo: true, followerId: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.financeReceivable.count({ where }),
  ])

  return success({ list, total, page, pageSize })
})

// 创建应收账款 - 需要登录
export const POST = withAuth(async (request: NextRequest, user) => {
  const data = await request.json()

  // 自动生成编号
  const receivableNo = data.receivableNo || await generateReceivableNo()

  const receivable = await prisma.financeReceivable.create({
    data: {
      receivableNo,
      entrustmentId: data.entrustmentId || null,
      clientName: data.clientName || '',
      amount: data.amount || 0,
      receivedAmount: data.receivedAmount || 0,
      status: data.status || 'pending',
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      remark: data.remark || null,
    }
  })
  return success(receivable)
})
