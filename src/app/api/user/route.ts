import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')

  const [list, total] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, username: true, name: true, phone: true, email: true,
        status: true, createdAt: true, dept: true,
        roles: { include: { role: true } }
      }
    }),
    prisma.user.count(),
  ])

  return NextResponse.json({ list, total, page, pageSize })
}

export async function POST(request: NextRequest) {
  const data = await request.json()
  const hashedPassword = await bcrypt.hash(data.password || '123456', 10)

  const user = await prisma.user.create({
    data: {
      username: data.username,
      password: hashedPassword,
      name: data.name,
      phone: data.phone,
      email: data.email,
      status: data.status ?? 1,
    }
  })
  return NextResponse.json(user)
}
