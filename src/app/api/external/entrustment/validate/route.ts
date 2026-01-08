import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success } from '@/lib/api-handler'

/**
 * @file route.ts
 * @desc 验证外部链接 token 并获取委托单信息
 * @input GET /api/external/entrustment/validate?token=xxx
 * @output { entrustmentNo, clientName, isValid, expiresAt }
 */

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

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
  const matched = entrustments.find((e) => {
    if (!e.remark) return false
    try {
      const data = JSON.parse(e.remark)
      return data.externalLink?.token === token
    } catch {
      return false
    }
  })

  if (!matched) {
    return Response.json({ success: false, message: '链接无效或已过期' }, { status: 404 })
  }

  // 检查是否过期
  let remarkData = {}
  try {
    remarkData = JSON.parse(matched.remark || '{}')
  } catch {
    remarkData = {}
  }

  const expiresAt = remarkData.externalLink?.expiresAt
  if (expiresAt && new Date(expiresAt) < new Date()) {
    return Response.json({ success: false, message: '链接已过期' }, { status: 410 })
  }

  // 返回委托单基本信息
  return success({
    id: matched.id,
    entrustmentNo: matched.entrustmentNo,
    clientName: matched.client?.name || null,
    sampleName: matched.sampleName || null,
    sampleModel: matched.sampleModel || null,
    sampleMaterial: matched.sampleMaterial || null,
    sampleQuantity: matched.sampleQuantity || null,
    expiresAt,
  })
})
