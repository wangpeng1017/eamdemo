import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ApprovalEngine } from '@/lib/approval/engine'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '10')
  const status = searchParams.get('status')

  const where: any = {}
  if (status) where.status = status

  const [list, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.client.count({ where }),
  ])

  return NextResponse.json({ list, total, page, pageSize })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  const data = await request.json()

  // 新增委托单位时,状态默认为pending,需要通过审批
  const client = await prisma.client.create({
    data: {
      ...data,
      status: 'pending', // 默认待审批状态
    }
  })

  // 自动创建二级审批实例
  if (session?.user?.id) {
    try {
      const engine = new ApprovalEngine()
      await engine.submit({
        bizType: 'client',
        bizId: client.id,
        flowCode: 'client_approval', // 委托单位审批流程编码
        submitterId: session.user.id,
        submitterName: session.user.name || '提交人',
      })
    } catch (error) {
      console.error('创建审批实例失败:', error)
      // 审批创建失败不影响委托单位创建
    }
  }

  return NextResponse.json(client)
}

