import { NextRequest, NextResponse } from 'next/server'

// Prisma 错误类型检查辅助函数
function isPrismaKnownRequestError(err: unknown): err is { code: string; meta?: { target?: unknown; field_name?: unknown } } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as { code: unknown }).code === 'string' &&
    (err as { code: string }).code.startsWith('P')
  )
}

function isPrismaValidationError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err as { name: string }).name === 'PrismaClientValidationError'
  )
}

/**
 * API 响应类型
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
}

/**
 * API 错误类
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * 常见错误代码
 */
export const ErrorCodes = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const

/**
 * 成功响应
 */
export function success<T>(data: T, statusCode: number = 200): NextResponse {
  return NextResponse.json(
    { success: true, data } as ApiResponse<T>,
    { status: statusCode }
  )
}

/**
 * 错误响应
 */
export function error(
  code: string,
  message: string,
  statusCode: number = 400,
  details?: unknown
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, details },
    } as ApiResponse,
    { status: statusCode }
  )
}

/**
 * API 处理器包装函数
 * 提供统一的错误处理和响应格式
 */
export function withErrorHandler<T>(
  handler: (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => Promise<T>
) {
  return async (
    request: NextRequest,
    context?: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    try {
      const result = await handler(request, context)

      // 如果处理器返回的已经是 NextResponse，直接返回
      if (result instanceof NextResponse) {
        return result
      }

      // 否则包装成标准响应
      return success(result)
    } catch (err) {
      console.error('[API Error]', err)

      // 处理自定义 API 错误
      if (err instanceof ApiError) {
        return error(err.code, err.message, err.statusCode, err.details)
      }

      // 处理 Prisma 错误
      if (isPrismaKnownRequestError(err)) {
        switch (err.code) {
          case 'P2002':
            // 唯一约束冲突
            return error(
              ErrorCodes.CONFLICT,
              '数据已存在，请检查唯一字段',
              409,
              { field: err.meta?.target }
            )
          case 'P2025':
            // 记录不存在
            return error(ErrorCodes.NOT_FOUND, '记录不存在', 404)
          case 'P2003':
            // 外键约束失败
            return error(
              ErrorCodes.BAD_REQUEST,
              '关联数据不存在',
              400,
              { field: err.meta?.field_name }
            )
          default:
            return error(
              ErrorCodes.DATABASE_ERROR,
              '数据库操作失败',
              500,
              { code: err.code }
            )
        }
      }

      if (isPrismaValidationError(err)) {
        return error(
          ErrorCodes.VALIDATION_ERROR,
          '数据验证失败',
          400
        )
      }

      // 处理其他错误
      const message = err instanceof Error ? err.message : '服务器内部错误'
      return error(ErrorCodes.INTERNAL_ERROR, message, 500)
    }
  }
}

/**
 * 验证必填字段
 */
export function validateRequired(
  data: Record<string, unknown>,
  requiredFields: string[]
): void {
  const missing = requiredFields.filter(
    (field) => data[field] === undefined || data[field] === null || data[field] === ''
  )
  if (missing.length > 0) {
    throw new ApiError(
      ErrorCodes.VALIDATION_ERROR,
      `缺少必填字段: ${missing.join(', ')}`,
      400,
      { missingFields: missing }
    )
  }
}

/**
 * 验证枚举值
 */
export function validateEnum<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  fieldName: string
): T {
  if (!allowedValues.includes(value as T)) {
    throw new ApiError(
      ErrorCodes.VALIDATION_ERROR,
      `${fieldName} 的值无效，允许的值: ${allowedValues.join(', ')}`,
      400,
      { field: fieldName, allowedValues }
    )
  }
  return value as T
}

/**
 * 抛出 404 错误
 */
export function notFound(message: string = '记录不存在'): never {
  throw new ApiError(ErrorCodes.NOT_FOUND, message, 404)
}

/**
 * 抛出 400 错误
 */
export function badRequest(message: string, details?: unknown): never {
  throw new ApiError(ErrorCodes.BAD_REQUEST, message, 400, details)
}

/**
 * 抛出 401 错误
 */
export function unauthorized(message: string = '未登录或登录已过期'): never {
  throw new ApiError(ErrorCodes.UNAUTHORIZED, message, 401)
}

/**
 * 抛出 403 错误
 */
export function forbidden(message: string = '无权限执行此操作'): never {
  throw new ApiError(ErrorCodes.FORBIDDEN, message, 403)
}
