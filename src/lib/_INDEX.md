# lib 架构说明
核心工具库，提供认证、数据库访问和通用 Hooks
⚠️ 文件夹变化时请更新此文件
> 最后更新: 2026-01-06

## 文件清单
| 文件名 | 地位 | 功能 |
|--------|------|------|
| prisma.ts | 核心 | Prisma ORM 客户端单例（运行时读取 DATABASE_URL） |
| auth.ts | 核心 | NextAuth.js 配置（credentials 登录） |
| hooks.ts | 核心 | 通用数据 Hooks（useList、useDetail、useCRUD 等） |
| api.ts | 工具 | API 请求封装 |
| api-handler.ts | 工具 | API 路由处理器封装 |
| constants.ts | 配置 | 系统常量定义 |
| generate-no.ts | 工具 | 单据编号生成器 |
| numberGenerator.ts | 工具 | 数字序列生成器 |
| statusFlow.ts | 工具 | 状态流转逻辑 |
| utils/ | 目录 | 工具函数集合 |
