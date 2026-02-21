# LIMS Next.js 业务逻辑漏洞分析报告

> 分析日期: 2026-02-21
> 分析范围: 单据流转、状态机、数据一致性

---

## 一、业务单据流转链路

```
客户(Client)
  → 咨询(Consultation)
    → 报价(Quotation)
      → 合同(Contract)
        → 委托(Entrustment)
          → 样品(Sample)
            → 检测任务(TestTask)
              → 检测报告(TestReport)
                → 客户报告(ClientReport)
```

---

## 二、发现的问题汇总

### 2.1 高危问题

#### 🔴 问题1: 编号生成竞态条件 (可能导致重复编号)

**位置**:
- `src/app/api/quotation/route.ts:136-139`
- `src/app/api/consultation/route.ts:111-126`

**问题描述**:
报价单和咨询单的编号生成使用 `count` 方式，而非原子操作。高并发场景下可能生成重复编号。

```typescript
// quotation/route.ts (错误做法)
const count = await prisma.quotation.count({
  where: { quotationNo: { startsWith: `BJ${today}` } }
})
const quotationNo = `BJ${today}${String(count + 1).padStart(4, '0')}`
```

```typescript
// consultation/route.ts (错误做法)
const lastConsultation = await prisma.consultation.findFirst({
  where: { consultationNo: { startsWith: prefix } },
  orderBy: { consultationNo: 'desc' },
})
// 提取序号 + 1
```

**正确做法** (参考 `entrustment/route.ts:260`):
```typescript
// 使用 generateNo 函数，内部使用 INSERT ON DUPLICATE KEY UPDATE 原子操作
const entrustmentNo = await generateNo(NumberPrefixes.ENTRUSTMENT, 4)
```

**影响**: 高并发下可能产生重复编号，导致业务异常

**建议修复**: 统一使用 `generateNo()` 函数生成所有业务编号

---

#### 🔴 问题2: 咨询单缺少数据权限过滤

**位置**: `src/app/api/consultation/route.ts:14-100`

**问题描述**:
咨询单列表接口没有调用 `getDataFilter()` 注入数据权限，而其他模块（报价、合同、委托单、客户、样品）都有实现。

```typescript
// consultation/route.ts GET - 缺少权限过滤
const [list, total] = await Promise.all([
  prisma.consultation.findMany({
    where,  // 没有合并 permissionFilter
    // ...
  }),
])
```

对比其他模块:
```typescript
// quotation/route.ts GET - 正确实现
const permissionFilter = await getDataFilter()
Object.assign(where, permissionFilter)
```

**影响**: 用户可能看到不应该看到的咨询单记录

**建议修复**: 在 GET 方法中添加数据权限过滤

---

#### 🔴 问题3: 委托单创建缺少客户ID校验

**位置**: `src/app/api/entrustment/route.ts:253-257`

**问题描述**:
创建委托单时只校验了 `clientName`，没有校验 `clientId`。可能导致委托单没有关联到正确的客户。

```typescript
// 只校验了 clientName
if (!data.clientName) {
  throw new Error('缺少必填字段: clientName')
}
// clientId 可以是 undefined/null
```

而报价单创建时强制要求 clientId:
```typescript
// quotation/route.ts - 正确做法
const clientId = (typeof data.clientId === 'string' && data.clientId.trim() !== '') ? data.clientId.trim() : null
if (!clientId) {
  badRequest('请选择委托方客户（clientId 不能为空）')
}
```

**影响**: 委托单可能没有正确关联客户，导致后续业务流程异常

**建议修复**: 添加 clientId 必填校验

---

### 2.2 中危问题

#### 🟡 问题4: 咨询单关闭缺少状态校验

**位置**: `src/app/api/consultation/[id]/close/route.ts:9-47`

**问题描述**:
关闭咨询单时没有检查当前状态，已报价的咨询单仍可被关闭。

```typescript
// 没有检查 consultation.status
export const POST = withAuth(async (...) => {
  const consultation = await prisma.consultation.findUnique({ where: { id } })
  // 直接更新为 closed，没有状态检查
  await prisma.consultation.update({ where: { id }, data: { status: 'closed' } })
})
```

**影响**:
- 已生成报价单的咨询单被关闭后，数据链路断裂
- 追溯问题时无法确定业务状态

**建议修复**: 关闭前检查状态，已报价/已关闭的咨询单不允许再关闭

---

#### 🟡 问题5: 委托单状态定义不一致

**位置**:
- `prisma/schema.prisma:555`
- `src/app/api/entrustment/[id]/projects/[projectId]/route.ts:97`

**问题描述**:
Schema 定义中委托单状态为 `pending/accepted/testing/completed`，但代码中使用了 `in_progress`。

```prisma
// schema.prisma
status String @default("pending") // pending/accepted/testing/completed
```

```typescript
// entrustment/[id]/projects/[projectId]/route.ts
newEntrustmentStatus = 'in_progress'  // Schema 中没有定义!
```

**影响**: 代码与数据库定义不一致，可能导致状态显示错误

**建议修复**: 统一状态定义，建议在 Schema 中明确注释所有可选值

---

#### 🟡 问题6: 样品初始状态判断逻辑不一致

**位置**: `src/app/api/entrustment/route.ts:386-390` vs `src/lib/quotation-to-entrustment.ts:228`

**问题描述**:
两个地方对样品初始状态的判断逻辑不同。

```typescript
// entrustment/route.ts - 直接创建委托单
const today = new Date()
today.setHours(0, 0, 0, 0)
const isFutureSample = sampleDate.getTime() > today.getTime() + 86400000
status: isFutureSample ? 'pending' : 'received'
```

```typescript
// quotation-to-entrustment.ts - 从报价单创建
status: 'received'  // 固定为 received
```

**影响**: 不同创建路径下，样品状态不一致

**建议修复**: 统一样品初始状态判断逻辑

---

#### 🟡 问题7: 委托单缺少 `quotationNo` 字段

**位置**: `src/lib/quotation-to-entrustment.ts:147`

**问题描述**:
从报价单创建委托单时，同时设置了 `quotationNo` 和 `quotationId`，但 `Entrustment` 模型中没有 `quotationNo` 字段。

```typescript
// quotation-to-entrustment.ts
await prisma.entrustment.create({
  data: {
    entrustmentNo,
    quotationNo: quotation.quotationNo,  // ⚠️ Schema 中没有此字段!
    quotationId: quotation.id,
    // ...
  }
})
```

```prisma
// schema.prisma - Entrustment 模型
model Entrustment {
  quotationId   String?
  quotation     Quotation? @relation(fields: [quotationId], references: [id])
  // ⚠️ 没有 quotationNo 字段!
}
```

**影响**: 代码无法正常运行（应该会报错）

**建议修复**:
- 方案A: 在 Schema 中添加 `quotationNo` 字段
- 方案B: 移除 `quotationNo` 赋值，只保留 `quotationId`

---

### 2.3 低危问题

#### 🟢 问题8: 审批驳回后状态映射不一致

**位置**: `src/lib/approval/engine.ts:322-360`

**问题描述**:
不同业务类型的审批驳回后，状态映射逻辑不统一。

```typescript
// quotation - 驳回后 status = 'rejected'
case 'quotation':
  if (approvalStatus === 'rejected') {
    updateData.status = 'rejected'
  }

// contract - 驳回后 status = 'draft'
case 'contract':
  if (approvalStatus === 'rejected') {
    updateData.status = 'draft'  // 与 quotation 不一致!
  }

// entrustment - 驳回后 status = 'pending'
case 'entrustment':
  if (approvalStatus === 'rejected') {
    updateData.status = 'pending'  // 又不一样!
  }
```

**影响**: 用户体验不一致，可能造成困惑

**建议修复**: 统一驳回后的状态处理策略

---

#### 🟢 问题9: 报价单创建后未回写咨询单状态

**位置**: `src/app/api/quotation/route.ts:207-213`

**问题描述**:
报价单创建后会回写咨询单的 `quotationNo` 和 `status`，但当状态变化时（如审批通过/驳回），没有同步更新咨询单。

```typescript
// quotation/route.ts - 只有创建时回写
if (consultationNo) {
  await prisma.consultation.updateMany({
    where: { consultationNo },
    data: { quotationNo, status: 'quoted' },
  })
}
// ⚠️ 但审批通过/驳回后没有更新咨询单
```

**影响**: 咨询单状态无法反映报价单的最终结果

**建议修复**: 在审批通过/驳回时同步更新关联的咨询单状态

---

#### 🟢 问题10: 日期过滤条件重复定义

**位置**: `src/app/api/quotation/route.ts:29-34` 和 `src/app/api/contract/route.ts:28-32`

**问题描述**:
日期过滤条件 `endDate` 被重复赋值。

```typescript
if (startDate || endDate) {
  where.createdAt = {}
  if (startDate) where.createdAt.gte = new Date(startDate)
  if (endDate) where.createdAt.lte = new Date(endDate)
  if (endDate) where.createdAt.lte = new Date(endDate)  // ⚠️ 重复!
}
```

**影响**: 无实际影响（代码冗余），但应清理

**建议修复**: 删除重复的 `endDate` 赋值行

---

## 三、数据一致性检查

### 3.1 上下游单据字段映射

| 上游单据 | 下游单据 | 字段继承检查 | 状态 |
|---------|---------|------------|------|
| Consultation | Quotation | `clientReportDeadline`, `followerId`, 联系方式 | ✅ |
| Quotation | Contract | `clientReportDeadline`, `followerId`, `clientId` | ✅ |
| Quotation | Entrustment | `clientReportDeadline`, `followerId`, 联系方式 | ✅ |
| Contract | Entrustment | `clientReportDeadline`, `followerId`, 甲方信息 | ✅ |
| Entrustment | Sample | 样品信息 | ✅ |
| Entrustment | TestTask | 检测项目信息 | ✅ |

**备注**: 大部分字段映射正确，但需要注意：
1. `quotation-to-entrustment.ts` 中使用了 Schema 不存在的 `quotationNo` 字段
2. 不同创建路径下的样品初始状态不一致

---

### 3.2 状态机完整性

#### 咨询单 (Consultation)
```
following → assessing → assessment_passed → quoted → closed
          ↓           ↓
      reassess    assessment_failed → rejected/closed
```

**问题**:
- 缺少 `quoted` → `closed` 的状态校验
- `assessment_failed` 后可以直接 `close`，没有强制要求重新评估

#### 报价单 (Quotation)
```
draft → pending_sales → pending_finance → pending_lab → approved → archived
                      ↓                                  ↓
                    rejected                           archived
```

**问题**: 无明显问题

#### 委托单 (Entrustment)
```
pending → accepted → testing → completed
```

**问题**:
- Schema 定义与代码实现不一致（使用了 `in_progress`）
- 缺少状态流转的校验逻辑

---

## 四、优先级修复建议

### P0 (立即修复)
1. ✅ 修复编号生成竞态条件 (问题1)
2. ✅ 添加咨询单数据权限过滤 (问题2)
3. ✅ 添加委托单创建时的 clientId 校验 (问题3)
4. ✅ 修复 Entrustment 模型缺少 `quotationNo` 字段 (问题7)

### P1 (尽快修复)
5. ✅ 添加咨询单关闭状态校验 (问题4)
6. ✅ 统一委托单状态定义 (问题5)
7. ✅ 统一样品初始状态判断逻辑 (问题6)

### P2 (可延后修复)
8. ⚪ 统一审批驳回状态映射 (问题8)
9. ⚪ 添加报价单审批后回写咨询单 (问题9)
10. ⚪ 清理重复代码 (问题10)

---

## 五、测试建议

### 5.1 单据流转测试
- [ ] 咨询单 → 报价单 → 委托单 完整流程
- [ ] 报价单 → 合同 → 委托单 完整流程
- [ ] 直接创建委托单流程
- [ ] 审批驳回后的状态回退流程

### 5.2 并发测试
- [ ] 高并发创建报价单（测试编号重复）
- [ ] 高并发创建咨询单（测试编号重复）

### 5.3 权限测试
- [ ] 不同角色用户查看咨询单列表（测试权限过滤）
- [ ] 跨部门数据访问测试

---

## 六、附录

### 检查的文件清单

#### 数据模型
- `prisma/schema.prisma`

#### API 路由
- `src/app/api/consultation/route.ts`
- `src/app/api/consultation/[id]/close/route.ts`
- `src/app/api/quotation/route.ts`
- `src/app/api/quotation/[id]/route.ts`
- `src/app/api/quotation/[id]/create-entrustment/route.ts`
- `src/app/api/contract/route.ts`
- `src/app/api/entrustment/route.ts`
- `src/app/api/entrustment/[id]/route.ts`
- `src/app/api/entrustment/[id]/projects/[projectId]/route.ts`

#### 业务逻辑
- `src/lib/quotation-to-entrustment.ts`
- `src/lib/generate-no.ts`
- `src/lib/approval/engine.ts`
- `src/lib/data-permission.ts` (引用)
