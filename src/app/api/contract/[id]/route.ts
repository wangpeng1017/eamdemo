import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, notFound } from '@/lib/api-handler'

export const GET = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const contract = await prisma.contract.findUnique({
    where: { id },
    include: { client: true, quotation: true },
  })
  if (!contract) notFound('合同不存在')
  return success(contract)
})

export const PUT = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const data = await request.json()
  const contract = await prisma.contract.update({ where: { id }, data })
  return success(contract)
})

export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  await prisma.contract.delete({ where: { id } })
  return success({ success: true })
})
