# lib 架构说明
核心工具库，提供认证和数据库访问
⚠️ 文件夹变化时请更新此文件

## 文件清单
| 文件名 | 地位 | 功能 |
|--------|------|------|
| prisma.ts | 核心 | Prisma ORM 客户端单例（运行时读取 DATABASE_URL） |
| auth.ts | 核心 | NextAuth.js 配置（credentials 登录） |
