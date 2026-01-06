import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// 获取报告模板列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const category = searchParams.get('category')

  const where: any = {}
  if (category) where.category = category

  const [list, total] = await Promise.all([
    prisma.reportTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.reportTemplate.count({ where }),
  ])

  return NextResponse.json({ list, total, page, pageSize })
}

// 创建报告模板
export async function POST(request: NextRequest) {
  const data = await request.json()

  const template = await prisma.reportTemplate.create({
    data: {
      name: data.name,
      code: data.code,
      category: data.category,
      fileUrl: data.fileUrl || '/templates/default.docx',
      status: data.status || 'active',
      uploader: data.uploader || '系统',
      remark: data.remark,
    }
  })

  return NextResponse.json(template)
}
