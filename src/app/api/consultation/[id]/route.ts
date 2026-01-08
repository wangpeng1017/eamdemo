import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, notFound } from '@/lib/api-handler'

export const GET = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const consultation = await prisma.consultation.findUnique({
    where: { id },
    include: { followUps: { orderBy: { date: 'desc' } }, client: true },
  })

  if (!consultation) notFound('咨询单不存在')

  return success({
    ...consultation,
    testItems: consultation.testItems ? JSON.parse(consultation.testItems) : [],
  })
})

export const PUT = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const data = await request.json()

  const updateData: any = { ...data }
  if (Array.isArray(data.testItems)) {
    updateData.testItems = JSON.stringify(data.testItems)
  }

  const consultation = await prisma.consultation.update({ where: { id }, data: updateData })

  return success({
    ...consultation,
    testItems: consultation.testItems ? JSON.parse(consultation.testItems) : [],
  })
})

export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  await prisma.consultation.delete({ where: { id } })
  return success({ success: true })
})
