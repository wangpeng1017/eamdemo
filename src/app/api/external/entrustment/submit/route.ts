import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, validateRequired, badRequest } from '@/lib/api-handler'
import { checkRateLimit, getClientIP } from '@/lib/rate-limit'

/**
 * @file route.ts
 * @desc 提交外部委托单信息（客户填写）
 * @input POST /api/external/entrustment/submit
 * @body { token, sampleName, sampleModel, sampleMaterial, sampleQuantity, specialRequirements, otherRequirements }
 */

export const POST = withErrorHandler(async (request: NextRequest) => {
  // 速率限制：每个 IP 每分钟最多 10 次提交
  const clientIP = getClientIP(request)
  const rateLimit = checkRateLimit(`external:submit:${clientIP}`, 10, 60000)

  if (!rateLimit.allowed) {
    return Response.json(
      { success: false, message: '提交过于频繁，请稍后再试' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(rateLimit.resetTime),
        }
      }
    )
  }

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

  // 验证 token 格式（64位十六进制）
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    badRequest('无效的 token 格式')
  }

  // 优化查询：使用 contains 预筛选
  const entrustments = await prisma.entrustment.findMany({
    where: {
      remark: {
        contains: token,
      },
    },
    select: {
      id: true,
      entrustmentNo: true,
      remark: true,
    },
    take: 10,
  })

  // 精确匹配 token
  const matched = entrustments.find((e) => {
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
  let remarkData: Record<string, unknown> = {}
  try {
    remarkData = JSON.parse(matched.remark as string || '{}')
  } catch {
    remarkData = {}
  }

  const externalLink = remarkData.externalLink as { expiresAt?: string } | undefined
  const expiresAt = externalLink?.expiresAt
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
  const existingExternalData = (remarkData.externalData as Record<string, unknown>) || {}
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
