import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-handler'


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const report = await prisma.testReport.findUnique({ where: { id }, include: { task: true } })
  return NextResponse.json(report)
}

export const PUT = withAuth(async (
  request: NextRequest,
  user
) => {
  // 从URL中获取id
  const url = new URL(request.url)
  const pathParts = url.pathname.split('/')
  const id = pathParts[pathParts.length - 1]

  const data = await request.json()

  // 准备更新数据
  const updateData: any = {
    ...data,
    // 记录最后编辑信息
    lastEditedAt: new Date(),
    lastEditedBy: user.name || '未知用户',
  }

  // 如果传入了richContent，更新富文本内容字段
  if ('richContent' in data) {
    updateData.richContent = data.richContent
  }

  const report = await prisma.testReport.update({
    where: { id },
    data: updateData,
    include: { task: true }
  })

  return NextResponse.json({ success: true, data: report })
})

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.testReport.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

// 编辑保存（已移除审批流程）
export const PATCH = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { params } = context!
  const { id } = await params
  const data = await request.json()

  // 过滤掉旧的审批相关字段
  const { action: _, comment: _c, approver: _a, submitterName: _s, ...editData } = data

  await prisma.testReport.update({
    where: { id },
    data: {
      ...editData,
      lastEditedAt: new Date(),
      lastEditedBy: user.name || '未知用户',
    }
  })

  const updated = await prisma.testReport.findUnique({
    where: { id },
    include: { task: true }
  })
  return NextResponse.json({ success: true, data: updated })
})
