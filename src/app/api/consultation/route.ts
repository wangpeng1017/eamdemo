// @input: NextRequest, Prisma Client
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

  const where: any = {}

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
    if (startDate) where.createdAt.gte = new Date(startDate)
    if (endDate) where.createdAt.lte = new Date(endDate)
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

  const parsedList = list.map(item => ({
    ...item,
    testItems: item.testItems ? JSON.parse(item.testItems) : [],
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

  const createData: any = { ...data, consultationNo }
  createData.testItems = Array.isArray(data.testItems) ? JSON.stringify(data.testItems) : '[]'
  if (data.estimatedQuantity != null) {
    createData.estimatedQuantity = parseInt(data.estimatedQuantity, 10) || 0
  }

  const consultation = await prisma.consultation.create({ data: createData })

  return success({
    ...consultation,
    testItems: consultation.testItems ? JSON.parse(consultation.testItems) : [],
  })
})
