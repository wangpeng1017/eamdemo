# 样品检测项统一表格设计方案

> 创建日期: 2026-01-27
> 状态: 已确认

## 一、需求概述

将业务管理模块中的样品信息和检测项目信息合并到一个统一的表格中，每一行代表"一个样品+一个检测项目"的组合。

### 应用范围

- 委托咨询
- 报价单
- 合同
- 委托单
- 收样登记

### 表格字段

| 序号 | 字段名 | 字段标识 | 类型 | 必填 | 说明 |
|------|--------|----------|------|------|------|
| 1 | 序号 | - | number | - | 自动生成 |
| 2 | 样品名称 | sampleName | string | 是 | 手动输入 |
| 3 | 生产批次号 | batchNo | string | 否 | 手动输入 |
| 4 | 材质/牌号 | material | string | 否 | 手动输入 |
| 5 | 样品外观 | appearance | string | 否 | 手动输入 |
| 6 | 检测项目 | testTemplateId | string | 是 | 下拉选择，来源于检测项目管理 |
| 7 | 检测标准 | testStandard | string | 否 | 自动填充，不可编辑 |
| 8 | 评判标准 | judgmentStandard | string | 否 | 手动输入 |
| 9 | 样品数量 | quantity | number | 是 | 手动输入 |

## 二、数据模型设计

### SampleTestItem（样品检测项）

```prisma
model SampleTestItem {
  id                String    @id @default(cuid())

  // 关联的业务单据（多态关联）
  bizType           String    @db.VarChar(50)  // consultation/quotation/contract/entrustment/sample_receipt
  bizId             String    @db.VarChar(50)  // 业务单据ID

  // 样品信息
  sampleName        String    @db.VarChar(200) // 样品名称
  batchNo           String?   @db.VarChar(100) // 生产批次号
  material          String?   @db.VarChar(100) // 材质/牌号
  appearance        String?   @db.Text         // 样品外观
  quantity          Int                        // 样品数量

  // 检测项目信息
  testTemplateId    String    @db.VarChar(50)  // 关联检测项目管理
  testItemName      String    @db.VarChar(200) // 检测项目名称（冗余存储）
  testStandard      String?   @db.VarChar(200) // 检测标准（冗余存储）
  judgmentStandard  String?   @db.Text         // 评判标准

  // 排序和状态
  sortOrder         Int       @default(0)      // 排序序号

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([bizType, bizId])
  @@index([testTemplateId])
  @@map("biz_sample_test_item")
}
```

## 三、API 接口设计

### 基础路由：/api/sample-test-item

1. **查询列表**：`GET /api/sample-test-item?bizType=xxx&bizId=xxx`
2. **批量保存**：`POST /api/sample-test-item/batch`
3. **删除**：`DELETE /api/sample-test-item/:id`

## 四、数据流转链路

```
委托咨询 ──生成报价单──▶ 报价单 ──生成合同──▶ 合同 ──生成委托单──▶ 委托单
    │                      │                    │                    │
    └─ 样品检测项 ─────────▶ 自动复制 ──────────▶ 自动复制 ──────────▶ 自动复制
```

## 五、实现计划

| 步骤 | 任务 | 涉及文件 |
|------|------|----------|
| 1 | 新增 SampleTestItem 数据模型 | `prisma/schema.prisma` |
| 2 | 执行数据库迁移 | `npx prisma db push` |
| 3 | 创建样品检测项 API | `src/app/api/sample-test-item/` |
| 4 | 创建可复用表格组件 | `src/components/SampleTestItemTable.tsx` |
| 5 | 改造委托咨询页面 | `src/app/(dashboard)/entrustment/consultation/page.tsx` |
| 6 | 改造报价单页面 | `src/app/(dashboard)/entrustment/quotation/page.tsx` |
| 7 | 改造合同页面 | `src/app/(dashboard)/entrustment/contract/page.tsx` |
| 8 | 改造委托单页面 | `src/app/(dashboard)/entrustment/list/page.tsx` |
| 9 | 改造收样登记页面 | `src/app/(dashboard)/sample/receipt/page.tsx` |
| 10 | 更新单据生成逻辑（自动复制） | 各模块 API |
