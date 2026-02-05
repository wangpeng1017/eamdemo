import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withAuth, success, notFound } from '@/lib/api-handler'

export const GET = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const standard = await prisma.inspectionStandard.findUnique({
    where: { id }
  })

  if (!standard) {
    notFound('记录不存在')
  }

  return success(standard)
})

export const PUT = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  const data = await request.json()

  const standard = await prisma.inspectionStandard.update({
    where: { id },
    data,
  })

  return success(standard)
})

export const DELETE = withAuth(async (
  request: NextRequest,
  user,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  await prisma.inspectionStandard.delete({
    where: { id }
  })

  return success({ success: true })
})
