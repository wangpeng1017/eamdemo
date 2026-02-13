# 委托单自动生成客户报告编号 设计文档

> 日期: 2026-02-13

---

## 一、需求概述

当委托单选定**报告出具方式**（reportGrouping）和**报告份数**（reportCopies）后，在委托单创建/保存时自动生成唯一的客户报告（ClientReport）编号。

## 二、核心决策

| 决策项 | 结论 |
|--------|------|
| 报告类型 | 客户报告 ClientReport（CR编号） |
| 份数含义 | 物理副本数，不影响编号数量 |
| 生成时机 | 委托单创建/保存时立即生成 |
| 编辑处理 | 同步增删，允许跳号 |
| 存储方式 | 直接创建 ClientReport 记录（status=draft） |

## 三、编号生成规则

| reportGrouping | 生成数量 | 每条 ClientReport 关联 |
|---------------|---------|----------------------|
| `by_sample` | = 样品数 N | sampleId 指向具体样品 |
| `by_project` | = 检测项目数 M | entrustmentProjectId 指向具体项目 |
| `merged` | = 1 | 仅关联 entrustmentId |

编号格式：`CR-YYYYMMDD-XXX`，复用 `generateClientReportNo()`

## 四、数据模型变更

ClientReport 新增字段：

```prisma
sampleId             String?   @db.VarChar(50)   // 关联样品（by_sample模式）
entrustmentProjectId String?   @db.VarChar(50)   // 关联检测项目（by_project模式）
groupingType         String?   @db.VarChar(20)   // by_sample/by_project/merged
reportCopies         Int?      @default(1)       // 物理副本份数
```

status 字段新增值：`voided`（作废）

不加外键约束，用业务逻辑维护关联。

## 五、API 变更

### POST /api/entrustment（创建）

委托单创建成功后，根据 reportGrouping 生成 ClientReport 记录：
- 检查 reportGrouping 是否有值
- 根据 groupingType 确定数量
- 循环调用 generateClientReportNo() 生成编号
- 批量插入 ClientReport（status=draft）

### PUT /api/entrustment/[id]（编辑）

- reportGrouping 变更 → 旧记录全部 voided，重新生成
- 样品/项目新增 → 追加新 ClientReport
- 样品/项目删除 → 对应 ClientReport 改 voided
- 仅改份数 → 更新现有记录的 reportCopies

## 六、前端变更

EntrustmentForm 底部新增"客户报告编号预览"区域：
- 创建模式：显示"待生成编号"占位
- 编辑模式：显示实际编号 + 作废标记
- 切换 reportGrouping 时实时刷新预览

## 七、边界场景

| 场景 | 处理方式 |
|------|---------|
| 未选出具方式 | 不生成 ClientReport |
| 样品/项目为空 | 不生成，前端提示 |
| 删除委托单 | draft 状态的 ClientReport 级联删除 |
| 已 issued 报告对应样品被删 | 阻止删除样品 |
| 已非 draft 状态的报告 | 编辑时不自动 void，提示用户 |
| 仅改份数 | 更新 reportCopies，不重新生成编号 |
