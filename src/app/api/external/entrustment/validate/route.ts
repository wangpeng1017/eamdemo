import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, badRequest } from '@/lib/api-handler'
import { checkRateLimit, getClientIP } from '@/lib/rate-limit'

/**
 * @file route.ts
 * @desc 验证外部链接 token 并获取委托单信息
 * @input GET /api/external/entrustment/validate?token=xxx
 * @output { entrustmentNo, clientName, isValid, expiresAt }
 */

export const GET = withErrorHandler(async (request: NextRequest) => {
  // 速率限制：每个 IP 每分钟最多 20 次请求
  const clientIP = getClientIP(request)
  const rateLimit = checkRateLimit(`external:validate:${clientIP}`, 20, 60000)

  if (!rateLimit.allowed) {
    return Response.json(
      { success: false, message: '请求过于频繁，请稍后再试' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(rateLimit.resetTime),
        }
      }
    )
  }

  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    badRequest('缺少 token')
  }

  // 验证 token 格式（64位十六进制）
  if (!/^[a-f0-9]{64}$/i.test(token!)) {
    badRequest('无效的 token 格式')
  }

  // 查询包含此 token 的委托单
  // 注意：remark 是 @db.Text 类型，使用 raw query 避免 Prisma contains 兼容性问题
  let entrustments: any[] = []
  try {
    entrustments = await prisma.$queryRawUnsafe(
      `SELECT id, entrustmentNo, sampleName, sampleModel, sampleMaterial, sampleQuantity, remark, clientId
       FROM biz_entrustment
       WHERE remark LIKE CONCAT('%', ?, '%')
       LIMIT 10`,
      token!
    )
  } catch (dbErr) {
    console.error('查询外部链接 token 失败:', dbErr)
    return Response.json({ success: false, message: '查询失败' }, { status: 500 })
  }

  // 精确匹配 token
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

  // 获取客户名称
  let clientName = null
  if (matched.clientId) {
    const client = await prisma.client.findUnique({
      where: { id: matched.clientId },
      select: { name: true },
    })
    clientName = client?.name || null
  }

  // 返回委托单基本信息
  return success({
    id: matched.id,
    entrustmentNo: matched.entrustmentNo,
    clientName,
    sampleName: matched.sampleName || null,
    sampleModel: matched.sampleModel || null,
    sampleMaterial: matched.sampleMaterial || null,
    sampleQuantity: matched.sampleQuantity || null,
    expiresAt,
  })
})
