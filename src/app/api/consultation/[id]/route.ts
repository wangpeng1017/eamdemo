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
    include: { followUps: { orderBy: { date: 'desc' } }, client: true, consultationSamples: true },
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

  // 处理样品更新：先删除旧的，再创建新的
  if (Array.isArray(data.samples)) {
    updateData.consultationSamples = {
      deleteMany: {},
      create: data.samples.map((sample: any) => ({
        name: sample.name,
        model: sample.model,
        material: sample.material,
        quantity: parseInt(sample.quantity, 10) || 1,
        remark: sample.remark,
      })),
    }
    delete updateData.samples
  }

  const consultation = await prisma.consultation.update({ where: { id }, data: updateData })

  return success({
    ...consultation,
    testItems: consultation.testItems ? JSON.parse(consultation.testItems) : [],
  })
})

// 删除咨询记录
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { id } = await context!.params
  console.log(`[API] DELETE /api/consultation/${id} requested`)

  try {
    const existing = await prisma.consultation.findUnique({ where: { id } })
    if (!existing) {
      console.warn(`[API] Consultation not found: ${id}`)
      // notFound throws error, handled by wrapper
      notFound('咨询记录不存在')
    }

    await prisma.consultation.delete({ where: { id } })
    console.log(`[API] DELETE /api/consultation/${id} success`)
    return success({ success: true })
  } catch (error) {
    console.error(`[API] DELETE /api/consultation/${id} failed:`, error)
    throw error // Re-throw to be handled by withErrorHandler
  }
})
