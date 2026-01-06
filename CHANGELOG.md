# LIMS 系统变更日志

> 记录所有重要变更，格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)

---

## [1.2.0] - 2026-01-06

### 新增
- **权限控制系统**
  - `src/contexts/AuthContext.tsx` - 权限上下文，提供 useAuth、PermissionButton、PermissionGuard
  - 支持基于角色的菜单和按钮权限控制
  - 管理员角色自动拥有所有权限

- **SWR 数据缓存**
  - `src/contexts/SWRProvider.tsx` - 全局 SWR 配置
  - 5秒请求去重，保留上一次数据避免闪烁
  - 错误自动重试（3次，间隔5秒）

- **通用数据 Hooks**
  - `src/lib/hooks.ts` - 提供 useList、useDetail、useCreate、useUpdate、useDelete、useCRUD
  - 统一的列表分页和 CRUD 操作封装

### 变更
- **8 个前端页面从 mock 数据改为 API 调用**
  - `consumable/info/page.tsx` - 易耗品信息
  - `consumable/transaction/page.tsx` - 出入库记录
  - `outsource/my/page.tsx` - 我的委外
  - `supplier/category/page.tsx` - 供应商分类
  - `supplier/evaluation/page.tsx` - 绩效评价
  - `supplier/template/page.tsx` - 评价模板
  - `system/approval-flow/page.tsx` - 审批流程配置
  - `system/permission/page.tsx` - 权限配置

- **API 增强**
  - `outsource-order` API 添加筛选、统计功能

---

## [1.1.0] - 2026-01-05

### 新增
- 完整的 PRD 文档
- 部署文档 (DEPLOY.md)
- 开发计划文档 (DEVELOPMENT_PLAN.md)

### 修复
- Prisma 运行时数据库连接问题
- NextAuth UntrustedHost 错误
- Docker 镜像 OpenSSL 兼容问题

---

## [1.0.0] - 2026-01-04

### 新增
- LIMS 系统 Next.js 全栈重构
- 基础框架搭建（Next.js 15 + Prisma + Ant Design）
- 用户认证系统（NextAuth.js）
- 基础页面布局
