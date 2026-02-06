import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth, success } from '@/lib/api-handler'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const template = await prisma.testTemplate.findUnique({
    where: { id }
  })

  if (!template) {
    return NextResponse.json({ success: false, error: { message: '记录不存在' } }, { status: 404 })
  }

  // 解析 JSON schema
  const parsed = {
    ...template,
    schema: JSON.parse(template.schema || '{}')
  }

  return NextResponse.json({ success: true, data: parsed })
}

export const PUT = withAuth(async (
  request: NextRequest,
  user,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params
  const data = await request.json()

  const template = await prisma.testTemplate.update({
    where: { id },
    data: {
      ...data,
      schema: typeof data.schema === 'string' ? data.schema : JSON.stringify(data.schema),
    }
  })

  return success(template)
})

export const DELETE = withAuth(async (
  request: NextRequest,
  user,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params
  await prisma.testTemplate.delete({
    where: { id }
  })

  return success({ deleted: true })
})

export const PATCH = withAuth(async (
  request: NextRequest,
  user,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params
  const { action } = await request.json()

  if (action === 'toggle-status') {
    const template = await prisma.testTemplate.findUnique({ where: { id } })
    if (!template) {
      return NextResponse.json({ success: false, error: { message: '检测项目不存在' } }, { status: 404 })
    }

    const newStatus = template.status === 'active' ? 'archived' : 'active'
    const updated = await prisma.testTemplate.update({
      where: { id },
      data: { status: newStatus }
    })

    return success(updated)
  }

  return NextResponse.json({ success: false, error: { message: '无效的操作' } }, { status: 400 })
})
