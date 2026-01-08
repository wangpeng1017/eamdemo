import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, validateRequired } from '@/lib/api-handler'

/**
 * @file route.ts
 * @desc 提交外部委托单信息（客户填写）
 * @input POST /api/external/entrustment/submit
 * @body { token, sampleName, sampleModel, sampleMaterial, sampleQuantity, specialRequirements, otherRequirements }
 */

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json()
  const {
    token,
    sampleName,
    sampleModel,
    sampleMaterial,
    sampleQuantity,
    specialRequirements,
    otherRequirements,
  } = body

  // 验证必填字段
  validateRequired(body, ['token'])

  if (!token) {
    return Response.json({ success: false, message: '缺少 token' }, { status: 400 })
  }

  // 查找包含该 token 的委托单
  const entrustments = await prisma.entrustment.findMany({
    where: {
      remark: {
        not: null,
      },
    },
  })

  // 找到匹配的委托单
  const matched = entrustments.find((e: any) => {
    if (!e.remark) return false
    try {
      const data = JSON.parse(e.remark as string)
      return data.externalLink?.token === token
    } catch {
      return false
    }
  })

  if (!matched) {
    return Response.json({ success: false, message: '链接无效或已过期' }, { status: 404 })
  }

  // 检查是否过期
  let remarkData: Record<string, any> = {}
  try {
    remarkData = JSON.parse(matched.remark as string || '{}')
  } catch {
    remarkData = {}
  }

  const expiresAt = remarkData.externalLink?.expiresAt
  if (expiresAt && new Date(expiresAt) < new Date()) {
    return Response.json({ success: false, message: '链接已过期' }, { status: 410 })
  }

  // 准备更新数据
  const updateData: Record<string, unknown> = {}

  if (sampleName) updateData.sampleName = sampleName
  if (sampleModel) updateData.sampleModel = sampleModel
  if (sampleMaterial) updateData.sampleMaterial = sampleMaterial
  if (sampleQuantity !== undefined) updateData.sampleQuantity = sampleQuantity

  // 更新 remark 字段，保存外部提交的数据
  const existingExternalData = remarkData.externalData || {}
  const newExternalData = {
    ...existingExternalData,
    submittedAt: new Date().toISOString(),
    sampleName,
    sampleModel,
    sampleMaterial,
    sampleQuantity,
    specialRequirements,
    otherRequirements,
  }

  updateData.remark = JSON.stringify({
    ...remarkData,
    externalData: newExternalData,
  })

  // 更新委托单
  await prisma.entrustment.update({
    where: { id: matched.id },
    data: updateData,
  })

  return success({
    message: '提交成功',
    entrustmentNo: matched.entrustmentNo,
  })
})
