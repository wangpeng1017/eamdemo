import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success } from '@/lib/api-handler'

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const status = searchParams.get('status')
  const keyword = searchParams.get('keyword')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  const where: any = {}

  if (status) where.status = status
  if (keyword) {
    where.OR = [
      { contractNo: { contains: keyword } },
      { contractName: { contains: keyword } },
      { client: { name: { contains: keyword } } },
    ]
  }
  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) where.createdAt.gte = new Date(startDate)
    if (endDate) where.createdAt.lte = new Date(endDate)
  }

  const [list, total] = await Promise.all([
    prisma.contract.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { client: true, quotation: true },
    }),
    prisma.contract.count({ where }),
  ])

  return success({ list, total, page, pageSize })
})

export const POST = withErrorHandler(async (request: NextRequest) => {
  const data = await request.json()
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const count = await prisma.contract.count({
    where: { contractNo: { startsWith: `HT${today}` } }
  })
  const contractNo = `HT${today}${String(count + 1).padStart(4, '0')}`

  const contract = await prisma.contract.create({
    data: { ...data, contractNo }
  })

  // 回写报价单：更新 contractNo
  if (data.quotationId) {
    await prisma.quotation.update({
      where: { id: data.quotationId },
      data: { contractNo },
    })
  }

  return success(contract)
})
