import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const list = await prisma.dept.findMany({
    orderBy: { sort: 'asc' },
    include: { _count: { select: { users: true } } }
  })
  return NextResponse.json({ list })
}

export async function POST(request: NextRequest) {
  const data = await request.json()
  const dept = await prisma.dept.create({ data })
  return NextResponse.json(dept)
}
