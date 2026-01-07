import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const userId = searchParams.get('userId')
  const examResult = searchParams.get('examResult')

  const where: any = {}
  if (userId) where.userId = userId
  if (examResult) where.examResult = examResult

  const [list, total] = await Promise.all([
    prisma.capabilityReview.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        capability: { select: { id: true, parameter: true, certificate: true } },
      },
      orderBy: { examDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.capabilityReview.count({ where }),
  ])

  return NextResponse.json({ list, total, page, pageSize })
}

export async function POST(request: NextRequest) {
  const data = await request.json()

  const review = await prisma.capabilityReview.create({
    data: {
      userId: data.userId,
      capabilityId: data.capabilityId,
      trainingContent: data.trainingContent,
      examDate: new Date(data.examDate),
      examResult: data.examResult,
    }
  })

  return NextResponse.json(review)
}
