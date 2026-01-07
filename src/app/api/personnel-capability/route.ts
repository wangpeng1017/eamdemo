import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const userId = searchParams.get('userId')
  const standardId = searchParams.get('standardId')

  const where: any = {}
  if (userId) where.userId = userId
  if (standardId) where.standardId = standardId

  const [list, total] = await Promise.all([
    prisma.personnelCapability.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        standard: { select: { id: true, standardNo: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.personnelCapability.count({ where }),
  ])

  return NextResponse.json({ list, total, page, pageSize })
}

export async function POST(request: NextRequest) {
  const data = await request.json()

  const capability = await prisma.personnelCapability.create({
    data: {
      userId: data.userId,
      standardId: data.standardId,
      parameter: data.parameter,
      certificate: data.certificate,
      expiryDate: new Date(data.expiryDate),
    }
  })

  return NextResponse.json(capability)
}
