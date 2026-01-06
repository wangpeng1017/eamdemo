# contexts 上下文目录索引

> React Context 提供者，管理全局状态
> 最后更新: 2026-01-06

## 文件清单

| 文件名 | 功能 |
|--------|------|
| AuthContext.tsx | 权限控制上下文，提供 useAuth、PermissionButton、PermissionGuard |
| SWRProvider.tsx | SWR 全局配置，数据缓存和请求去重 |

## 使用说明

### AuthContext

```tsx
import { useAuth, PermissionButton, PermissionGuard } from '@/contexts/AuthContext'

// 检查权限
const { hasPermission, user } = useAuth()
if (hasPermission('system:user:add')) { ... }

// 权限按钮
<PermissionButton permission="system:user:add">
  <Button>新增用户</Button>
</PermissionButton>

// 权限守卫
<PermissionGuard permissions={['system:user:view']} mode="any">
  <UserList />
</PermissionGuard>
```

### SWRProvider

在 `app/providers.tsx` 中包裹应用：

```tsx
import { SWRProvider } from '@/contexts/SWRProvider'

export function Providers({ children }) {
  return <SWRProvider>{children}</SWRProvider>
}
```
