import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, validateRequired } from '@/lib/api-handler'

// 获取审批流程列表
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const businessType = searchParams.get('businessType')
  const status = searchParams.get('status')

  const where: Record<string, unknown> = {}
  if (businessType) where.businessType = businessType
  if (status !== null && status !== '') where.status = status === 'true'

  const flows = await prisma.approvalFlow.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  return success({
    list: flows.map((flow: any) => ({
      ...flow,
      nodes: flow.nodes ? JSON.parse(flow.nodes as string) : [],
    })),
    total: flows.length,
  })
})

// 创建审批流程
export const POST = withErrorHandler(async (request: NextRequest) => {
  const data = await request.json()

  validateRequired(data, ['name', 'code', 'businessType'])

  const flow = await prisma.approvalFlow.create({
    data: {
      name: data.name,
      code: data.code,
      businessType: data.businessType,
      description: data.description || null,
      nodes: data.nodes ? JSON.stringify(data.nodes) : '[]',
      status: data.status ?? true,
    },
  })

  return success({
    ...flow,
    nodes: flow.nodes ? JSON.parse(flow.nodes as string) : [],
  })
})
