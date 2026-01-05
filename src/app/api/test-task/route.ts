import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')

  const [list, total] = await Promise.all([
    prisma.testTask.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { sample: true, device: true }
    }),
    prisma.testTask.count(),
  ])

  return NextResponse.json({ list, total, page, pageSize })
}

export async function POST(request: NextRequest) {
  const data = await request.json()
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const count = await prisma.testTask.count({
    where: { taskNo: { startsWith: `JC${today}` } }
  })
  const taskNo = `JC${today}${String(count + 1).padStart(4, '0')}`

  const task = await prisma.testTask.create({
    data: { ...data, taskNo }
  })
  return NextResponse.json(task)
}
