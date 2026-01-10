import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success } from '@/lib/api-handler'
import { randomBytes } from 'crypto'

/**
 * @file route.ts
 * @desc 生成委托单外部链接 API
 * @input POST /api/entrustment/[id]/external-link
 * @output { token, link, expiresAt }
 */

// 生成外部链接
export const POST = withErrorHandler(async (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => {
  const { params } = context!
  const { id } = await params

  // 检查委托单是否存在
  const entrustment = await prisma.entrustment.findUnique({
    where: { id },
    include: {
      client: true,
    },
  })

  if (!entrustment) {
    return Response.json({ success: false, message: '委托单不存在' }, { status: 404 })
  }

  // 生成 32 字节随机 token
  const token = randomBytes(32).toString('hex')

  // 7 天后过期
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  // 解析现有 remark
  let remarkData = {}
  if (entrustment.remark) {
    try {
      remarkData = JSON.parse(entrustment.remark)
    } catch {
      remarkData = {}
    }
  }

  // 更新 remark 字段并自动变更状态为"进行中"
  await prisma.entrustment.update({
    where: { id },
    data: {
      // 自动将状态从 pending 变为 in_progress（进行中）
      status: entrustment.status === 'pending' ? 'in_progress' : entrustment.status,
      remark: JSON.stringify({
        ...remarkData,
        externalLink: {
          token,
          expiresAt: expiresAt.toISOString(),
          createdAt: new Date().toISOString(),
        },
      }),
    },
  })

  // 生成外部链接 - 使用实际服务器地址
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://8.130.182.148:3001'
  const link = `${baseUrl}/external/entrustment/${token}`

  return success({
    token,
    link,
    expiresAt: expiresAt.toISOString(),
  })
})
