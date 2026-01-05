import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, username: true, name: true, phone: true, email: true,
      status: true, createdAt: true,
      roles: { include: { role: true } }
    }
  })
  return NextResponse.json(user)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const data = await request.json()

  const updateData: Record<string, unknown> = {
    name: data.name,
    phone: data.phone,
    email: data.email,
    status: data.status,
  }

  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 10)
  }

  const user = await prisma.user.update({ where: { id }, data: updateData })
  return NextResponse.json(user)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
