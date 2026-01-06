import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import {
  withErrorHandler,
  success,
  validateRequired,
} from '@/lib/api-handler'
import { generateNo } from '@/lib/generate-no'

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
            code: true,
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
  const repairNo = await generateNo('WX', 'device_repair')

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
