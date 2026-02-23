# 设备管理·耗材管理·外包管理·财务管理·体系文件 — Bug 评估报告

> 生成时间：2026-02-23 | 仅分析不修改代码

---

## 一、设备管理

### 🔴 BUG-D01：维修记录 API 无认证

**文件**：[maintenance/route.ts](file:///Users/wangpeng/Downloads/limsnext/src/app/api/device/maintenance/route.ts#L4-L5)

```diff
- export async function GET(request: NextRequest) {
+ export const GET = withAuth(async (request: NextRequest, user) => {
```

`GET` 和 `POST` 均使用裸 `export async function`，无 `withAuth` 包装。任何未登录用户都可以查看和创建维修记录。

对比同模块的 [repair/route.ts](file:///Users/wangpeng/Downloads/limsnext/src/app/api/device/repair/route.ts) 使用了 `withErrorHandler`（有错误处理但仍无认证），[maintenance-plan/route.ts](file:///Users/wangpeng/Downloads/limsnext/src/app/api/device/maintenance-plan/route.ts) 使用 `withErrorHandler`。

**影响**：安全漏洞，维修记录可被匿名访问和篡改。

---

### 🔴 BUG-D02：设备更新 PUT 直接传入 `data`，无字段过滤

**文件**：[device/[id]/route.ts:29](file:///Users/wangpeng/Downloads/limsnext/src/app/api/device/%5Bid%5D/route.ts#L29)

```typescript
const device = await prisma.device.update({ where: { id }, data })
// ❌ 前端可以传任意字段，包括 deviceNo、createdAt 等不应被修改的字段
```

**影响**：可篡改设备编号等关键字段。

---

### 🟡 BUG-D03：设备编号用 `SB` 前缀，未使用统一的 `generate-no`

**文件**：[device/route.ts:26-30](file:///Users/wangpeng/Downloads/limsnext/src/app/api/device/route.ts#L26-L30)

```typescript
const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
const count = await prisma.device.count({
  where: { deviceNo: { startsWith: `SB${today}` } }
})
const deviceNo = `SB${today}${String(count + 1).padStart(4, '0')}`
```

- 前缀 `SB` 未在 `generate-no.ts` 的 `NumberPrefixes` 中定义
- 使用 count 方式生成编号，高并发下可能重复
- 维修记录编号也是手动拼接 `RX`，不统一

---

### 🟡 BUG-D04：维修 POST 创建后设备状态改为 'Maintenance'，但没有恢复机制

**文件**：[repair/route.ts:128-131](file:///Users/wangpeng/Downloads/limsnext/src/app/api/device/repair/route.ts#L128-L131)

```typescript
await prisma.device.update({
  where: { id: data.deviceId },
  data: { status: 'Maintenance' },
})
```

维修完成后（状态从 `pending` → `completed`）缺少将设备状态恢复为 `Active` 的逻辑。

---

### 🟡 BUG-D05：保养计划和定检计划 POST 无认证

**文件**：
- [maintenance-plan/route.ts](file:///Users/wangpeng/Downloads/limsnext/src/app/api/device/maintenance-plan/route.ts) — `withErrorHandler`（无认证）
- [calibration-plan/route.ts](file:///Users/wangpeng/Downloads/limsnext/src/app/api/device/calibration-plan/route.ts) — `withErrorHandler`（无认证）

使用 `withErrorHandler` 而非 `withAuth`，有错误处理但无认证。

---

## 二、耗材管理

### 🟢 整体较规范，无严重问题

- ✅ 使用 `withAuth` + `validateRequired`
- ✅ 字段白名单更新（PUT）
- ✅ 删除前检查关联数据
- ✅ Decimal 类型正确转换为 Number

### 🟡 BUG-C01：出入库 API 缺失

当前仅有耗材信息的 CRUD，**没有出入库事务 API**（`consumableTransaction`）。耗材 `stockQuantity` 字段在 `PUT` 中可以直接修改，但没有通过出入库流水来记录变动历史。

---

## 三、外包管理

### 🟡 BUG-O01：委外订单 `[id]` 路由无认证

**文件**：[outsource-order/[id]/route.ts](file:///Users/wangpeng/Downloads/limsnext/src/app/api/outsource-order/%5Bid%5D/route.ts)

`GET`/`PUT`/`DELETE` 均使用 `withErrorHandler` 而非 `withAuth`，无认证。

---

### 🟡 BUG-O02：供应商更新 `data` 直传

**文件**：[supplier/[id]/route.ts:29](file:///Users/wangpeng/Downloads/limsnext/src/app/api/supplier/%5Bid%5D/route.ts#L29)

```typescript
const supplier = await prisma.supplier.update({ where: { id }, data })
```

与设备管理同样的问题，前端可传入任意字段。

---

### 🟡 BUG-O03：`filter=my` 会覆盖数据权限过滤

**文件**：[outsource-order/route.ts:35-41](file:///Users/wangpeng/Downloads/limsnext/src/app/api/outsource-order/route.ts#L35-L41)

```typescript
if (filter === 'my') {
  where.task = {           // ❌ 覆盖了第 22 行设置的 where.task
    project: {
      subcontractAssignee: user.id
    }
  }
}
```

当 `filter=my` 时，第 22 行通过权限过滤设置的 `where.task = permissionFilter` 被完全覆盖，权限过滤失效。

---

### 🟢 BUG-O04：委外订单删除无状态检查

进行中或已完成的订单不应该被删除，但 DELETE 只检查是否存在，不检查状态。

---

## 四、财务管理

### 🔴 BUG-F01：应收款、发票详情 API 完全无认证

**文件**：
- [receivable/[id]/route.ts](file:///Users/wangpeng/Downloads/limsnext/src/app/api/finance/receivable/%5Bid%5D/route.ts) — 裸 `export async function`
- [invoice/[id]/route.ts](file:///Users/wangpeng/Downloads/limsnext/src/app/api/finance/invoice/%5Bid%5D/route.ts) — 裸 `export async function`

这两个文件的 `GET`、`PUT`、`DELETE` 均无任何认证检查。财务数据可被匿名查看、修改、删除。

---

### 🔴 BUG-F02：应收款 PUT 直接传入 `data`

**文件**：[receivable/[id]/route.ts:19](file:///Users/wangpeng/Downloads/limsnext/src/app/api/finance/receivable/%5Bid%5D/route.ts#L19)

```typescript
const receivable = await prisma.financeReceivable.update({ where: { id }, data })
```

- 无认证
- 无字段过滤
- 可直接修改 `receivableNo`、`amount` 等关键财务字段

**影响**：严重安全漏洞，财务金额可被篡改。

---

### 🔴 BUG-F03：发票删除不清理关联应收款

**文件**：[invoice/[id]/route.ts:142-149](file:///Users/wangpeng/Downloads/limsnext/src/app/api/finance/invoice/%5Bid%5D/route.ts#L142-L149)

```typescript
export async function DELETE(request, { params }) {
  const { id } = await params
  await prisma.financeInvoice.delete({ where: { id } })
  // ❌ 没有删除或处理关联的应收款记录
  // ❌ 没有检查发票状态（已开票不应删除）
  // ❌ 没有认证检查
}
```

删除发票后，关联的 `FinanceReceivable` 记录变成孤儿数据，金额不平衡。

---

### 🟡 BUG-F04：应收款删除不检查是否有收款记录

直接删除应收款会导致已有的 `FinancePayment` 记录外键约束失败。

---

### 🟡 BUG-F05：收款记录 `payment/[id]` 无认证

**文件**：[payment/[id]/route.ts](file:///Users/wangpeng/Downloads/limsnext/src/app/api/finance/payment/%5Bid%5D/route.ts) — 使用 `withErrorHandler` 而非 `withAuth`

---

## 五、体系文件

### 🟢 总体较规范

- ✅ 使用 `withAuth` 认证
- ✅ 创建时有标题验证
- ✅ 更新时有字段白名单

### 🟡 BUG-S01：删除无状态检查

`DELETE` 直接删除，没有检查文件是否已发布，已发布的体系文件不应被随意删除。

---

## 六、跨模块通病汇总

| 问题模式 | 涉及模块 | 严重性 |
|----------|----------|--------|
| **无认证 API**（裸 export function） | 设备维修、财务应收/发票详情 | 🔴 高 |
| **`withErrorHandler` 替代 `withAuth`** | 设备保养/定检/维修、外包订单详情、收款详情 | 🟡 中 |
| **PUT `data` 直传无字段过滤** | 设备、供应商、应收款 | 🔴 高 |
| **DELETE 不检查状态** | 发票、外包订单、体系文件 | 🟡 中 |
| **DELETE 不清理关联数据** | 发票（不清理应收款） | 🔴 高 |
| **编号生成不统一** | 设备（SB）、维修（RX） | 🟢 低 |

---

## 七、修复优先级建议

| 优先级 | Bug | 原因 |
|--------|-----|------|
| P0 | F01/F02 | 财务 API 无认证 + data 直传，资金数据可被匿名篡改 |
| P0 | F03 | 发票删除不清理应收款，财务数据不平衡 |
| P1 | D01 | 维修记录 API 无认证 |
| P1 | D02 | 设备更新 data 直传 |
| P1 | O01 | 委外订单无认证 |
| P2 | D04 | 维修完成不恢复设备状态 |
| P2 | O03 | filter=my 覆盖权限过滤 |
| P2 | F04/F05 | 应收款删除/收款详情安全性 |
| P3 | D03/D05/C01/O04/S01 | 编号统一、缺失模块、状态检查等 |

---

*报告由代码审计自动生成，仅供开发参考*
