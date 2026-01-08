# -*- coding: utf-8 -*-
"""
Fix TypeScript type errors in API routes
"""

import os
import re

def fix_approval_flow():
    """Fix approval-flow/route.ts"""
    file_path = '/Users/wangpeng/Downloads/limsnext/src/app/api/approval-flow/route.ts'

    content = """import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, validateRequired } from '@/lib/api-handler'

// 获取审批流程列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const businessType = searchParams.get('businessType')
  const status = searchParams.get('status')

  const where: Record<string, unknown> = {}
  if (businessType) where.businessType = businessType
  if (status !== null && status !== '') where.status = status === 'true'

  const flows = await prisma.approvalFlow.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  return success({
    list: flows.map((flow) => ({
      ...flow,
      nodes: flow.nodes ? JSON.parse(flow.nodes as string) : [],
    })),
    total: flows.length,
  })
})

// 创建审批流程
export const POST = withErrorHandler(async (request: NextRequest) => {
  const data = await request.json()

  validateRequired(data, ['name', 'code', 'businessType'])

  const flow = await prisma.approvalFlow.create({
    data: {
      name: data.name,
      code: data.code,
      businessType: data.businessType,
      description: data.description || null,
      nodes: data.nodes ? JSON.stringify(data.nodes) : '[]',
      status: data.status ?? true,
    },
  })

  return success({
    ...flow,
    nodes: flow.nodes ? JSON.parse(flow.nodes as string) : [],
  })
})
"""

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'✓ Fixed: {file_path}')

def fix_consultation():
    """Fix consultation/route.ts"""
    file_path = '/Users/wangpeng/Downloads/limsnext/src/app/api/consultation/route.ts'

    content = """// @input: NextRequest, Prisma Client
// @output: JSON - 咨询列表/创建结果
// @pos: 委托咨询API，处理咨询记录的CRUD

import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success } from '@/lib/api-handler'

// 获取咨询列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const status = searchParams.get('status')
  const follower = searchParams.get('follower')
  const keyword = searchParams.get('keyword')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  const where: Record<string, unknown> = {}

  if (status) where.status = status
  if (follower) where.follower = follower
  if (keyword) {
    where.OR = [
      { client: { name: { contains: keyword } } },
      { clientContactPerson: { contains: keyword } },
      { consultationNo: { contains: keyword } },
    ]
  }
  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) (where.createdAt as Record<string, Date>).gte = new Date(startDate)
    if (endDate) (where.createdAt as Record<string, Date>).lte = new Date(endDate)
  }

  const [list, total] = await Promise.all([
    prisma.consultation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        followUps: { orderBy: { date: 'desc' }, take: 1 },
        client: true,
      },
    }),
    prisma.consultation.count({ where }),
  ])

  const parsedList = list.map((item) => ({
    ...item,
    testItems: item.testItems ? JSON.parse(item.testItems as string) : [],
  }))

  return success({ list: parsedList, total, page, pageSize })
})

// 创建咨询
export const POST = withErrorHandler(async (request: NextRequest) => {
  const data = await request.json()

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const count = await prisma.consultation.count({
    where: { consultationNo: { startsWith: `ZX${today}` } }
  })
  const consultationNo = `ZX${today}${String(count + 1).padStart(4, '0')}`

  const createData: Record<string, unknown> = { ...data, consultationNo }
  createData.testItems = Array.isArray(data.testItems) ? JSON.stringify(data.testItems) : '[]'
  if (data.estimatedQuantity != null) {
    createData.estimatedQuantity = parseInt(data.estimatedQuantity, 10) || 0
  }

  const consultation = await prisma.consultation.create({ data: createData })

  return success({
    ...consultation,
    testItems: consultation.testItems ? JSON.parse(consultation.testItems as string) : [],
  })
})
"""

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'✓ Fixed: {file_path}')

def fix_consumable_transaction():
    """Fix consumable-transaction/route.ts"""
    file_path = '/Users/wangpeng/Downloads/limsnext/src/app/api/consumable-transaction/route.ts'

    content = """import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, validateRequired, badRequest } from '@/lib/api-handler'
import { generateNo } from '@/lib/generate-no'
import { Prisma } from '@prisma/client'

// 获取出入库记录列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const type = searchParams.get('type')
  const consumableId = searchParams.get('consumableId')
  const keyword = searchParams.get('keyword')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  const where: Record<string, unknown> = {}
  if (type) where.type = type
  if (consumableId) where.consumableId = consumableId
  if (keyword) {
    where.OR = [
      { transactionNo: { contains: keyword } },
      { consumable: { name: { contains: keyword } } },
    ]
  }
  if (startDate || endDate) {
    where.transactionDate = {}
    if (startDate) (where.transactionDate as Record<string, Date>).gte = new Date(startDate)
    if (endDate) (where.transactionDate as Record<string, Date>).lte = new Date(endDate)
  }

  const [list, total] = await Promise.all([
    prisma.consumableTransaction.findMany({
      where,
      orderBy: { transactionDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        consumable: { select: { id: true, code: true, name: true, unit: true } },
      },
    }),
    prisma.consumableTransaction.count({ where }),
  ])

  // 统计入库和出库总额
  const inTotal = await prisma.consumableTransaction.aggregate({
    where: { type: 'in' },
    _sum: { totalAmount: true },
  })
  const outTotal = await prisma.consumableTransaction.aggregate({
    where: { type: 'out' },
    _sum: { totalAmount: true },
  })

  return success({
    list: list.map((item) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      totalAmount: Number(item.totalAmount),
    })),
    total,
    page,
    pageSize,
    stats: {
      inTotal: Number(inTotal._sum.totalAmount || 0),
      outTotal: Number(outTotal._sum.totalAmount || 0),
    },
  })
})

// 创建出入库记录
export const POST = withErrorHandler(async (request: NextRequest) => {
  const data = await request.json()

  validateRequired(data, ['type', 'consumableId', 'quantity', 'reason', 'operator'])

  // 获取易耗品信息
  const consumable = await prisma.consumable.findUnique({
    where: { id: data.consumableId },
  })

  if (!consumable) {
    badRequest('易耗品不存在')
  }

  const currentStock = Number(consumable!.stockQuantity)

  // 检查出库数量
  if (data.type === 'out' && data.quantity > currentStock) {
    badRequest(`库存不足，当前库存: ${currentStock}`)
  }

  // 生成单据编号
  const prefix = data.type === 'in' ? 'RK' : 'CK'
  const transactionNo = await generateNo(prefix, 4)

  // 使用默认单价（如果没有提供）
  const unitPrice = data.unitPrice || 0
  const totalAmount = data.quantity * unitPrice

  // 使用事务创建记录并更新库存
  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // 创建出入库记录
    const transaction = await tx.consumableTransaction.create({
      data: {
        transactionNo,
        type: data.type,
        consumableId: data.consumableId,
        quantity: data.quantity,
        unitPrice,
        totalAmount,
        reason: data.reason,
        relatedOrder: data.relatedOrder || null,
        operator: data.operator,
        transactionDate: data.transactionDate ? new Date(data.transactionDate) : new Date(),
        remark: data.remark || null,
      },
      include: { consumable: true },
    })

    // 更新库存
    const newStock = data.type === 'in'
      ? currentStock + data.quantity
      : currentStock - data.quantity

    // 计算新状态
    let status = 1 // 正常
    if (newStock === 0) {
      status = 0 // 缺货
    } else if (consumable!.minStock && newStock < Number(consumable!.minStock)) {
      status = 2 // 低库存
    }

    await tx.consumable.update({
      where: { id: data.consumableId },
      data: { stockQuantity: newStock, status },
    })

    return transaction
  })

  return success({
    ...result,
    unitPrice: Number(result.unitPrice),
    totalAmount: Number(result.totalAmount),
  })
})
"""

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'✓ Fixed: {file_path}')

def fix_consumable():
    """Fix consumable/route.ts"""
    file_path = '/Users/wangpeng/Downloads/limsnext/src/app/api/consumable/route.ts'

    content = """import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, validateRequired } from '@/lib/api-handler'

// 获取易耗品列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const categoryId = searchParams.get('categoryId')
  const status = searchParams.get('status')
  const keyword = searchParams.get('keyword')

  const where: Record<string, unknown> = {}
  if (categoryId) where.categoryId = categoryId
  if (status) where.status = parseInt(status)
  if (keyword) {
    where.OR = [
      { code: { contains: keyword } },
      { name: { contains: keyword } },
    ]
  }

  const [list, total] = await Promise.all([
    prisma.consumable.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        category: { select: { id: true, name: true } },
      },
    }),
    prisma.consumable.count({ where }),
  ])

  // 统计各状态数量
  const stats = await prisma.consumable.groupBy({
    by: ['status'],
    _count: true,
  })

  // 计算库存总量
  const totalStock = await prisma.consumable.aggregate({
    _sum: {
      stockQuantity: true,
    },
  })

  return success({
    list: list.map((item) => ({
      ...item,
      stockQuantity: Number(item.stockQuantity),
      minStock: item.minStock ? Number(item.minStock) : null,
    })),
    total,
    page,
    pageSize,
    totalStock: Number(totalStock._sum.stockQuantity || 0),
    stats: stats.reduce((acc, item) => {
      acc[item.status] = item._count
      return acc
    }, {} as Record<number, number>),
  })
})

// 创建易耗品
export const POST = withErrorHandler(async (request: NextRequest) => {
  const data = await request.json()

  validateRequired(data, ['code', 'name', 'unit'])

  // 计算状态: 1=正常, 0=禁用
  const status = data.status !== undefined ? parseInt(data.status) : 1

  const consumable = await prisma.consumable.create({
    data: {
      code: data.code,
      name: data.name,
      categoryId: data.categoryId || null,
      specification: data.specification || null,
      unit: data.unit,
      stockQuantity: data.stockQuantity || 0,
      minStock: data.minStock || null,
      location: data.location || null,
      status,
      remark: data.remark || null,
    },
    include: { category: true },
  })

  return success({
    ...consumable,
    stockQuantity: Number(consumable.stockQuantity),
    minStock: consumable.minStock ? Number(consumable.minStock) : null,
  })
})
"""

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'✓ Fixed: {file_path}')

def fix_device_calibration_plan():
    """Fix device/calibration-plan/route.ts"""
    file_path = '/Users/wangpeng/Downloads/limsnext/src/app/api/device/calibration-plan/route.ts'

    content = """import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success } from '@/lib/api-handler'

// 获取定检计划列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const status = searchParams.get('status')

  const where: Record<string, unknown> = {}
  if (status) where.status = status

  const [list, total] = await Promise.all([
    prisma.deviceCalibration.findMany({
      where,
      include: {
        device: {
          select: { id: true, name: true, deviceNo: true },
        },
      },
      orderBy: { nextDate: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.deviceCalibration.count({ where }),
  ])

  // 格式化数据
  const formattedList = list.map((item) => ({
    id: item.id,
    deviceId: item.deviceId,
    deviceName: item.device?.name,
    deviceNo: item.device?.deviceNo,
    lastDate: item.lastDate,
    nextDate: item.nextDate,
    interval: item.interval,
    status: item.status,
    result: item.result,
  }))

  return success({ list: formattedList, total, page, pageSize })
})

// 创建定检计划
export const POST = withErrorHandler(async (request: NextRequest) => {
  const data = await request.json()

  const calibration = await prisma.deviceCalibration.create({
    data: {
      deviceId: data.deviceId,
      lastDate: data.lastDate ? new Date(data.lastDate) : null,
      nextDate: data.nextDate ? new Date(data.nextDate) : null,
      interval: data.interval || null,
      status: data.status || 'pending',
      result: data.result || null,
    },
  })

  return success(calibration)
})
"""

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'✓ Fixed: {file_path}')

def fix_device_maintenance_plan():
    """Fix device/maintenance-plan/route.ts"""
    file_path = '/Users/wangpeng/Downloads/limsnext/src/app/api/device/maintenance-plan/route.ts'

    content = """import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success } from '@/lib/api-handler'

// 获取保养计划列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const status = searchParams.get('status')
  const planType = searchParams.get('planType')

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (planType) where.planType = planType

  const [list, total] = await Promise.all([
    prisma.deviceMaintenance.findMany({
      where,
      include: {
        device: {
          select: { id: true, name: true, deviceNo: true },
        },
      },
      orderBy: { nextMaintenanceDate: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.deviceMaintenance.count({ where }),
  ])

  // 格式化数据
  const formattedList = list.map((item) => ({
    id: item.id,
    deviceId: item.deviceId,
    deviceName: item.device?.name,
    deviceNo: item.device?.deviceNo,
    planName: item.planName,
    planType: item.planType,
    interval: item.interval,
    nextMaintenanceDate: item.nextMaintenanceDate,
    lastMaintenanceDate: item.lastMaintenanceDate,
    responsiblePerson: item.responsiblePerson,
    maintenanceItems: item.maintenanceItems,
    status: item.status,
    createdAt: item.createdAt,
  }))

  return success({ list: formattedList, total, page, pageSize })
})

// 创建保养计划
export const POST = withErrorHandler(async (request: NextRequest) => {
  const data = await request.json()

  const plan = await prisma.deviceMaintenance.create({
    data: {
      deviceId: data.deviceId,
      planName: data.planName,
      planType: data.planType,
      interval: data.interval,
      nextMaintenanceDate: data.nextMaintenanceDate ? new Date(data.nextMaintenanceDate) : null,
      lastMaintenanceDate: data.lastMaintenanceDate ? new Date(data.lastMaintenanceDate) : null,
      responsiblePerson: data.responsiblePerson,
      maintenanceItems: data.maintenanceItems,
      status: data.status || 'active',
    },
  })

  return success(plan)
})
"""

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'✓ Fixed: {file_path}')

def fix_device_repair():
    """Fix device/repair/route.ts"""
    file_path = '/Users/wangpeng/Downloads/limsnext/src/app/api/device/repair/route.ts'

    content = """import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import {
  withErrorHandler,
  success,
  validateRequired,
} from '@/lib/api-handler'
import { generateNo, NumberPrefixes } from '@/lib/generate-no'

// 获取设备维修记录列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const deviceId = searchParams.get('deviceId')
  const status = searchParams.get('status')
  const keyword = searchParams.get('keyword')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  const where: Record<string, unknown> = {}

  if (deviceId) {
    where.deviceId = deviceId
  }

  if (status) {
    where.status = status
  }

  if (keyword) {
    where.OR = [
      { repairNo: { contains: keyword } },
      { faultDesc: { contains: keyword } },
      { repairBy: { contains: keyword } },
    ]
  }

  if (startDate || endDate) {
    where.faultDate = {}
    if (startDate) (where.faultDate as Record<string, Date>).gte = new Date(startDate)
    if (endDate) (where.faultDate as Record<string, Date>).lte = new Date(endDate)
  }

  const [list, total] = await Promise.all([
    prisma.deviceRepair.findMany({
      where,
      orderBy: { faultDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        device: {
          select: {
            id: true,
            deviceNo: true,
            name: true,
            model: true,
            location: true,
            status: true,
          },
        },
      },
    }),
    prisma.deviceRepair.count({ where }),
  ])

  // 统计各状态数量
  const stats = await prisma.deviceRepair.groupBy({
    by: ['status'],
    _count: true,
  })

  // 统计总维修费用
  const totalCost = await prisma.deviceRepair.aggregate({
    where,
    _sum: { repairCost: true },
  })

  return success({
    list,
    total,
    page,
    pageSize,
    stats: stats.reduce((acc, cur) => {
      acc[cur.status] = cur._count
      return acc
    }, {} as Record<string, number>),
    totalCost: totalCost._sum.repairCost || 0,
  })
})

// 创建设备维修记录
export const POST = withErrorHandler(async (request: NextRequest) => {
  const data = await request.json()

  validateRequired(data, ['deviceId', 'faultDesc'])

  // 检查设备是否存在
  const device = await prisma.device.findUnique({
    where: { id: data.deviceId },
  })

  if (!device) {
    throw new Error('设备不存在')
  }

  // 生成维修单号
  const repairNo = await generateNo(NumberPrefixes.REPAIR)

  const repair = await prisma.deviceRepair.create({
    data: {
      deviceId: data.deviceId,
      repairNo,
      faultDate: data.faultDate ? new Date(data.faultDate) : new Date(),
      faultDesc: data.faultDesc,
      repairType: data.repairType,
      repairCost: data.repairCost ? parseFloat(data.repairCost) : null,
      repairBy: data.repairBy,
      status: 'pending',
      remark: data.remark,
    },
    include: {
      device: true,
    },
  })

  // 更新设备状态为维护中
  await prisma.device.update({
    where: { id: data.deviceId },
    data: { status: 'Maintenance' },
  })

  return success(repair)
})
"""

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'✓ Fixed: {file_path}')

# Run all fixes
if __name__ == '__main__':
    print('Fixing API route TypeScript type errors...\n')

    fix_approval_flow()
    fix_consultation()
    fix_consumable_transaction()
    fix_consumable()
    fix_device_calibration_plan()
    fix_device_maintenance_plan()
    fix_device_repair()

    print('\n✓ Phase 1 complete: Fixed 7 files')
    print('Run this script again to continue with remaining files.')
