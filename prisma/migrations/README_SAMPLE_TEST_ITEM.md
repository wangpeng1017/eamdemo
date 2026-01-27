# 样品检测项表迁移指南

## 概述

本次迁移新增了 `biz_sample_test_item` 表，用于统一管理各业务模块（委托咨询、报价单、合同、委托单、收样登记）的样品和检测项数据。

## 迁移方式

### 方式一：使用 Prisma 自动迁移（推荐）

在项目根目录执行：

```bash
npx prisma db push
```

**优点**：
- 自动根据 schema.prisma 创建表结构
- 保证与 Prisma model 完全一致

**前提条件**：
- 本地能连接到数据库
- DATABASE_URL 环境变量已正确配置

### 方式二：手动执行 SQL（备用方案）

如果 Prisma 自动迁移失败，可以手动执行 SQL 脚本：

```bash
# PostgreSQL
psql -U 用户名 -d 数据库名 -f prisma/migrations/create_sample_test_item_table.sql

# 或使用 docker exec（如果数据库在 Docker 中）
docker exec -i 容器名 psql -U 用户名 -d 数据库名 < prisma/migrations/create_sample_test_item_table.sql
```

## 验证迁移成功

执行以下 SQL 查询验证表是否创建成功：

```sql
-- 检查表是否存在
SELECT table_name FROM information_schema.tables
WHERE table_name = 'biz_sample_test_item';

-- 查看表结构
\d biz_sample_test_item

-- 查看索引
SELECT indexname FROM pg_indexes WHERE tablename = 'biz_sample_test_item';
```

## 回滚方案（如需要）

如果需要回滚，执行以下 SQL：

```sql
DROP TABLE IF EXISTS biz_sample_test_item;
```

## 注意事项

1. **数据备份**：迁移前请先备份数据库
2. **停机时间**：此迁移为新增表，不影响现有数据，无需停机
3. **权限要求**：执行迁移需要 CREATE TABLE 权限

## 迁移时间

预计耗时：< 1 秒

## 相关文件

- Prisma Schema: `prisma/schema.prisma`
- SQL 脚本: `prisma/migrations/create_sample_test_item_table.sql`
- API 路由: `src/app/api/sample-test-item/route.ts`
- 表格组件: `src/components/SampleTestItemTable.tsx`
