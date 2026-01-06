import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// 获取单个客户
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = await prisma.client.findUnique({
    where: { id: params.id }
  })

  if (!client) {
    return NextResponse.json({ error: '客户不存在' }, { status: 404 })
  }

  return NextResponse.json(client)
}

// 更新客户
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const data = await request.json()

  const client = await prisma.client.update({
    where: { id: params.id },
    data
  })

  return NextResponse.json(client)
}

// 删除客户
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.client.delete({
    where: { id: params.id }
  })

  return NextResponse.json({ success: true })
}
