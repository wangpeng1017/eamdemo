// @input: NextRequest, Prisma Client
// @output: JSON - 咨询列表/创建结果
// @pos: 委托咨询API，处理咨询记录的CRUD
// ⚠️ 更新我时，请同步更新本注释及所属文件夹的 _INDEX.md

import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// 获取咨询列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const status = searchParams.get('status')
  const follower = searchParams.get('follower')
  const keyword = searchParams.get('keyword')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  const where: any = {}

  if (status) {
    where.status = status
  }
  if (follower) {
    where.follower = follower
  }
  if (keyword) {
    where.OR = [
      { client: { name: { contains: keyword } } },  // 通过关联查询客户名称
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
        followUps: {
          orderBy: { date: 'desc' },
          take: 1,
        },
        client: true,  // 添加客户关联查询
      },
    }),
    prisma.consultation.count({ where }),
  ])

  // 解析 JSON 字符串字段为数组
  const parsedList = list.map(item => ({
    ...item,
    testItems: item.testItems ? JSON.parse(item.testItems) : [],
  }))

  return NextResponse.json({ list: parsedList, total, page, pageSize })
}

// 创建咨询
export async function POST(request: NextRequest) {
  const data = await request.json()

  // 生成咨询单号
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const count = await prisma.consultation.count({
    where: { consultationNo: { startsWith: `ZX${today}` } }
  })
  const consultationNo = `ZX${today}${String(count + 1).padStart(4, '0')}`

  // 转换 estimatedQuantity 为整数
  const createData: any = {
    ...data,
    consultationNo,
  }

  // 如果 testItems 是数组，转换为 JSON 字符串
  if (data.testItems && Array.isArray(data.testItems)) {
    createData.testItems = JSON.stringify(data.testItems)
  } else {
    createData.testItems = '[]'
  }

  if (data.estimatedQuantity !== undefined && data.estimatedQuantity !== null) {
    createData.estimatedQuantity = parseInt(data.estimatedQuantity, 10) || 0
  }

  const consultation = await prisma.consultation.create({
    data: createData
  })

  // 返回时解析为数组
  const parsed = {
    ...consultation,
    testItems: consultation.testItems ? JSON.parse(consultation.testItems) : [],
  }

  return NextResponse.json(parsed)
}
