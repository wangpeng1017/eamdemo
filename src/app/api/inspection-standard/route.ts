import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success } from '@/lib/api-handler'

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const validity = searchParams.get('validity')

  const where: Record<string, unknown> = {}
  if (validity) where.validity = validity

  const [list, total] = await Promise.all([
    prisma.inspectionStandard.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.inspectionStandard.count({ where }),
  ])

  // 解析 JSON 字段
  const parsedList = list.map((item: any) => ({
    ...item,
    devices: item.devices ? JSON.parse(item.devices as string) : [],
    parameters: item.parameters ? JSON.parse(item.parameters as string) : [],
    personnel: item.personnel ? JSON.parse(item.personnel as string) : [],
  }))

  return success({ list: parsedList, total, page, pageSize })
})

export const POST = withErrorHandler(async (request: NextRequest) => {
  const data = await request.json()

  const standard = await prisma.inspectionStandard.create({
    data: {
      ...data,
      devices: data.devices ? JSON.stringify(data.devices) : null,
      parameters: data.parameters ? JSON.stringify(data.parameters) : null,
      personnel: data.personnel ? JSON.stringify(data.personnel) : null,
    }
  })

  return success(standard)
})
