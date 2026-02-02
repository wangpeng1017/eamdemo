# -*- coding: utf-8 -*-
content = """
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { withErrorHandler, success, ApiError, ErrorCodes } from '@/lib/api-handler'
import { randomBytes } from 'crypto'
import { logger } from '@/lib/logger'

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
  const startTime = Date.now()
  const { params } = context!
  const { id } = await params

  logger.info('开始生成外部链接', { data: { entrustmentId: id } })

  // 检查委托单是否存在（添加超时保护）
  let entrustment
  try {
    // 使用 Promise.race 添加超时保护
    const queryPromise = prisma.entrustment.findUnique({
      where: { id },
      select: {
        id: true,
        entrustmentNo: true,
        status: true,
        remark: true,
        clientId: true,
        // 不 include client，减少数据加载
      },
    })

    // 10秒超时
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database query timeout')), 10000)
    )

    entrustment = await Promise.race([queryPromise, timeoutPromise]) as typeof entrustment

    if (!entrustment) {
      logger.warn('委托单不存在', { data: { entrustmentId: id } })
      throw new ApiError(ErrorCodes.NOT_FOUND, '委托单不存在', 404)
    }

    logger.info('查询委托单成功', {
      data: {
        entrustmentId: id,
        duration: Date.now() - startTime
      }
    })
  } catch (error) {
    if (error instanceof ApiError) throw error

    logger.error('查询委托单失败', {
      error: error as Error,
      data: { entrustmentId: id }
    })

    // 检查是否是超时错误
    if (error instanceof Error && error.message === 'Database query timeout') {
      throw new ApiError(
        ErrorCodes.INTERNAL_ERROR,
        '数据库查询超时，请稍后重试',
        504
      )
    }

    // 其他数据库错误
    throw new ApiError(
      ErrorCodes.DATABASE_ERROR,
      '查询委托单失败，请稍后重试',
      500
    )
  }

  // 生成 32 字节随机 token
  const token = randomBytes(32).toString('hex')

  // 7 天后过期
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  // 解析现有 remark
  let remarkData: Record<string, unknown> = {}
  if (entrustment.remark) {
    try {
      remarkData = JSON.parse(entrustment.remark)
    } catch (error) {
      logger.warn('解析 remark 失败，使用空对象', {
        error: error as Error,
        data: { remark: entrustment.remark }
      })
      remarkData = {}
    }
  }

  // 更新 remark 字段并自动变更状态为"进行中"（添加超时保护）
  try {
    const updatePromise = prisma.entrustment.update({
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

    // 10秒超时
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database update timeout')), 10000)
    )

    await Promise.race([updatePromise, timeoutPromise])

    logger.info('更新外部链接成功', {
      data: {
        entrustmentId: id,
        token: token.substring(0, 8) + '...',
        duration: Date.now() - startTime
      }
    })
  } catch (error) {
    logger.error('更新外部链接失败', {
      error: error as Error,
      data: { entrustmentId: id }
    })

    // 检查是否是超时错误
    if (error instanceof Error && error.message === 'Database update timeout') {
      throw new ApiError(
        ErrorCodes.INTERNAL_ERROR,
        '数据库更新超时，请稍后重试',
        504
      )
    }

    throw new ApiError(
      ErrorCodes.DATABASE_ERROR,
      '更新外部链接失败，请稍后重试',
      500
    )
  }

  // 生成外部链接 - 使用实际服务器地址
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://8.130.182.148:3001'
  const link = `${baseUrl}/external/entrustment/${token}`

  const totalDuration = Date.now() - startTime
  logger.info('生成外部链接完成', {
    data: {
      entrustmentId: id,
      duration: totalDuration
    }
  })

  return success({
    token,
    link,
    expiresAt: expiresAt.toISOString(),
  })
})
"""

with open(r'/Users/wangpeng/Downloads/limsnext/src/app/api/entrustment/[id]/external-link/route.ts', 'w', encoding='utf-8') as f:
    f.write(content)
print('OK')
