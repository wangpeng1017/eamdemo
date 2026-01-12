/**
 * @file logger.ts
 * @desc 结构化日志系统 - 支持操作审计和错误追踪
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  /** 用户 ID */
  userId?: string
  /** 用户名 */
  userName?: string
  /** 请求 ID */
  requestId?: string
  /** 模块名称 */
  module?: string
  /** 操作类型 */
  action?: string
  /** 目标实体 */
  entity?: string
  /** 目标 ID */
  entityId?: string
  /** 额外数据 */
  data?: Record<string, unknown>
  /** 错误信息 */
  error?: Error | string
  /** 耗时（毫秒） */
  duration?: number
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context: LogContext
}

/**
 * 日志级别优先级
 */
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

/**
 * 当前日志级别（可通过环境变量配置）
 */
const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'

/**
 * 格式化日志条目
 */
function formatLogEntry(entry: LogEntry): string {
  const { timestamp, level, message, context } = entry

  // 基础信息
  const parts = [
    `[${timestamp}]`,
    `[${level.toUpperCase()}]`,
  ]

  // 添加请求 ID
  if (context.requestId) {
    parts.push(`[${context.requestId}]`)
  }

  // 添加用户信息
  if (context.userId) {
    parts.push(`[user:${context.userId}]`)
  }

  // 添加模块信息
  if (context.module) {
    parts.push(`[${context.module}]`)
  }

  // 添加消息
  parts.push(message)

  // 添加操作详情
  if (context.action) {
    parts.push(`action=${context.action}`)
  }
  if (context.entity) {
    parts.push(`entity=${context.entity}`)
  }
  if (context.entityId) {
    parts.push(`entityId=${context.entityId}`)
  }
  if (context.duration !== undefined) {
    parts.push(`duration=${context.duration}ms`)
  }

  // 添加额外数据
  if (context.data && Object.keys(context.data).length > 0) {
    parts.push(`data=${JSON.stringify(context.data)}`)
  }

  // 添加错误信息
  if (context.error) {
    const errorMsg = context.error instanceof Error
      ? `${context.error.message}\n${context.error.stack}`
      : context.error
    parts.push(`error=${errorMsg}`)
  }

  return parts.join(' ')
}

/**
 * 输出日志
 */
function log(level: LogLevel, message: string, context: LogContext = {}): void {
  // 检查日志级别
  if (LOG_LEVELS[level] < LOG_LEVELS[currentLevel]) {
    return
  }

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
  }

  const formatted = formatLogEntry(entry)

  // 根据级别输出到不同的流
  switch (level) {
    case 'error':
      console.error(formatted)
      break
    case 'warn':
      console.warn(formatted)
      break
    default:
      console.log(formatted)
  }

  // 生产环境可以在这里添加日志收集逻辑
  // 例如发送到 Sentry、CloudWatch、ELK 等
}

/**
 * 日志记录器
 */
export const logger = {
  debug: (message: string, context?: LogContext) => log('debug', message, context),
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  error: (message: string, context?: LogContext) => log('error', message, context),

  /**
   * 记录 API 请求
   */
  apiRequest: (
    method: string,
    path: string,
    userId?: string,
    requestId?: string
  ) => {
    log('info', `API Request: ${method} ${path}`, {
      userId,
      requestId,
      action: 'api_request',
      data: { method, path },
    })
  },

  /**
   * 记录 API 响应
   */
  apiResponse: (
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    userId?: string,
    requestId?: string
  ) => {
    const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info'
    log(level, `API Response: ${method} ${path} ${statusCode}`, {
      userId,
      requestId,
      action: 'api_response',
      duration,
      data: { method, path, statusCode },
    })
  },

  /**
   * 记录业务操作
   */
  operation: (
    action: string,
    entity: string,
    entityId: string,
    userId?: string,
    data?: Record<string, unknown>
  ) => {
    log('info', `Operation: ${action} ${entity}`, {
      userId,
      action,
      entity,
      entityId,
      data,
    })
  },

  /**
   * 记录审批操作
   */
  approval: (
    action: 'submit' | 'approve' | 'reject' | 'cancel',
    bizType: string,
    bizId: string,
    userId: string,
    comment?: string
  ) => {
    log('info', `Approval: ${action} ${bizType}`, {
      userId,
      action: `approval_${action}`,
      entity: bizType,
      entityId: bizId,
      data: comment ? { comment } : undefined,
    })
  },

  /**
   * 记录安全事件
   */
  security: (
    event: 'login' | 'logout' | 'login_failed' | 'unauthorized' | 'forbidden',
    userId?: string,
    data?: Record<string, unknown>
  ) => {
    const level: LogLevel = event === 'login_failed' || event === 'unauthorized' || event === 'forbidden'
      ? 'warn'
      : 'info'
    log(level, `Security: ${event}`, {
      userId,
      action: `security_${event}`,
      data,
    })
  },

  /**
   * 记录数据库操作
   */
  database: (
    operation: 'create' | 'update' | 'delete' | 'query',
    table: string,
    recordId?: string,
    duration?: number
  ) => {
    log('debug', `Database: ${operation} ${table}`, {
      action: `db_${operation}`,
      entity: table,
      entityId: recordId,
      duration,
    })
  },
}

/**
 * 创建带上下文的日志记录器
 */
export function createLogger(context: Partial<LogContext>) {
  return {
    debug: (message: string, ctx?: LogContext) =>
      logger.debug(message, { ...context, ...ctx }),
    info: (message: string, ctx?: LogContext) =>
      logger.info(message, { ...context, ...ctx }),
    warn: (message: string, ctx?: LogContext) =>
      logger.warn(message, { ...context, ...ctx }),
    error: (message: string, ctx?: LogContext) =>
      logger.error(message, { ...context, ...ctx }),
  }
}

export default logger
