'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

interface Permission {
  id: string
  name: string
  code: string
  type: 'menu' | 'button' | 'api'
  parentId: string | null
  path: string | null
  icon: string | null
  sort: number
  status: number
  children?: Permission[]
}

interface User {
  id: string
  name: string
  email: string
  role: string
  permissions: string[]
}

interface AuthContextType {
  user: User | null
  permissions: Permission[]
  loading: boolean
  hasPermission: (code: string) => boolean
  hasAnyPermission: (codes: string[]) => boolean
  hasAllPermissions: (codes: string[]) => boolean
  getMenuPermissions: () => Permission[]
  refreshPermissions: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)

  // 加载用户信息和权限
  const loadUserAndPermissions = useCallback(async () => {
    setLoading(true)
    try {
      // 获取当前用户信息
      const userRes = await fetch('/api/auth/me')
      const userData = await userRes.json()

      if (userData.success && userData.data) {
        setUser(userData.data)

        // 获取用户权限
        const permRes = await fetch('/api/permission?tree=true')
        const permData = await permRes.json()

        if (permData.success) {
          setPermissions(permData.data || [])
        }
      }
    } catch {
      // 用户未登录或获取失败
      setUser(null)
      setPermissions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUserAndPermissions()
  }, [loadUserAndPermissions])

  // 检查是否有某个权限
  const hasPermission = useCallback((code: string): boolean => {
    if (!user) return false
    // 管理员拥有所有权限
    if (user.role === 'ADMIN') return true
    return user.permissions?.includes(code) || false
  }, [user])

  // 检查是否有任意一个权限
  const hasAnyPermission = useCallback((codes: string[]): boolean => {
    if (!user) return false
    if (user.role === 'ADMIN') return true
    return codes.some(code => user.permissions?.includes(code))
  }, [user])

  // 检查是否有所有权限
  const hasAllPermissions = useCallback((codes: string[]): boolean => {
    if (!user) return false
    if (user.role === 'ADMIN') return true
    return codes.every(code => user.permissions?.includes(code))
  }, [user])

  // 获取菜单权限（树形结构）
  const getMenuPermissions = useCallback((): Permission[] => {
    if (!user) return []
    if (user.role === 'ADMIN') return permissions

    // 过滤出用户有权限的菜单
    const filterPermissions = (items: Permission[]): Permission[] => {
      return items
        .filter(item => {
          if (item.type !== 'menu') return false
          if (item.status !== 1) return false
          return user.permissions?.includes(item.code) || false
        })
        .map(item => ({
          ...item,
          children: item.children ? filterPermissions(item.children) : undefined,
        }))
        .filter(item => !item.children || item.children.length > 0 || !item.parentId)
    }

    return filterPermissions(permissions)
  }, [user, permissions])

  // 刷新权限
  const refreshPermissions = useCallback(async () => {
    await loadUserAndPermissions()
  }, [loadUserAndPermissions])

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        loading,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        getMenuPermissions,
        refreshPermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// 权限按钮组件
interface PermissionButtonProps {
  permission: string
  children: ReactNode
  fallback?: ReactNode
}

export function PermissionButton({ permission, children, fallback = null }: PermissionButtonProps) {
  const { hasPermission } = useAuth()

  if (!hasPermission(permission)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// 权限守卫组件
interface PermissionGuardProps {
  permissions: string[]
  mode?: 'any' | 'all'
  children: ReactNode
  fallback?: ReactNode
}

export function PermissionGuard({
  permissions,
  mode = 'any',
  children,
  fallback = null
}: PermissionGuardProps) {
  const { hasAnyPermission, hasAllPermissions } = useAuth()

  const hasAccess = mode === 'any'
    ? hasAnyPermission(permissions)
    : hasAllPermissions(permissions)

  if (!hasAccess) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
