# LIMS Next.js 安全审计报告

> 审计日期: 2026-02-21
> 审计人: Claude AI
> 项目: 实验室信息管理系统 (LIMS)
> 技术栈: Next.js 15 + Prisma + MySQL + NextAuth

---

## 执行摘要

本次安全审计发现了 **10 个安全漏洞**，其中：
- 🔴 **高危漏洞**: 4 个
- 🟡 **中危漏洞**: 4 个
- 🟢 **低危漏洞**: 2 个

**关键发现**：
1. 多个 API 端点未使用认证中间件
2. 生产环境泄露敏感日志信息
3. 存在水平越权漏洞（用户可修改他人数据）
4. 审批流程存在伪造风险

---

## 漏洞清单

### 🔴 高危漏洞

#### 1. 认证绕过 - API 未使用认证中间件

**严重性**: 🔴 高危
**CVSS 评分**: 8.1 (High)
**位置**: `src/app/api/entrustment/route.ts:14-234`

**漏洞描述**:
```typescript
export const GET = withErrorHandler(async (request: NextRequest) => {
  // ❌ 只使用了 withErrorHandler，没有 withAuth
  const session = await auth()  // 虽然内部有 auth() 调用，
  // 但如果失败不会阻止请求，getDataFilter 失败时仍可能返回数据
```

**攻击场景**:
1. 攻击者直接访问 `/api/entrustment?page=1&pageSize=100`
2. 如果 `getDataFilter()` 执行出错，返回 `{ id: 'never-match-error' }`
3. 但某些查询条件可能绕过这个过滤，导致数据泄露

**影响**:
- 未授权用户可访问委托单列表
- 可能导致客户信息、检测数据泄露

**修复建议**:
```typescript
// ✅ 修复方案
import { withAuth } from '@/lib/api-auth'

export const GET = withAuth(async (request: NextRequest, session) => {
  // withAuth 确保未登录用户直接返回 401
  const permissionFilter = await getDataFilter(session.user.id)
  // ...
})
```

**验证方法**:
```bash
# 未登录访问
curl http://localhost:3000/api/entrustment
# 预期: 401 Unauthorized
```

---

#### 2. 生产环境敏感日志泄露

**严重性**: 🔴 高危
**CVSS 评分**: 7.5 (High)
**位置**: `src/lib/auth.ts:25-154`

**漏洞描述**:
```typescript
console.log("🔍 process.env.AUTH_SECRET:", process.env.AUTH_SECRET ?
  `${process.env.AUTH_SECRET.substring(0, 20)}...` : "❌ UNDEFINED")

console.log("📤 [JWT] 返回 token:", JSON.stringify(token, null, 2))
console.log("📤 [Session] 返回 session:", JSON.stringify(session, null, 2))
```

**泄露信息**:
- JWT token 包含用户 ID、角色、权限
- AUTH_SECRET 的前 20 个字符
- 完整的用户会话对象

**攻击场景**:
1. 生产环境日志被记录到文件或日志服务
2. 攻击者获取日志访问权限（如：未受保护的日志端点、日志泄露）
3. 使用泄露的 JWT token 伪造用户会话

**影响**:
- 会话劫持
- 权限提升
- 数据泄露

**修复建议**:
```typescript
// ✅ 修复方案
const DEBUG = process.env.NODE_ENV === 'development'

if (DEBUG) {
  console.log("📤 [JWT] 返回 token:", JSON.stringify(token, null, 2))
}

// 或者使用专业日志库
import { logger } from '@/lib/logger'
logger.debug('JWT token created', { userId: token.id })
```

---

#### 3. 审批权限绕过 - 管理员硬编码

**严重性**: 🔴 高危
**CVSS 评分**: 7.2 (High)
**位置**: `src/lib/approval/permission.ts:66-68, 103-106`

**漏洞描述**:
```typescript
// ❌ 硬编码用户名检查
if (user.username === 'admin' || userRoleCodes.includes('admin')) {
  console.log(`[DEBUG] ${user.username} 是管理员，通过权限检查`)
  return true  // 直接绕过所有审批检查
}
```

**攻击场景**:
1. 攻击者通过 SQL 注入或其他方式修改用户名为 "admin"
2. 或通过内部人员获取 "admin" 角色
3. 绕过所有审批流程，直接通过/拒绝任意审批

**影响**:
- 审批流程完全失效
- 财务损失（恶意审批报价单）
- 合规风险

**修复建议**:
```typescript
// ✅ 修复方案
// 1. 移除硬编码用户名检查
// 2. 使用基于配置的权限系统
// 3. 添加审批操作的审计日志

const ADMIN_OVERRIDE = process.env.ENABLE_ADMIN_OVERRIDE === 'true'

export function hasApprovalPermission(node: ApprovalNode, user: User): boolean {
  // 仅在特定环境允许管理员覆盖
  if (ADMIN_OVERRIDE && userRoleCodes.includes('admin')) {
    await auditLogger.log('admin_override', {
      userId: user.id,
      node: node.step,
      reason: '管理员权限覆盖'
    })
    return true
  }
  // ... 正常权限检查
}
```

---

#### 4. 水平越权 - 修改他人创建的记录

**严重性**: 🔴 高危
**CVSS 评分**: 7.0 (High)
**位置**: `src/app/api/quotation/[id]/route.ts:110-209`

**漏洞描述**:
```typescript
export const PUT = withAuth(async (request, user, context) => {
  const existing = await prisma.quotation.findUnique({ where: { id } })

  // ❌ 只检查了报价单状态，没有检查用户权限
  if (existing.status !== 'draft' && data.clientResponse === undefined) {
    badRequest('只有草稿状态的报价单可以编辑')
  }
  // 直接更新，没有验证 createdById
```

**攻击场景**:
1. 用户 A 创建了报价单 ID=123
2. 用户 B 调用 `PUT /api/quotation/123` 修改报价金额
3. 服务器只检查了用户是否登录，没有检查是否是创建者
4. 报价单被恶意修改

**影响**:
- 数据完整性受损
- 财务损失（报价金额被修改）
- 审计追踪失效

**修复建议**:
```typescript
// ✅ 修复方案
export const PUT = withAuth(async (request, user, context) => {
  const existing = await prisma.quotation.findUnique({ where: { id } })

  // 1. 检查数据权限
  const permissionFilter = await getDataFilter(user.id)
  const hasPermission = await prisma.quotation.count({
    where: { id, ...permissionFilter }
  }) > 0

  if (!hasPermission) {
    return NextResponse.json(
      { success: false, error: '无权修改此报价单' },
      { status: 403 }
    )
  }

  // 2. 或者检查是否是创建者
  if (existing.createdById !== user.id && !user.roles.includes('admin')) {
    return NextResponse.json(
      { success: false, error: '只能修改自己创建的报价单' },
      { status: 403 }
    )
  }
```

---

### 🟡 中危漏洞

#### 5. SQL 注入风险 - 输入验证缺失

**严重性**: 🟡 中危
**CVSS 评分**: 5.3 (Medium)
**位置**: `src/app/api/entrustment/route.ts:40-46`

**漏洞描述**:
```typescript
if (keyword) {
  where.OR = [
    { entrustmentNo: { contains: keyword } },
    { sampleName: { contains: keyword } },
    { contractNo: { contains: keyword } },
  ]
}
```

**风险**:
- 虽然 Prisma 提供了参数化查询防护
- 但没有输入长度限制，可能导致 DoS 攻击
- 没有特殊字符过滤

**修复建议**:
```typescript
// ✅ 修复方案
if (keyword) {
  // 验证输入长度
  if (keyword.length > 100) {
    badRequest('关键词过长')
  }
  // 过滤特殊字符
  const sanitized = keyword.replace(/[<>\"']/g, '')
  where.OR = [
    { entrustmentNo: { contains: sanitized } },
    // ...
  ]
}
```

---

#### 6. 批量删除缺少授权检查

**严重性**: 🟡 中危
**CVSS 评分**: 6.5 (Medium)
**位置**: `src/app/api/quotation/[id]/route.ts:212-236`

**漏洞描述**:
```typescript
export const DELETE = withAuth(async (request, user, context) => {
  const existing = await prisma.quotation.findUnique({ where: { id } })

  if (existing.status !== 'draft') {
    badRequest('只有草稿状态的报价单可以删除')
  }
  // ❌ 没有检查 user.id === existing.createdById
```

**修复建议**: 参考 #4 漏洞的修复方案

---

#### 7. 审批流篡改风险

**严重性**: 🟡 中危
**CVSS 评分**: 6.8 (Medium)
**位置**: `src/app/api/quotation/[id]/route.ts:276-317`

**漏洞描述**:
```typescript
await approvalEngine.approve({
  instanceId: instance!.id,
  action: action,
  approverId: approver,  // ❌ 从请求体获取
  approverName: submitterName || '未知用户',
  comment,
})
```

**攻击场景**:
1. 攻击者拦截请求，修改 `approverId` 为其他用户 ID
2. 以其他用户身份进行审批
3. 受害者被记录为审批人，承担法律责任

**修复建议**:
```typescript
// ✅ 修复方案
await approvalEngine.approve({
  instanceId: instance!.id,
  action: action,
  approverId: user.id,  // ✅ 从会话获取
  approverName: user.name || '未知用户',
  comment,
})
```

---

#### 8. 数据权限绕过 - 错误处理不当

**严重性**: 🟡 中危
**CVSS 评分**: 5.9 (Medium)
**位置**: `src/lib/data-permission.ts:93-100`

**漏洞描述**:
```typescript
} catch (error) {
  logger.error('getDataFilter: 查询数据权限时发生错误', { ... })
  return { id: 'never-match-error' }
}
```

**风险**:
- 如果某些代码路径没有正确应用 `getDataFilter()` 的结果
- 或者使用其他查询方式绕过
- 可能导致数据泄露

**修复建议**:
```typescript
// ✅ 修复方案
// 1. 确保所有查询都应用了 getDataFilter
// 2. 添加单元测试验证权限过滤
// 3. 使用 Prisma Middleware 全局拦截

test('getDataFilter 应该过滤非本人数据', async () => {
  const filter = await getDataFilter(normalUserId)
  const result = await prisma.entrustment.findMany({
    where: { ...filter }
  })
  expect(result.every(r => r.createdById === normalUserId)).toBe(true)
})
```

---

### 🟢 低危漏洞

#### 9. 敏感信息泄露 - 密码字段

**严重性**: 🟢 低危
**CVSS 评分**: 3.7 (Low)
**位置**: `prisma/schema.prisma:20`

**修复建议**:
```prisma
model User {
  // ...
  password  String  @hidden  // 标记为隐藏字段
  // 或在所有查询中明确排除
}
```

---

#### 10. CSRF 保护缺失

**严重性**: 🟢 低危
**CVSS 评分**: 4.3 (Medium)
**位置**: 全局问题

**修复建议**:
```typescript
// next-auth 配置
export const authOptions: NextAuthOptions = {
  // ...
  useSecureCookies: process.env.NODE_ENV === 'production',
  // 添加 CSRF 保护
}
```

---

## 修复优先级

| 优先级 | 漏洞编号 | 漏洞名称 | 预计工时 |
|--------|----------|----------|----------|
| **P0** | #1 | 认证绕过 | 2 小时 |
| **P0** | #4 | 水平越权 | 4 小时 |
| **P0** | #7 | 审批流篡改 | 1 小时 |
| **P1** | #2 | 敏感日志泄露 | 1 小时 |
| **P1** | #3 | 管理员硬编码 | 3 小时 |
| **P1** | #6 | 批量删除权限 | 2 小时 |
| **P2** | #5 | 输入验证 | 2 小时 |
| **P2** | #8 | 数据权限 | 4 小时 |
| **P3** | #9 | 密码字段 | 0.5 小时 |
| **P3** | #10 | CSRF 保护 | 2 小时 |

**总计**: 约 21.5 小时

---

## 通用安全建议

### 1. 实施统一的认证中间件策略

```typescript
// lib/api-auth-v2.ts - 增强版认证中间件
export function withSecureAuth(options: {
  requiredPermission?: string
  requireOwner?: string  // 资源所有者字段名
}) {
  return (handler: AuthenticatedHandler) => {
    return async (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
      const session = await auth()

      // 1. 检查登录状态
      if (!session?.user) {
        return NextResponse.json(
          { success: false, error: '未登录' },
          { status: 401 }
        )
      }

      // 2. 检查权限
      if (options.requiredPermission) {
        const hasPermission = session.user.permissions?.includes(options.requiredPermission)
        const isAdmin = session.user.roles?.includes('admin')

        if (!isAdmin && !hasPermission) {
          return NextResponse.json(
            { success: false, error: '权限不足' },
            { status: 403 }
          )
        }
      }

      // 3. 检查资源所有权
      if (options.requireOwner) {
        const { id } = await (context?.params || {})
        const resource = await prisma[options.model].findUnique({
          where: { id },
          select: { [options.requireOwner]: true }
        })

        if (resource?.[options.requireOwner] !== session.user.id) {
          return NextResponse.json(
            { success: false, error: '无权访问此资源' },
            { status: 403 }
          )
        }
      }

      return handler(request, session, context)
    }
  }
}
```

### 2. 添加安全测试

```typescript
// tests/security/auth.test.ts
describe('Security Tests', () => {
  test('未登录用户不能访问 API', async () => {
    const response = await fetch('/api/entrustment')
    expect(response.status).toBe(401)
  })

  test('用户不能修改他人创建的报价单', async () => {
    const user1 = await createUser()
    const user2 = await createUser()
    const quotation = await createQuotation(user1.id)

    const response = await fetch(`/api/quotation/${quotation.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${user2.token}` },
      body: JSON.stringify({ status: 'approved' })
    })

    expect(response.status).toBe(403)
  })
})
```

### 3. 安全配置检查清单

- [ ] 所有 API 路由使用 `withAuth` 中间件
- [ ] 生产环境 `debug: false`
- [ ] 移除所有 `console.log` 敏感信息
- [ ] 配置 CSP (Content Security Policy)
- [ ] 启用 HTTPS only cookies
- [ ] 实施 rate limiting
- [ ] 添加审计日志
- [ ] 定期安全扫描

---

## 附录

### A. OWASP Top 10 映射

| OWASP 分类 | 相关漏洞 |
|------------|----------|
| A01:2021 – 访问控制失效 | #1, #4, #6 |
| A02:2021 – 加密失败 | #2 |
| A03:2021 – 注入 | #5 |
| A04:2021 – 不安全设计 | #3, #7, #8 |
| A05:2021 – 安全配置错误 | #9, #10 |

### B. 参考资料

- [OWASP ASVS 4.0](https://owasp.org/www-project-application-security-verification-standard/)
- [NextAuth.js Security Best Practices](https://next-auth.js.org/deployment/security)
- [Prisma Security](https://www.prisma.io/docs/guides/performance-and-optimization/security-in-prisma)

---

**报告生成时间**: 2026-02-21
**审计工具**: Claude AI Security Analysis
**联系方式**: 如有疑问，请联系技术团队
