# -*- coding: utf-8 -*-
"""
Fix TypeScript type errors in API routes - Phase 4
"""

import os

def fix_outsource_order():
    """Fix outsource-order/route.ts"""
    file_path = '/Users/wangpeng/Downloads/limsnext/src/app/api/outsource-order/route.ts'

    content = """import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, validateRequired } from '@/lib/api-handler'
import { generateNo, NumberPrefixes } from '@/lib/generate-no'

// 获取委外订单列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const status = searchParams.get('status')
  const supplierId = searchParams.get('supplierId')
  const keyword = searchParams.get('keyword')

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (supplierId) where.supplierId = supplierId
  if (keyword) {
    where.OR = [
      { orderNo: { contains: keyword } },
      { supplierName: { contains: keyword } },
      { supplier: { name: { contains: keyword } } },
    ]
  }

  const [list, total] = await Promise.all([
    prisma.outsourceOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        supplier: { select: { id: true, name: true } },
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
    list: list.map((item) => ({
      ...item,
      amount: item.amount ? Number(item.amount) : 0,
    })),
    total,
    page,
    pageSize,
    stats: {
      ...stats.reduce((acc, item) => {
        acc[item.status] = item._count
        return acc
      }, {} as Record<string, number>),
      totalAmount: Number(totalAmount._sum?.amount || 0),
    },
  })
})

// 创建委外订单
export const POST = withErrorHandler(async (request: NextRequest) => {
  const data = await request.json()

  validateRequired(data, ['supplierId'])

  const orderNo = await generateNo(NumberPrefixes.ENTRUSTMENT, 4)

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
"""

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'✓ Fixed: {file_path}')

def fix_permission():
    """Fix permission/route.ts"""
    file_path = '/Users/wangpeng/Downloads/limsnext/src/app/api/permission/route.ts'

    content = """import { prisma } from '@/lib/prisma'
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
        .filter((item) => item.parentId === parentId)
        .map((item) => ({
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
"""

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'✓ Fixed: {file_path}')

def fix_report_category():
    """Fix report-category/route.ts"""
    file_path = '/Users/wangpeng/Downloads/limsnext/src/app/api/report-category/route.ts'

    content = """import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success } from '@/lib/api-handler'

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')

  const [list, total] = await Promise.all([
    prisma.reportCategory.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.reportCategory.count(),
  ])

  // 解析 JSON 字段
  const parsedList = list.map((item) => ({
    ...item,
    testTypes: item.testTypes ? JSON.parse(item.testTypes as string) : [],
  }))

  return success({ list: parsedList, total, page, pageSize })
})

export const POST = withErrorHandler(async (request: NextRequest) => {
  const data = await request.json()

  const category = await prisma.reportCategory.create({
    data: {
      ...data,
      testTypes: data.testTypes ? JSON.stringify(data.testTypes) : null,
    }
  })

  return success(category)
})
"""

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'✓ Fixed: {file_path}')

def fix_quotation_id():
    """Fix quotation/[id]/route.ts"""
    file_path = '/Users/wangpeng/Downloads/limsnext/src/app/api/quotation/[id]/route.ts'

    content = """import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import {
  withErrorHandler,
  success,
  notFound,
  badRequest,
  validateRequired,
  validateEnum,
} from '@/lib/api-handler'
import { Prisma } from '@prisma/client'

/**
 * 报价单状态流转规则
 * draft -> pending_sales -> pending_finance -> pending_lab -> approved
 */
const STATUS_FLOW = {
  draft: 'pending_sales',
  pending_sales: 'pending_finance',
  pending_finance: 'pending_lab',
  pending_lab: 'approved',
} as const

/**
 * 状态对应的审批级别和角色
 */
const STATUS_APPROVAL_CONFIG = {
  pending_sales: { level: 1, role: 'sales_manager' },
  pending_finance: { level: 2, role: 'finance' },
  pending_lab: { level: 3, role: 'lab_director' },
} as const

interface RouteParams {
  params: Promise<{ id: string }>
}

// 获取单个报价（含明细和审批记录）
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: RouteParams
) => {
  const { id } = await params

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      items: true,
      approvals: {
        orderBy: { timestamp: 'desc' },
      },
      client: true,  // 添加客户关联查询
    },
  })

  if (!quotation) {
    notFound('报价单不存在')
  }

  // 格式化数据以匹配前端期望的字段名
  const formatted = {
    ...quotation,
    // 客户信息从关联对象获取
    clientName: quotation.client?.name || quotation.clientCompany,
    quotationDate: quotation.createdAt,
    validDays: 30,
    totalAmount: quotation.subtotal,
    taxRate: 0.06,
    taxAmount: quotation.taxTotal ? (Number(quotation.taxTotal) - Number(quotation.subtotal)) : 0,
    totalWithTax: quotation.taxTotal || quotation.subtotal,
    discountAmount: quotation.discountTotal ? (Number(quotation.taxTotal || quotation.subtotal) - Number(quotation.discountTotal)) : 0,
    finalAmount: quotation.discountTotal || quotation.taxTotal || quotation.subtotal,
    paymentTerms: quotation.clientRemark,
    clientResponse: quotation.clientStatus,
  }

  return success(formatted)
})

// 更新报价
export const PUT = withErrorHandler(async (
  request: NextRequest,
  { params }: RouteParams
) => {
  const { id } = await params
  const data = await request.json()

  // 检查报价是否存在
  const existing = await prisma.quotation.findUnique({ where: { id } })
  if (!existing) {
    notFound('报价单不存在')
  }

  // 只有草稿状态才能编辑
  if (existing.status !== 'draft') {
    badRequest('只有草稿状态的报价单可以编辑')
  }

  // 如果更新了明细项，需要重新计算金额
  if (data.items) {
    const subtotal = data.items.reduce((sum: number, item: { quantity?: number; unitPrice?: number }) => {
      return sum + (item.quantity || 1) * (item.unitPrice || 0)
    }, 0)
    const taxTotal = subtotal * 1.06
    const discountTotal = data.finalAmount || taxTotal

    data.subtotal = subtotal
    data.taxTotal = taxTotal
    data.discountTotal = discountTotal

    // 删除旧明细，创建新明细
    await prisma.quotationItem.deleteMany({
      where: { quotationId: id },
    })
  }

  // 映射前端字段名到数据库字段名
  const updateData: Record<string, unknown> = {}
  if (data.clientId !== undefined) updateData.clientId = data.clientId
  if (data.clientContactPerson !== undefined) updateData.clientContactPerson = data.clientContactPerson
  if (data.subtotal !== undefined) updateData.subtotal = data.subtotal
  if (data.taxTotal !== undefined) updateData.taxTotal = data.taxTotal
  if (data.discountTotal !== undefined) updateData.discountTotal = data.discountTotal
  if (data.paymentTerms !== undefined) updateData.clientRemark = data.paymentTerms
  if (data.clientResponse !== undefined) updateData.clientStatus = data.clientResponse
  // 注意：status 不能通过 PUT 直接修改，需要走审批流程

  const quotation = await prisma.quotation.update({
    where: { id },
    data: {
      ...updateData,
      items: data.items ? {
        create: data.items.map((item: { serviceItem: string; methodStandard: string; quantity?: number; unitPrice?: number }) => ({
          serviceItem: item.serviceItem,
          methodStandard: item.methodStandard,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          totalPrice: (item.quantity || 1) * (item.unitPrice || 0),
        })),
      } : undefined,
    },
    include: {
      items: true,
    },
  })

  return success(quotation)
})

// 删除报价
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  { params }: RouteParams
) => {
  const { id } = await params

  // 检查报价是否存在
  const existing = await prisma.quotation.findUnique({ where: { id } })
  if (!existing) {
    notFound('报价单不存在')
  }

  // 只有草稿状态才能删除
  if (existing.status !== 'draft') {
    badRequest('只有草稿状态的报价单可以删除')
  }

  await prisma.quotation.delete({
    where: { id },
  })

  return success({ success: true })
})

/**
 * 提交审批 / 审批操作
 *
 * 支持的操作：
 * 1. submit - 提交审批（draft -> pending_sales）
 * 2. approve - 审批通过（流转到下一状态）
 * 3. reject - 审批驳回（回到 rejected 状态）
 */
export const PATCH = withErrorHandler(async (
  request: NextRequest,
  { params }: RouteParams
) => {
  const { id } = await params
  const data = await request.json()

  // 验证必填字段
  validateRequired(data, ['action'])

  const action = validateEnum(
    data.action,
    ['submit', 'approve', 'reject'] as const,
    'action'
  )

  const { comment, approver } = data

  // 获取当前报价
  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: { approvals: true },
  })

  if (!quotation) {
    notFound('报价单不存在')
  }

  let newStatus = quotation.status
  let approvalLevel = 0
  let approvalRole = ''

  switch (action) {
    case 'submit':
      // 提交审批：draft -> pending_sales
      if (quotation.status !== 'draft') {
        badRequest('只有草稿状态的报价单可以提交审批')
      }
      newStatus = 'pending_sales'
      approvalLevel = 0
      approvalRole = 'submitter'
      break

    case 'approve':
      // 审批通过：根据当前状态流转到下一状态
      if (!['pending_sales', 'pending_finance', 'pending_lab'].includes(quotation.status)) {
        badRequest(`当前状态 ${quotation.status} 不能执行审批操作`)
      }

      const currentConfig = STATUS_APPROVAL_CONFIG[quotation.status as keyof typeof STATUS_APPROVAL_CONFIG]
      approvalLevel = currentConfig.level
      approvalRole = currentConfig.role
      newStatus = STATUS_FLOW[quotation.status as keyof typeof STATUS_FLOW]
      break

    case 'reject':
      // 审批驳回
      if (!['pending_sales', 'pending_finance', 'pending_lab'].includes(quotation.status)) {
        badRequest(`当前状态 ${quotation.status} 不能执行驳回操作`)
      }

      const rejectConfig = STATUS_APPROVAL_CONFIG[quotation.status as keyof typeof STATUS_APPROVAL_CONFIG]
      approvalLevel = rejectConfig.level
      approvalRole = rejectConfig.role
      newStatus = 'rejected'
      break
  }

  // 使用事务确保数据一致性
  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // 创建审批记录（submit 操作也记录）
    await tx.quotationApproval.create({
      data: {
        quotationId: id,
        level: approvalLevel,
        role: approvalRole,
        approver: approver || '当前用户',
        action: action,
        comment: comment || '',
      },
    })

    // 更新状态
    return tx.quotation.update({
      where: { id },
      data: { status: newStatus },
      include: {
        items: true,
        approvals: {
          orderBy: { timestamp: 'desc' },
        },
      },
    })
  })

  return success(updated)
})
"""

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'✓ Fixed: {file_path}')

# Run all fixes
if __name__ == '__main__':
    print('Fixing API route TypeScript type errors - Phase 4...\n')

    fix_outsource_order()
    fix_permission()
    fix_report_category()
    fix_quotation_id()

    print('\n✓ Phase 4 complete: Fixed 4 files')
