/**
 * @file 健康检查 API
 * @desc 提供应用健康状态监控端点，用于 PM2、负载均衡器、监控系统调用
 * @route GET /api/health
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'  // 禁用缓存，确保每次都是实时检查

interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  uptime: number
  checks: {
    database: 'ok' | 'error'
    memory: {
      used: number
      total: number
      percentage: number
      status: 'ok' | 'warning' | 'critical'
    }
  }
  error?: string
}

export async function GET() {
  const startTime = Date.now()

  try {
    // 1. 检查数据库连接
    let dbStatus: 'ok' | 'error' = 'ok'
    try {
      await prisma.$queryRaw`SELECT 1 AS health_check`
    } catch (error) {
      console.error('[Health Check] Database connection failed:', error)
      dbStatus = 'error'
    }

    // 2. 检查内存使用情况
    const memUsage = process.memoryUsage()
    const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024)
    const memTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024)
    const memPercentage = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)

    let memStatus: 'ok' | 'warning' | 'critical' = 'ok'
    if (memPercentage > 90) {
      memStatus = 'critical'
    } else if (memPercentage > 75) {
      memStatus = 'warning'
    }

    // 3. 判断整体健康状态
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy'
    if (dbStatus === 'error' || memStatus === 'critical') {
      overallStatus = 'unhealthy'
    } else if (memStatus === 'warning') {
      overallStatus = 'degraded'
    }

    // 4. 构建响应
    const response: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: dbStatus,
        memory: {
          used: memUsedMB,
          total: memTotalMB,
          percentage: memPercentage,
          status: memStatus
        }
      }
    }

    const responseTime = Date.now() - startTime

    // 5. 根据状态返回不同 HTTP 状态码
    if (overallStatus === 'unhealthy') {
      return NextResponse.json(
        { ...response, error: 'Service unhealthy' },
        { status: 503 }  // Service Unavailable
      )
    }

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'X-Response-Time': `${responseTime}ms`,
        'Cache-Control': 'no-store, must-revalidate'
      }
    })

  } catch (error) {
    console.error('[Health Check] Unexpected error:', error)

    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      error: error instanceof Error ? error.message : 'Unknown error',
      checks: {
        database: 'error',
        memory: {
          used: 0,
          total: 0,
          percentage: 0,
          status: 'critical'
        }
      }
    } as HealthCheckResponse, { status: 503 })
  }
}
