/**
 * @file auditLogger.ts
 * @desc 操作日志记录工具
 */

import { prisma } from './prisma'

/**
 * 操作类型
 */
export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  VIEW = 'view',
  EXPORT = 'export',
  APPROVE = 'approve',
  REJECT = 'reject',
  SUBMIT = 'submit',
  ASSIGN = 'assign',
  LOGIN = 'login',
  LOGOUT = 'logout',
}

/**
 * 操作模块
 */
export enum AuditModule {
  USER = 'user',
  ROLE = 'role',
  CLIENT = 'client',
  CONTRACT = 'contract',
  QUOTATION = 'quotation',
  CONSULTATION = 'consultation',
  ENTRUSTMENT = 'entrustment',
  SAMPLE = 'sample',
  TASK = 'task',
  REPORT = 'report',
  DEVICE = 'device',
  APPROVAL = 'approval',
  SYSTEM = 'system',
}

/**
 * 操作日志接口
 */
export interface AuditLogData {
  userId: string
  userName: string
  action: AuditAction
  module: AuditModule
  description: string
  details?: Record<string, unknown>
  targetId?: string
  ip?: string
}

/**
 * 记录操作日志
 */
export async function logAction(data: AuditLogData): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        userName: data.userName,
        action: data.action,
        module: data.module,
        description: data.description,
        details: data.details ? JSON.stringify(data.details) : null,
        targetId: data.targetId || null,
        ip: data.ip || null,
      },
    })
  } catch (error) {
    console.error('Failed to log audit action:', error)
    // 不抛出错误，避免影响主业务流程
  }
}

/**
 * 批量记录操作日志
 */
export async function logActions(logs: AuditLogData[]): Promise<void> {
  try {
    await prisma.auditLog.createMany({
      data: logs.map((log) => ({
        userId: log.userId,
        userName: log.userName,
        action: log.action,
        module: log.module,
        description: log.description,
        details: log.details ? JSON.stringify(log.details) : null,
        targetId: log.targetId || null,
        ip: log.ip || null,
      })),
    })
  } catch (error) {
    console.error('Failed to log audit actions:', error)
  }
}

/**
 * 查询操作日志
 */
export async function getAuditLogs(params: {
  userId?: string
  module?: AuditModule
  action?: AuditAction
  targetId?: string
  startDate?: Date
  endDate?: Date
  page?: number
  pageSize?: number
}) {
  const where: Record<string, unknown> = {}

  if (params.userId) where.userId = params.userId
  if (params.module) where.module = params.module
  if (params.action) where.action = params.action
  if (params.targetId) where.targetId = params.targetId
  if (params.startDate || params.endDate) {
    where.createdAt = {}
    if (params.startDate) {
      ;(where.createdAt as Record<string, unknown>).gte = params.startDate
    }
    if (params.endDate) {
      ;(where.createdAt as Record<string, unknown>).lte = params.endDate
    }
  }

  const [list, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: ((params.page || 1) - 1) * (params.pageSize || 20),
      take: params.pageSize || 20,
    }),
    prisma.auditLog.count({ where }),
  ])

  return {
    list: list.map((log: { details: string | null }) => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null,
    })),
    total,
    page: params.page || 1,
    pageSize: params.pageSize || 20,
  }
}

/**
 * 获取操作统计
 */
export async function getAuditStats(params: {
  userId?: string
  startDate?: Date
  endDate?: Date
}) {
  const where: Record<string, unknown> = {}

  if (params.userId) where.userId = params.userId
  if (params.startDate || params.endDate) {
    where.createdAt = {}
    if (params.startDate) {
      ;(where.createdAt as Record<string, unknown>).gte = params.startDate
    }
    if (params.endDate) {
      ;(where.createdAt as Record<string, unknown>).lte = params.endDate
    }
  }

  const logs = await prisma.auditLog.findMany({
    where,
    select: {
      action: true,
      module: true,
      createdAt: true,
    },
  })

  // 按操作类型统计
  const actionStats: Record<string, number> = {}
  logs.forEach((log: { action: string }) => {
    actionStats[log.action] = (actionStats[log.action] || 0) + 1
  })

  // 按模块统计
  const moduleStats: Record<string, number> = {}
  logs.forEach((log: { module: string }) => {
    moduleStats[log.module] = (moduleStats[log.module] || 0) + 1
  })

  // 按日期统计（最近7天）
  const dateStats: Record<string, number> = {}
  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    dateStats[dateStr] = 0
  }

  logs.forEach((log: { createdAt: Date }) => {
    const dateStr = log.createdAt.toISOString().split('T')[0]
    if (dateStats.hasOwnProperty(dateStr)) {
      dateStats[dateStr]++
    }
  })

  return {
    actionStats,
    moduleStats,
    dateStats,
    total: logs.length,
  }
}
