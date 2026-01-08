import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { Session } from 'next-auth'

type AuthenticatedHandler = (
  request: NextRequest,
  session: Session,
  context?: { params: Promise<Record<string, string>> }
) => Promise<NextResponse | Response>

/**
 * 认证中间件 - 验证用户是否登录
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (
    request: NextRequest,
    context?: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse | Response> => {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: '未登录，请先登录' },
        { status: 401 }
      )
    }

    return handler(request, session, context)
  }
}

/**
 * 权限中间件 - 验证用户是否有指定权限
 */
export function withPermission(permission: string) {
  return (handler: AuthenticatedHandler) => {
    return async (
      request: NextRequest,
      context?: { params: Promise<Record<string, string>> }
    ): Promise<NextResponse | Response> => {
      const session = await auth()

      if (!session?.user) {
        return NextResponse.json(
          { success: false, error: '未登录，请先登录' },
          { status: 401 }
        )
      }

      const userPermissions = session.user.permissions || []

      // 检查是否有管理员角色（跳过权限检查）
      const isAdmin = session.user.roles?.includes('admin')

      if (!isAdmin && !userPermissions.includes(permission)) {
        return NextResponse.json(
          { success: false, error: '没有操作权限' },
          { status: 403 }
        )
      }

      return handler(request, session, context)
    }
  }
}

/**
 * 角色中间件 - 验证用户是否有指定角色
 */
export function withRole(role: string) {
  return (handler: AuthenticatedHandler) => {
    return async (
      request: NextRequest,
      context?: { params: Promise<Record<string, string>> }
    ): Promise<NextResponse | Response> => {
      const session = await auth()

      if (!session?.user) {
        return NextResponse.json(
          { success: false, error: '未登录，请先登录' },
          { status: 401 }
        )
      }

      const userRoles = session.user.roles || []

      if (!userRoles.includes(role) && !userRoles.includes('admin')) {
        return NextResponse.json(
          { success: false, error: '没有操作权限' },
          { status: 403 }
        )
      }

      return handler(request, session, context)
    }
  }
}

/**
 * 多权限中间件 - 验证用户是否有任一指定权限
 */
export function withAnyPermission(permissions: string[]) {
  return (handler: AuthenticatedHandler) => {
    return async (
      request: NextRequest,
      context?: { params: Promise<Record<string, string>> }
    ): Promise<NextResponse | Response> => {
      const session = await auth()

      if (!session?.user) {
        return NextResponse.json(
          { success: false, error: '未登录，请先登录' },
          { status: 401 }
        )
      }

      const userPermissions = session.user.permissions || []
      const isAdmin = session.user.roles?.includes('admin')

      const hasPermission = permissions.some(p => userPermissions.includes(p))

      if (!isAdmin && !hasPermission) {
        return NextResponse.json(
          { success: false, error: '没有操作权限' },
          { status: 403 }
        )
      }

      return handler(request, session, context)
    }
  }
}
