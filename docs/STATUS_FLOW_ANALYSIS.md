# 单据状态梳理分析报告

> 分析日期: 2026-02-22
> 分析范围: LIMS 系统全业务单据状态定义与实际流转
> 分析人员: AI Assistant

---

## 一、各单据状态全景

| 单据 | 状态值（Schema定义） | 前端显示文本 |
|------|---------------------|---------|
| **咨询单 (Consultation)** | `following` / `assessing` / `assessment_passed` / `assessment_failed` / `quoted` / `rejected` / `closed` | 跟进中/评估中/评估通过/评估不可行/已报价/已拒绝/已关闭 |
| **报价单 (Quotation)** | `draft` / `pending_sales` / `pending_finance` / `pending_lab` / `approved` / `rejected` / `archived` | 草稿/待销售审批/待财务审批/待实验室审批/已批准/已拒绝/已归档 |
| **合同 (Contract)** | `draft` / `signed` / `executing` / `completed` / `terminated` | 草稿/已签订/执行中/已完成/已终止 |
| **委托单 (Entrustment)** | Schema: `pending` / `accepted` / `testing` / `completed`<br>实际运行: `pending` / `processing` / `completed` | 待受理/已受理/检测中/已完成<br>实际显示: 待受理/进行中/已完成 |
| **检测项目 (EntrustmentProject)** | `pending` / `assigned` / `subcontracted` / `completed` | 待分配/已分配/已外包/已完成 |
| **检测任务 (TestTask)** | Schema注释: `待开始/进行中/已完成/已转交`（中文）<br>StatusTag: `pending` / `in_progress` / `completed` / `transferred`（英文） | 待开始/进行中/已完成/已转交 |
| **样品 (Sample)** | `待收样` / `已收样` / `已分配` / `检测中` / `已完成` / `已归还` / `已销毁` | 中文状态值 |
| **检测报告-内部 (TestReport)** | `draft` / `reviewing` / `approved` / `issued` | 草稿/待审核/已批准/已发布 |
| **客户报告 (ClientReport)** | `draft` / `pending_review` / `pending_approve` / `approved` / `issued` / `voided` | 草稿/待审核/待审批/已批准/已发布/已作废 |
| **应收款 (FinanceReceivable)** | `pending` / `partial` / `completed` | 未收款/部分收款/已收款 |
| **发票 (FinanceInvoice)** | `pending` / `issued` | 待开票/已开票 |

---

## 二、发现的核心问题

### 🔴 问题1：委托单状态定义与实际运行严重不一致

**Schema 定义（`prisma/schema.prisma:561`）**：
```prisma
status     String  @default("pending") // pending/accepted/testing/completed
```

**前端 StatusTag 定义（`src/components/StatusTag.tsx:52-63`）**：
```tsx
entrustment: {
  pending: '待受理',
  accepted: '已受理',
  processing: '进行中',        // ← Schema 没定义
  '待分配': '待分配',           // ← 废弃状态
  assigned: '已分配',           // ← 废弃状态
  testing: '检测中',
  in_progress: '进行中',        // ← 废弃状态
  completed: '已完成',
  cancelled: '已取消',          // ← 废弃状态
  rejected: '已拒绝',           // ← 废弃状态
}
```

**API 实际写入的值**：

| 位置 | 写入的值 | 触发条件 |
|------|----------|----------|
| `route.ts:376` | `pending` | 创建委托单时 |
| `projects/[projectId]/route.ts:97` | `processing` | **有项目被分配时** |
| `projects/[projectId]/route.ts:92` | `completed` | **所有项目完成时** |
| `external-link/route.ts:112` | `processing` | 外部链接进入时 |

**结论**：
- Schema 定义了 `pending` / `accepted` / `testing` / `completed` 四个状态
- API 实际只使用 `pending` / `processing` / `completed` 三个状态
- 前端 StatusTag 定义了 10 个状态，其中 6 个是"死状态"（从未被写入）
- **整个委托单状态机实际只有 3 个值在运行**：`pending → processing → completed`

---

### 🔴 问题2：委托单缺少"报告已生成"状态（核心业务缺口）

**现状**：
```
委托单 pending（待受理）
  ↓ [受理操作]
委托单 processing（检测中）← 检测项目分配后自动变更
  ↓ [所有检测项目完成]
委托单 completed（检测完成）
  ↓ [人工操作]
生成客户报告 → ClientReport.status: draft → pending_review → pending_approve → approved → issued
```

**问题**：
- 委托单的 `completed` 只代表"所有检测项目已完成"
- 客户报告是否生成、是否审批通过、是否已发布，**委托单上完全看不到**
- 业务人员看委托单列表时，看到 `completed` 根本不知道报告是否已发出

**代码证据**：
```typescript
// src/app/api/client-report/generate/route.ts:81-110
// 生成客户报告时，完全没有回写委托单状态
const report = await prisma.clientReport.create({
  data: {
    reportNo: await generateClientReportNo(),
    entrustmentId,
    status: 'draft',
    // ... 其他字段
  }
})
// ❌ 没有 await prisma.entrustment.update(...)
```

**业务影响**：
- 业务人员无法在委托单列表快速识别哪些委托单的报告已发出
- 需要点击进入详情才能看到客户报告状态，影响工作效率
- 统计报表无法准确统计"报告已发出"的委托单数量

---

### 🟡 问题3：检测任务状态混用中英文

**Schema 注释（`prisma/schema.prisma:710`）**：
```prisma
status String @default("pending") // 待开始/进行中/已完成/已转交
```

**StatusTag 定义（`src/components/StatusTag.tsx:73-80`）**：
```tsx
task: {
  pending: '待开始',
  in_progress: '进行中',   // ← 英文
  '进行中': '进行中',       // ← 中文（兜底）
  completed: '已完成',
  '已完成': '已完成',       // ← 中文（兜底）
  transferred: '已转交',
  '已转交': '已转交',       // ← 中文（兜底）
}
```

**问题**：
- Schema 注释说是中文，但 StatusTag 同时支持英文和中文
- 历史代码可能混用中英文，导致查询和判断逻辑复杂
- 建议统一使用英文状态值

---

### 🟡 问题4：报价单 `entrusted` 状态只存在于 StatusTag

**StatusTag 定义（`src/components/StatusTag.tsx:30-38`）**：
```tsx
quotation: {
  draft: '草稿',
  pending_sales: '待销售审批',
  pending_finance: '待财务审批',
  pending_lab: '待实验室审批',
  approved: '已批准',
  rejected: '已拒绝',
  archived: '已归档',
  entrusted: '已委托',     // ← Schema 没定义，API 从不写入
}
```

**问题**：
- StatusTag 定义了 `entrusted: '已委托'`，但 Schema 注释里没有
- API 层从未写入 `entrusted` 状态
- 这是一个"死状态"，应该删除

---

### 🟡 问题5：两套审批状态字段并存（冗余）

**同时存在的字段**：
```prisma
// 委托单、报价单、合同、客户资料都一样
status          String   @default("xxx")
approvalStatus  String?  @default("pending") // pending/approved/rejected/cancelled
```

**问题**：
- `status` 和 `approvalStatus` 语义重叠
- 维护时容易不同步
- 建议只保留一个状态字段

---

## 三、委托单正确的状态机建议

### 方案A：扩展主状态机（推荐）

```
pending（待受理）
  ↓ [受理操作]
accepted（已受理）
  ↓ [分配检测项目]
processing（检测中）
  ↓ [所有检测项目完成]
completed（检测完成）
  ↓ [生成客户报告并发布]
report_issued（报告已发出）  ← 新增状态
```

**优点**：
- 状态清晰，业务人员一眼能看出当前阶段
- 列表筛选方便：`status=report_issued` 可直接筛选报告已发出的委托单

**缺点**：
- 需要修改 Schema、API、前端三处

---

### 方案B：增加 `reportStatus` 字段（轻量）

委托单主状态不变，增加独立字段：

```prisma
model Entrustment {
  // ... 现有字段
  reportStatus String @default("none") // none/generated/issued
}
```

**状态对应**：
- `none`: 未生成报告
- `generated`: 报告已生成（草稿/审核中/已批准）
- `issued`: 报告已发布

**优点**：
- 改动最小，只需：
  1. Schema 增加字段
  2. 生成报告时回写 `reportStatus`
  3. 前端列表增加一列显示

**缺点**：
- 两个字段需要分别维护

---

## 四、修复优先级建议

### 高优（P0）

| 问题 | 修复方案 | 预计工作量 |
|------|----------|-----------|
| **委托单缺少报告状态** | 方案B：增加 `reportStatus` 字段，生成报告时回写 | 2小时 |
| **委托单状态不一致** | Schema 注释改为 `pending/processing/completed`，删除 StatusTag 死状态 | 1小时 |

**修复内容**：
1. Schema 增加字段：`reportStatus String @default("none")`
2. `client-report/generate/route.ts` 创建报告后回写：`reportStatus: 'generated'`
3. `client-report/[id]/route.ts` 报告发布时回写：`reportStatus: 'issued'`
4. 前端委托单列表增加"报告状态"列
5. 清理 StatusTag.tsx 中委托单的死状态

---

### 中优（P1）

| 问题 | 修复方案 | 预计工作量 |
|------|----------|-----------|
| **检测任务中英文混用** | Schema 注释改为英文，StatusTag 删除中文映射 | 30分钟 |
| **报价单死状态** | 删除 StatusTag 中的 `entrusted` | 5分钟 |

**修复内容**：
1. `TestTask.status` 注释改为：`pending/in_progress/completed/transferred`
2. StatusTag.tsx 删除 `task` 类型中的中文映射
3. StatusTag.tsx 删除 `quotation` 类型中的 `entrusted`

---

### 低优（P2）

| 问题 | 修复方案 | 预计工作量 |
|------|----------|-----------|
| **审批状态冗余** | 评估后决定是否合并 `status` 和 `approvalStatus` | 待评估 |

---

## 五、附录：代码位置索引

| 模块 | 文件路径 | 关键行号 |
|------|----------|----------|
| Schema 定义 | `prisma/schema.prisma` | 561（委托单）, 710（检测任务） |
| 委托单状态更新 | `src/app/api/entrustment/[id]/projects/[projectId]/route.ts` | 90-100 |
| 客户报告生成 | `src/app/api/client-report/generate/route.ts` | 81-110 |
| 客户报告更新 | `src/app/api/client-report/[id]/route.ts` | - |
| StatusTag 组件 | `src/components/StatusTag.tsx` | 52-63（委托单）, 73-80（任务）, 30-38（报价单） |
| 委托单列表页 | `src/app/(dashboard)/entrustment/list/page.tsx` | 700-702（状态列） |

---

## 六、变更历史

| 日期 | 版本 | 变更内容 | 操作人 |
|------|------|----------|--------|
| 2026-02-22 | 1.0 | 初始版本，完成全系统单据状态梳理 | AI |
