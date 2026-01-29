# 数据权限诊断报告

## 问题描述
用户报告 `http://8.130.182.148:3001/api/sample` 返回空数据，但数据库中实际有 17 条样品记录。Admin 用户拥有 `dataScope='all'` 权限，应该能看到所有数据。

## 代码分析

### 1. 原始代码问题 (data-permission.ts)

#### 问题 1: 危险的兜底逻辑
```typescript
// 第 15 行
if (!session?.user) return { createdById: 'unknown' }
```
**问题**: 如果 session 获取失败，返回 `createdById: 'unknown'` 会导致查询不到任何数据。

#### 问题 2: 用户查询失败的兜底逻辑
```typescript
// 第 43 行
if (!userWithRoles) return { createdById: 'unknown' }
```
**问题**: 如果数据库查询用户失败，同样返回 `createdById: 'unknown'`，导致返回空数据。

#### 问题 3: 缺少异常处理
```typescript
const userWithRoles = await prisma.user.findUnique({...})
```
**问题**: 没有异常处理，如果数据库查询抛出错误，会导致 500 错误。

#### 问题 4: 缺少日志记录
**问题**: 无法追踪 `getDataFilter()` 的执行过程，难以排查问题。

### 2. 修复后的代码改进

#### 改进 1: 移除危险的兜底逻辑
```typescript
if (!session?.user?.id) {
    logger.warn('getDataFilter: 未登录用户尝试访问数据', { userId })
    // 返回一个永远匹配不到的条件，而不是返回空对象
    return { id: 'never-match-unknown-user' }
}
```

#### 改进 2: 添加异常处理
```typescript
try {
    const session = await auth()
    // ... 业务逻辑
} catch (error) {
    logger.error('getDataFilter: 查询数据权限时发生错误', {
        userId,
        error: error instanceof Error ? error.message : String(error)
    })
    // 发生错误时返回一个永远匹配不到的条件，确保数据安全
    return { id: 'never-match-error' }
}
```

#### 改进 3: 添加详细日志
```typescript
logger.info('getDataFilter: 用户拥有全部数据权限', { userId: user.id })
logger.info('getDataFilter: 用户拥有部门数据权限', { userId: user.id, data: {...} })
logger.info('getDataFilter: 用户仅拥有本人数据权限', { userId: user.id })
```

#### 改进 4: 确保 Admin 用户返回空过滤条件
```typescript
// 1. 全部数据权限
if (hasAll) {
    logger.info('getDataFilter: 用户拥有全部数据权限', { userId: user.id })
    return {} // 无过滤条件，返回所有数据
}
```

## 测试方案

### 测试 1: 验证 Admin 用户能看到所有数据
```bash
curl -X GET http://8.130.182.148:3001/api/sample \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json"
```

**预期结果**: 返回 17 条样品记录

### 测试 2: 检查 PM2 日志
```bash
ssh root@8.130.182.148 "pm2 logs limsnext --lines 50 --nostream"
```

**预期结果**: 看到 `getDataFilter: 用户拥有全部数据权限` 的日志

### 测试 3: 验证普通用户只能看到自己的数据
```bash
curl -X GET http://8.130.182.148:3001/api/sample \
  -H "Authorization: Bearer <normal-user-token>" \
  -H "Content-Type: application/json"
```

**预期结果**: 返回该用户创建的样品记录

## 修复要点

1. **移除危险的 `createdById: 'unknown'` 兜底逻辑**
   - 改为返回 `{ id: 'never-match-xxx' }` 确保不会意外返回数据

2. **添加异常处理**
   - 捕获数据库查询异常
   - 记录详细错误日志

3. **添加详细日志**
   - 记录用户权限级别
   - 记录查询参数
   - 记录异常信息

4. **确保 Admin 用户返回空过滤条件**
   - `dataScope='all'` 时返回 `{}`
   - 不添加任何过滤条件

## 部署步骤

1. 本地测试验证
2. 提交代码到 Git
3. 部署到服务器
4. 重启 PM2 进程
5. 验证修复效果
