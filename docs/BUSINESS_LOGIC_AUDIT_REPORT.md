# LIMS 业务逻辑审计报告

> 审计日期: 2026-02-21
> 审计人: Claude AI
> 项目: 实验室信息管理系统 (LIMS)
> 审计范围: 业务单据上下游字段传递和数据完整性

---

## 执行摘要

本次业务逻辑审计重点检查了业务单据之间的字段继承和数据传递情况，发现：

- **🔴 严重业务缺陷**: 3 个
- **🟡 中等业务风险**: 5 个
- **🟢 轻微改进建议**: 2 个

**核心问题**：
1. 报价单→委托单转换时，**开票信息未继承**，可能导致财务对账失败
2. 新旧数据结构（v1/v2）共存，导致部分关键字段在转换时**丢失**
3. 委托单自动生成客户报告时，**报告时间字段未传递**

---

## 业务流程图

```
咨询客户 → 咨询单 (Consultation)
    ↓ 生成报价
报价单 (Quotation) →→→ 委托单 (Entrustment)
    ↓                    ↓
合同 (Contract) →→→→→→→→→→↓
                              样品 (Sample) + 检测项目
                                     ↓
                              检测任务 (TestTask)
                                     ↓
                              检测报告 (TestReport)
                                     ↓
                              客户报告 (ClientReport)
```

---

## 🔴 严重业务缺陷

### 1. 开票信息未从报价单/合同继承到委托单

**影响范围**: 报价单 → 委托单、合同 → 委托单
**严重性**: 🔴 高
**位置**:
- `src/lib/quotation-to-entrustment.ts:144-163`
- `src/app/api/entrustment/route.ts:335-374`

**问题分析**:

对比字段定义：

| 字段 | 报价单 | 合同 | 委托单 | 是否继承？ |
|------|--------|------|--------|-----------|
| `invoiceTitle` | ❌ 无 | ❌ 无 | ✅ 有 | ❌ 未继承 |
| `taxId` (税号) | ❌ 无 | `partyATaxId` | ✅ 有 | ⚠️ 字段名不一致 |
| `invoiceAddress` | ❌ 无 | ❌ 无 | ✅ 有 | ❌ 未继承 |
| `invoicePhone` | ❌ 无 | ❌ 无 | ❌ 无 | N/A |
| `invoiceBank` | ❌ 无 | `partyABankName` | ❌ 无 | ❌ 未继承 |
| `invoiceBankAccount` | ❌ 无 | `partyABankAccount` | ❌ 无 | ❌ 未继承 |

**报价单转委托单代码**:
```typescript
// quotation-to-entrustment.ts:144-163
const entrustment = await prisma.entrustment.create({
  data: {
    entrustmentNo,
    quotationId: quotation.id,
    clientId: quotation.clientId,
    contactPerson: params.contactPerson || quotation.clientContactPerson,
    contactPhone: quotation.clientPhone,
    // ❌ 缺少开票信息！
    // invoiceTitle: ???
    // taxId: ???
    // invoiceAddress: ???
    // invoicePhone: ???
    // invoiceBank: ???
    // invoiceBankAccount: ???
  }
})
```

**委托单创建代码**（从合同）:
```typescript
// entrustment/route.ts:302-312
if (data.contractNo && (!inheritedDeadline || !inheritedFollowerId)) {
  const contract = await prisma.contract.findUnique({
    where: { contractNo: data.contractNo },
    select: {
      clientReportDeadline: true,
      followerId: true,
      partyAContact: true,
      partyATel: true,
      partyAEmail: true,
      partyAAddress: true
      // ❌ 缺少开票相关字段！
      // partyATaxId: true,
      // partyABankName: true,
      // partyABankAccount: true,
    }
  })
```

**业务影响**:
1. **财务对账失败**: 委托单缺少开票信息，财务开具发票时需要手动补录
2. **信息不一致**: 客户在报价单/合同提供的开票信息未传递到委托单
3. **重复工作**: 业务人员需要在委托单阶段重新填写开票信息

**修复建议**:

```typescript
// 1. 报价单 Schema 需要添加开票字段（或从 Client 关联获取）
// 2. 报价单转委托单时继承开票信息
const entrustment = await prisma.entrustment.create({
  data: {
    // ... 其他字段
    // ✅ 添加开票信息继承
    invoiceTitle: quotation.client?.invoiceTitle || quotation.client?.name,
    taxId: quotation.client?.creditCode,
    invoiceAddress: quotation.client?.invoiceAddress,
    invoicePhone: quotation.clientPhone, // 使用联系人电话
    invoiceBank: quotation.client?.bankName,
    invoiceBankAccount: quotation.client?.bankAccount,
  }
})

// 3. 合同转委托单时继承开票信息
if (data.contractNo) {
  const contract = await prisma.contract.findUnique({
    where: { contractNo: data.contractNo },
    select: {
      // ... 其他字段
      partyATaxId: true,        // ✅ 添加
      partyABankName: true,     // ✅ 添加
      partyABankAccount: true,  // ✅ 添加
    }
  })

  // 继承到委托单
  data.invoiceTitle = contract.partyACompany
  data.taxId = contract.partyATaxId
  data.invoiceBank = contract.partyABankName
  data.invoiceBankAccount = contract.partyABankAccount
}
```

---

### 2. 报告配置字段未从报价单/合同继承到委托单

**影响范围**: 报价单 → 委托单、合同 → 委托单
**严重性**: 🔴 高
**位置**: 同上

**问题分析**:

| 字段 | 报价单 | 合同 | 委托单 | 是否继承？ |
|------|--------|------|--------|-----------|
| `reportFormat` | ❌ 无 | ❌ 无 | ✅ 有 | ❌ 未继承 |
| `reportLanguage` | ❌ 无 | ❌ 无 | ✅ 有 | ❌ 未继承 |
| `reportCopies` | ❌ 无 | ❌ 无 | ✅ 有 (默认1) | ❌ 未继承 |
| `reportDelivery` | ❌ 无 | ❌ 无 | ✅ 有 | ❌ 未继承 |
| `reportGrouping` | ❌ 无 | ❌ 无 | ✅ 有 | ❌ 未继承 |
| `reportDeliveryAddress` | ❌ 无 | ❌ 无 | ✅ 有 | ❌ 未继承 |
| `clientReportDeadline` | ✅ 有 | ✅ 有 | ✅ 有 | ✅ 已继承 |
| `acceptSubcontract` | ❌ 无 | ❌ 无 | ✅ 有 (默认true) | ❌ 未继承 |
| `serviceScope` | ❌ 无 | ❌ 无 | ✅ 有 | ❌ 未继承 |
| `urgencyLevel` | ❌ 无 | ❌ 无 | ✅ 有 (默认normal) | ❌ 未继承 |
| `testType` | ❌ 无 | ❌ 无 | ✅ 有 | ❌ 未继承 |

**业务影响**:
1. **报告配置丢失**: 客户在报价单/合同阶段的报告需求未传递
2. **默认值不符合客户需求**: 如 `reportCopies` 默认为 1，但客户可能需要多份
3. **后期沟通成本**: 检测完成后需要再次确认报告配置

**修复建议**:

```typescript
// 方案1: 在报价单/合同 Schema 中添加这些字段
// prisma/schema.prisma
model Quotation {
  // ... 现有字段

  // ✅ 新增报告配置字段
  reportFormat        String?   @db.VarChar(50)
  reportLanguage      String?   @db.VarChar(20)
  reportCopies        Int?      @default(1)
  reportDelivery      String?   @db.VarChar(50)
  reportDeliveryAddress String? @db.VarChar(500)
  acceptSubcontract   Boolean?  @default(true)
  serviceScope        String?   @db.VarChar(50)
  urgencyLevel        String?   @db.VarChar(20)
}

// 方案2: 报价单转委托单时继承字段
const entrustment = await prisma.entrustment.create({
  data: {
    // ... 基础字段
    // ✅ 继承报告配置
    reportFormat: quotation.reportFormat,
    reportLanguage: quotation.reportLanguage,
    reportCopies: quotation.reportCopies || 1,
    reportDelivery: quotation.reportDelivery,
    reportDeliveryAddress: quotation.reportDeliveryAddress,
    acceptSubcontract: quotation.acceptSubcontract !== false,
    serviceScope: quotation.serviceScope,
    urgencyLevel: quotation.urgencyLevel || 'normal',
  }
})
```

---

### 3. 客户报告缺少关键业务字段

**影响范围**: 委托单 → 客户报告
**严重性**: 🔴 高
**位置**: `src/lib/generate-client-reports.ts:62-117`

**问题分析**:

**客户报告创建代码**:
```typescript
// generate-client-reports.ts:66-78
const record = await prisma.clientReport.create({
  data: {
    reportNo,
    entrustmentId,
    clientName,
    sampleName: sample.name,
    sampleId: sample.id,
    groupingType: 'by_sample',
    reportCopies,
    status: 'draft',
    // ❌ 缺少大量关键字段！
  }
})
```

**ClientReport Schema 字段对比**:

| 字段 | Schema | 代码中是否创建 | 影响 |
|------|--------|----------------|------|
| `entrustmentId` | ✅ | ✅ | - |
| `projectName` | ✅ | ⚠️ by_project 时创建 | by_sample 时缺失 |
| `clientName` | ✅ | ✅ | - |
| `clientAddress` | ✅ | ❌ | 报告邮寄地址缺失 |
| `sampleNo` | ✅ | ❌ | 样品编号缺失 |
| `sampleName` | ✅ | ✅ | - |
| `specification` | ✅ | ❌ | 规格型号缺失 |
| `sampleQuantity` | ✅ | ❌ | 样品数量缺失 |
| `receivedDate` | ✅ | ❌ | 收样日期缺失 |
| `testItems` | ✅ | ❌ | 检测项目缺失 |
| `testStandards` | ✅ | ❌ | 检测标准缺失 |
| `overallConclusion` | ✅ | ❌ | 检测结论缺失（需检测完成后填写） |
| `preparer` | ✅ | ❌ | 编制人缺失 |
| `reviewer` | ✅ | ❌ | 审核人缺失 |
| `approver` | ✅ | ❌ | 批准人缺失 |
| `reportCopies` | ✅ | ✅ | - |
| `clientReportDeadline` | ✅ | ❌ | **关键！报告截止日期缺失** |

**业务影响**:
1. **报告生成不完整**: 缺少样品编号、检测项目等核心信息
2. **截止日期追踪失效**: `clientReportDeadline` 未传递，无法追踪报告是否按时交付
3. **报告导出失败**: 模板渲染时缺少必要字段

**修复建议**:

```typescript
// generate-client-reports.ts
export async function generateClientReportsForEntrustment(
  params: GenerateClientReportsParams & {
    clientReportDeadline?: Date
    clientAddress?: string
    samples: Array<{
      id: string
      name: string
      sampleNo?: string
      specification?: string
      quantity?: string
      receivedDate?: Date
      testItems?: string
      testStandards?: string
    }>
    projects: Array<{
      id: string
      name: string
      testItems?: string
      method?: string
    }>
  }
): Promise<CreatedReport[]> {
  // ...

  if (reportGrouping === 'by_sample') {
    for (const sample of samples) {
      // ✅ 补充完整字段
      const record = await prisma.clientReport.create({
        data: {
          reportNo,
          entrustmentId,
          clientName,
          clientAddress: params.clientAddress,
          sampleName: sample.name,
          sampleNo: sample.sampleNo,
          specification: sample.specification,
          sampleQuantity: sample.quantity,
          receivedDate: sample.receivedDate,
          testItems: sample.testItems,
          testStandards: sample.testStandards,
          clientReportDeadline: params.clientReportDeadline, // ✅ 关键字段
          sampleId: sample.id,
          groupingType: 'by_sample',
          reportCopies,
          status: 'draft',
        },
      })
    }
  }
}
```

---

## 🟡 中等业务风险

### 4. 新旧数据结构共存导致字段丢失

**影响范围**: 报价单 → 委托单（检测项目传递）
**严重性**: 🟡 中
**位置**: `src/lib/quotation-to-entrustment.ts:264-324`

**问题分析**:

系统中存在两套数据结构：
- **v1 (旧)**: `QuotationItem` + `EntrustmentProject`
- **v2 (新)**: `SampleTestItem` (样品检测项表)

**转换逻辑**:
```typescript
// quotation-to-entrustment.ts:264-276
// v1: 复制检测项目到委托单 (兼容字段)
const projects = await Promise.all(
  quotation.items.map(item =>
    prisma.entrustmentProject.create({
      data: {
        entrustmentId: entrustment.id,
        name: item.sampleName || item.serviceItem,
        testItems: '[]',  // ❌ 空数组！
        method: item.methodStandard
      }
    })
  )
)

// quotation-to-entrustment.ts:281-324
// v2: 复制样品检测项（完整）
if (quotationSampleTestItems.length > 0) {
  await prisma.sampleTestItem.createMany({
    data: quotationSampleTestItems.map((item, index) => ({
      // ✅ 完整字段复制
      testCategory: item.testCategory || 'component',
      testMethod: item.testMethod,
      samplingLocation: item.samplingLocation,
      // ... 其他字段
    }))
  })
}
```

**字段对比**:

| 字段 | QuotationItem | SampleTestItem | EntrustmentProject | 备注 |
|------|---------------|----------------|-------------------|------|
| `sampleName` | ✅ | ✅ | ❌ (使用name) | - |
| `serviceItem` | ✅ | ❌ (testItemName) | ❌ (使用name) | 字段名不一致 |
| `methodStandard` | ✅ | ❌ (testStandard) | ✅ (method) | 字段名不一致 |
| `quantity` | ✅ (String) | ✅ (Int) | ❌ | v1 项目表缺少数量 |
| `testCategory` | ❌ | ✅ | ❌ | v1 完全缺失 |
| `testMethod` | ❌ | ✅ | ❌ | v1 完全缺失 |
| `samplingLocation` | ❌ | ✅ | ❌ | v1 完全缺失 |
| `specimenCount` | ❌ | ✅ | ❌ | v1 完全缺失 |
| `materialName` | ❌ | ✅ | ❌ | v1 完全缺失 |
| `materialCode` | ❌ | ✅ | ❌ | v1 完全缺失 |

**业务影响**:
1. **v1 数据丢失**: 使用旧版报价单创建委托单时，检测项目信息不完整
2. **检测无法执行**: 缺少 `testCategory`、`testMethod` 等关键字段，检测人员无法执行
3. **材料级测试不支持**: v1 结构无法记录材料级测试所需字段

**修复建议**:

```typescript
// 方案1: 强制使用 v2 结构（推荐）
// 报价单创建时必须填写 SampleTestItem

// 方案2: v1 兼容时自动补全默认值
const projects = await Promise.all(
  quotation.items.map(item =>
    prisma.sampleTestItem.create({
      data: {
        bizType: 'entrustment',
        bizId: entrustment.id,
        sampleName: item.sampleName || '',
        testItemName: item.serviceItem || '',
        testStandard: item.methodStandard || '',
        // ✅ 补充默认值
        testCategory: 'component',  // 默认零部件级
        testMethod: '常规检测',      // 默认检测方法
        samplingLocation: '按标准',
        specimenCount: '1',
        quantity: parseInt(String(item.quantity)) || 1,
        sortOrder: index,
      }
    })
  )
)
```

---

### 5. 咨询单字段未完全传递到报价单

**影响范围**: 咨询单 → 报价单
**严重性**: 🟡 中
**位置**: `src/app/api/quotation/route.ts:120-132`

**问题分析**:

**继承代码**:
```typescript
// quotation/route.ts:120-132
const consultation = await prisma.consultation.findUnique({
  where: { consultationNo },
  select: {
    clientReportDeadline: true,
    followerId: true,
    clientPhone: true,
    clientEmail: true,
    clientAddress: true
    // ❌ 缺少以下字段：
    // testItems: true,      // 检测项目列表
    // clientRequirement: true, // 客户需求说明
    // attachments: true,    // 附件
    // budgetRange: true,    // 预算范围
  }
})
```

**字段对比**:

| 字段 | 咨询单 | 报价单 | 是否继承？ | 影响 |
|------|--------|--------|-----------|------|
| `testItems` | ✅ (JSON) | ❌ (items) | ❌ | 检测项目需重新录入 |
| `clientRequirement` | ✅ | `clientRemark` | ❌ | 客户需求丢失 |
| `attachments` | ✅ | ❌ | ❌ | 附件信息丢失 |
| `budgetRange` | ✅ | ❌ | ❌ | 预算信息丢失 |
| `clientReportDeadline` | ✅ | ✅ | ✅ | 已继承 |
| `followerId` | ✅ | ✅ | ✅ | 已继承 |
| `clientPhone` | ✅ | ✅ | ✅ | 已继承 |
| `clientEmail` | ✅ | ✅ | ✅ | 已继承 |
| `clientAddress` | ✅ | ✅ | ✅ | 已继承 |

**业务影响**:
1. **重复工作**: 检测项目需要在报价单阶段重新录入
2. **信息丢失**: 客户的特殊需求和附件未传递
3. **预算参考缺失**: 报价时无法参考客户的预算范围

**修复建议**:

```typescript
// quotation/route.ts
const consultation = await prisma.consultation.findUnique({
  where: { consultationNo },
  select: {
    clientReportDeadline: true,
    followerId: true,
    clientPhone: true,
    clientEmail: true,
    clientAddress: true,
    // ✅ 添加字段
    testItems: true,
    clientRequirement: true,
    attachments: true,
    budgetRange: true,
  }
})

// 继承到报价单
const createData = {
  // ... 其他字段
  clientRemark: data.clientRemark || consultation?.clientRequirement,
  // attachments: consultation?.attachments, // 如果报价单支持附件
}

// 如果咨询单有检测项目，自动创建报价明细
if (consultation?.testItems && (!data.items || data.items.length === 0)) {
  const testItems = JSON.parse(consultation.testItems)
  const items = testItems.map((item: any, idx: number) => ({
    sampleName: item.sampleName || '',
    serviceItem: item.testItem || item.name,
    methodStandard: item.standard || '',
    quantity: '1',
    unitPrice: 0, // 需要业务人员填写
    sort: idx,
  }))
  // ... 使用 items 创建报价单明细
}
```

---

### 6. 合同金额未传递到委托单

**影响范围**: 合同 → 委托单
**严重性**: 🟡 中
**位置**: `src/app/api/entrustment/route.ts:302-312`

**问题分析**:

**合同字段**:
```prisma
model Contract {
  contractAmount Decimal?  @db.Decimal(12, 2)  // ✅ 合同金额
}
```

**委托单字段**:
```prisma
model Entrustment {
  // ❌ 没有合同金额字段
}
```

**业务影响**:
1. **财务对账困难**: 委托单执行时无法关联合同金额
2. **进度款计算缺失**: 无法根据合同金额和进度计算应收款项
3. **成本分析困难**: 无法对比合同金额与实际成本

**修复建议**:

```prisma
// prisma/schema.prisma
model Entrustment {
  // ... 现有字段

  // ✅ 新增字段
  contractAmount Decimal? @db.Decimal(12, 2)  // 关联合同金额
  quotationAmount Decimal? @db.Decimal(12, 2)  // 关联报价金额
}

// 继承逻辑
if (data.contractNo) {
  const contract = await prisma.contract.findUnique({
    where: { contractNo: data.contractNo },
    select: {
      contractAmount: true,
      // ... 其他字段
    }
  })

  // 创建委托单时继承
  data.contractAmount = contract?.contractAmount
}
```

---

### 7. 检测项目标准字段未填充

**影响范围**: 报价单/委托单创建
**严重性**: 🟡 中
**位置**: `src/app/api/quotation/route.ts:186-196`

**问题分析**:

**报价明细创建代码**:
```typescript
items: {
  create: items.map((item: any, idx: number) => ({
    sampleName: item.sampleName || '',
    serviceItem: item.serviceItem || '',
    methodStandard: item.methodStandard || '',
    quantity: String(item.quantity || '1'),
    unitPrice: Number(item.unitPrice) || 0,
    totalPrice: (parseFloat(String(item.quantity)) || 1) * (Number(item.unitPrice) || 0),
    remark: item.remark || null,
    sort: idx,
  })),
}
```

**字段完整性分析**:

| 字段 | 用途 | 是否必填 | 默认值处理 | 影响 |
|------|------|----------|-----------|------|
| `sampleName` | 样品名称 | ⚠️ 业务必填 | `''` | 可能为空导致检测错误 |
| `serviceItem` | 检测项目 | ⚠️ 业务必填 | `''` | 可能为空导致检测错误 |
| `methodStandard` | 检测标准 | ⚠️ 业务必填 | `''` | 可能为空导致检测错误 |
| `quantity` | 数量 | ⚠️ 业务必填 | `'1'` | ✅ 有默认值 |
| `unitPrice` | 单价 | ⚠️ 业务必填 | `0` | ⚠️ 0元可能导致计算错误 |
| `totalPrice` | 总价 | 自动计算 | 自动 | ✅ 自动计算 |
| `remark` | 备注 | 可选 | `null` | ✅ 可选 |

**业务影响**:
1. **报价错误**: 关键字段为空时，报价单总价可能为0
2. **检测无法执行**: 检测项目和标准为空时，检测人员不知道要测什么
3. **财务风险**: 单价为0时，可能导致免费服务

**修复建议**:

```typescript
// 1. 前端/后端双重验证
const validateQuotationItems = (items: any[]) => {
  for (const item of items) {
    if (!item.sampleName) throw new Error('样品名称不能为空')
    if (!item.serviceItem) throw new Error('检测项目不能为空')
    if (!item.methodStandard) throw new Error('检测标准不能为空')
    if (!item.unitPrice || item.unitPrice <= 0) {
      throw new Error(`"${item.sampleName}" 的单价必须大于0`)
    }
  }
}

// 2. 创建前验证
const items = data.items || []
validateQuotationItems(items)

// 3. 更严格的默认值
items: {
  create: items.map((item: any, idx: number) => ({
    sampleName: item.sampleName, // ❌ 移除默认空字符串
    serviceItem: item.serviceItem, // ❌ 移除默认空字符串
    methodStandard: item.methodStandard, // ❌ 移除默认空字符串
    quantity: String(item.quantity || '1'),
    unitPrice: Number(item.unitPrice) || 0, // ⚠️ 保持0，但验证会拦截
    totalPrice: (parseFloat(String(item.quantity)) || 1) * (Number(item.unitPrice) || 0),
    remark: item.remark || null,
    sort: idx,
  })),
}
```

---

### 8. 委托单状态流转不完整

**影响范围**: 委托单生命周期管理
**严重性**: 🟡 中
**位置**: `src/app/api/entrustment/route.ts`

**问题分析**:

**委托单状态定义**:
```typescript
status: 'pending' | 'accepted' | 'testing' | 'completed'
```

**状态流转代码**:
```typescript
// 创建委托单
status: data.status || 'pending',  // ✅ 默认 pending

// ❌ 缺少状态更新逻辑：
// 1. 接受委托 (pending → accepted)
// 2. 开始检测 (accepted → testing)
// 3. 完成检测 (testing → completed)
```

**业务影响**:
1. **状态追踪失效**: 无法追踪委托单的执行进度
2. **流程控制缺失**: 无法根据状态控制操作权限
3. **报表统计困难**: 无法统计各状态的委托单数量

**修复建议**:

```typescript
// 添加状态流转 API
// src/app/api/entrustment/[id]/status/route.ts
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { status, action } = await request.json()

  const entrustment = await prisma.entrustment.findUnique({
    where: { id }
  })

  // 状态流转规则
  const STATE_FLOW = {
    pending: ['accepted', 'cancelled'],
    accepted: ['testing', 'cancelled'],
    testing: ['completed', 'cancelled'],
    completed: [],  // 终态
    cancelled: [],   // 终态
  }

  const allowedTransitions = STATE_FLOW[entrustment.status]
  if (!allowedTransitions.includes(status)) {
    throw new Error(
      `不允许从 ${entrustment.status} 转换到 ${status}`
    )
  }

  // 更新状态
  await prisma.entrustment.update({
    where: { id },
    data: { status }
  })

  return success({ message: '状态更新成功' })
}
```

---

## 🟢 轻微改进建议

### 9. 编号生成规则不统一

**影响范围**: 所有单据编号
**严重性**: 🟢 低
**位置**: `src/lib/generate-no.ts`

**问题分析**:

| 单据类型 | 编号格式 | 代码实现 |
|----------|----------|----------|
| 咨询单 | ZX + YYYYMMDD + NNNN | ✅ 统一 |
| 报价单 | BJ + YYYYMMDD + NNNN | ⚠️ 部分API不一致 |
| 合同 | HT + YYYYMMDD + NNNN | ✅ 统一 |
| 委托单 | WT + YYYYMMDD + NNNN | ⚠️ 部分API不一致 |
| 样品 | S + YYYYMMDD + NNNN | ✅ 统一 |
| 检测任务 | T + YYYYMMDD + NNNN | ✅ 统一 |
| 客户报告 | RPT + YYYYMMDD + NNNN | ✅ 统一 |

**不一致示例**:
```typescript
// quotation/route.ts:134-138 (手动生成)
const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
const count = await prisma.quotation.count({
  where: { quotationNo: { startsWith: `BJ${today}` } }
})
const quotationNo = `BJ${today}${String(count + 1).padStart(4, '0')}`

// vs generate-no.ts (统一函数)
const quotationNo = await generateNo(NumberPrefixes.QUOTATION)
```

**修复建议**: 统一使用 `generateNo()` 函数

---

### 10. 缺少单据关联审计日志

**影响范围**: 所有单据操作
**严重性**: 🟢 低
**位置**: 全局

**建议**:

```typescript
// 添加审计日志
import { auditLogger } from '@/lib/audit-logger'

// 创建单据时
await auditLogger.log('quotation_created', {
  quotationNo,
  clientId,
  amount: subtotal,
  createdBy: user.id,
})

// 状态变更时
await auditLogger.log('quotation_status_changed', {
  quotationNo,
  oldStatus: existing.status,
  newStatus: data.status,
  changedBy: user.id,
})

// 关联创建时
await auditLogger.log('entrustment_created_from_quotation', {
  quotationNo,
  entrustmentNo,
  createdBy: user.id,
})
```

---

## 修复优先级

| 优先级 | 问题 | 预计工时 | 业务影响 |
|--------|------|----------|----------|
| **P0** | #1 开票信息未继承 | 4 小时 | 财务对账失败 |
| **P0** | #3 客户报告字段缺失 | 3 小时 | 报告生成不完整 |
| **P1** | #2 报告配置未继承 | 3 小时 | 需求丢失 |
| **P1** | #4 新旧数据结构共存 | 8 小时 | 检测无法执行 |
| **P1** | #5 咨询单字段未传递 | 2 小时 | 重复工作 |
| **P2** | #6 合同金额未传递 | 2 小时 | 成本分析困难 |
| **P2** | #7 检测项目未验证 | 2 小时 | 报价错误 |
| **P2** | #8 状态流转不完整 | 4 小时 | 流程追踪失效 |
| **P3** | #9 编号生成不统一 | 1 小时 | 代码混乱 |
| **P3** | #10 审计日志缺失 | 4 小时 | 可追溯性差 |

**总计**: 约 33 小时

---

## 业务流程完整性检查清单

### 咨询单 → 报价单

- [x] 基础信息继承 (客户、联系人)
- [x] 报告截止日期继承
- [x] 跟进人继承
- [❌] 检测项目继承 → **需修复**
- [❌] 客户需求说明继承 → **需修复**
- [❌] 附件信息继承 → **需修复**
- [❌] 预算范围继承 → **需修复**

### 报价单 → 合同

- [x] 基础信息继承
- [x] 报价单关联
- [x] 报价明细转换为合同明细
- [❌] 报告配置未传递到合同 → **需改进**

### 报价单 → 委托单

- [x] 基础信息继承
- [x] 客户信息继承
- [x] 报告截止日期继承
- [x] 跟进人继承
- [x] 检测项目复制 (v1/v2)
- [❌] 开票信息继承 → **需修复**
- [❌] 报告配置继承 → **需修复**
- [❌] 合同金额继承 → **需修复**

### 合同 → 委托单

- [x] 基础信息继承
- [x] 客户信息继承 (partyA → contact)
- [x] 报告截止日期继承
- [x] 跟进人继承
- [❌] 开票信息继承 (partyATaxId → taxId) → **需修复**
- [❌] 合同金额继承 → **需修复**

### 委托单 → 客户报告

- [x] 委托单关联
- [x] 客户名称复制
- [x] 样品名称复制
- [x] 项目名称复制 (by_project)
- [x] 报告编号生成
- [❌] 报告截止日期复制 → **需修复**
- [❌] 客户地址复制 → **需修复**
- [❌] 样品编号复制 → **需修复**
- [❌] 检测项目复制 → **需修复**
- [❌] 检测标准复制 → **需修复**

---

## 附录

### A. 单据字段对照表

详见 `docs/ENTITY_MAPPING.md` (需生成)

### B. 状态流转图

```
咨询单: following → assessing → assessment_passed/failed → quoted → closed
报价单: draft → pending_sales → pending_finance → pending_lab → approved → entrusted/archived
合同: draft → submitted → approved → signed → executing → completed/terminated
委托单: pending → accepted → testing → completed
样品: pending → received → testing → completed
检测任务: pending → assigned/subcontracted → testing → completed
客户报告: draft → pending_review → pending_approve → approved → issued/voided
```

### C. 数据结构演进历史

- **v1 (2025-01)**: 基于 `QuotationItem` + `EntrustmentProject`
- **v2 (2025-02)**: 引入 `SampleTestItem` 统一表格
- **当前状态**: v1/v2 共存，存在兼容性问题

---

**报告生成时间**: 2026-02-21
**下次审计建议**: 3个月后或重大版本更新时
