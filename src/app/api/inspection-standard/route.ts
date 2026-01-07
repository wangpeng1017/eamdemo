import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const validity = searchParams.get('validity')

  const where: any = {}
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
  const parsedList = list.map(item => ({
    ...item,
    devices: item.devices ? JSON.parse(item.devices) : [],
    parameters: item.parameters ? JSON.parse(item.parameters) : [],
    personnel: item.personnel ? JSON.parse(item.personnel) : [],
  }))

  return NextResponse.json({ list: parsedList, total, page, pageSize })
}

export async function POST(request: NextRequest) {
  const data = await request.json()

  const standard = await prisma.inspectionStandard.create({
    data: {
      ...data,
      devices: data.devices ? JSON.stringify(data.devices) : null,
      parameters: data.parameters ? JSON.stringify(data.parameters) : null,
      personnel: data.personnel ? JSON.stringify(data.personnel) : null,
    }
  })

  return NextResponse.json(standard)
}
