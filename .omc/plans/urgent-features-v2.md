# LIMS 紧急功能开发工作计划

> 版本: 2.0 | 日期: 2026-02-05
> 时间线: 紧急 - 本周内完成

---

## 一、项目概述

### 原始需求

本次开发涉及 4 个紧急需求模块：
1. **需求1 - 发票管理增强**：发票关联委托单、金额自动同步、回款日期必填
2. **需求2 - 检测标准树形管理**：两层树结构 + 右侧检测项目表格
3. **需求8 - 任务报告生成增强**：富文本编辑器、任意状态可编辑
4. **需求9 - 客户报告生成增强**：首尾页图片上传、手动排序、PDF/Word导出、生成记录

### 访谈摘要

| 需求 | 关键确认 |
|------|----------|
| 需求1 | 1张发票:1个委托单，委托单金额变更自动更新发票，回款日期必填 |
| 需求2 | 2层树：一级分类→具体标准项，支持动态增删改，右侧表格支持检测项目CRUD |
| 需求8 | 任意状态可编辑，使用富文本编辑器，生成后仍可编辑 |
| 需求9 | 首页尾页支持上传图片+文字，手动拖拽排序任务报告，PDF+Word两种导出格式，保存生成记录可查看历史 |

---

## 二、数据模型设计 (Prisma Schema)

### 2.1 发票管理增强 (FinanceInvoice)

```prisma
// 修改现有 FinanceInvoice 模型
model FinanceInvoice {
 id  String   @id @default(cuid())
 invoiceNo String  @unique @db.VarChar(50)

 // 关联委托单 (1:1) - 已存在 entrustmentId
 entrustmentId String?  @db.VarChar(50) @unique // 添加 unique 约束
 entrustment Entrustment? @relation(fields: [entrustmentId], references: [id])

 // 新增: 回款日期（必填）
 paymentDate DateTime // 回款日期 - 必填

 // ... 其他字段保持不变
}
```

**变更说明：**
- `entrustmentId` 添加 `@unique` 约束，确保一张发票只能关联一个委托单
- 新增 `paymentDate` 字段（回款日期），设为必填

### 2.2 检测标准分类 (InspectionStandardCategory) - 新增

```prisma
// 新增：检测标准分类（一级分类）
model InspectionStandardCategory {
 id  String @id @default(cuid())
 name  String @db.VarChar(100) // 分类名称：企业标准、奇瑞汽车标准等
 code   String? @unique @db.VarChar(50) // 分类编码
 description String? @db.Text
 sort  Int  @default(0)
 status  Int @default(1)
 createdAt  DateTime @default(now())
 updatedAt  DateTime @updatedAt

 // 关联标准项
 standards InspectionStandard[]

 @@map("biz_inspection_standard_category")
}

// 修改现有 InspectionStandard，添加分类关联
model InspectionStandard {
 id  String @id @default(cuid())
 standardNo String @unique @db.VarChar(100)
 name  String @db.VarChar(500)
 description String? @db.Text
 validity  String @default("valid")

 // 新增：关联分类
 categoryId String?
 category InspectionStandardCategory? @relation(fields: [categoryId], references: [id])

 createdAt DateTime @default(now())
 updatedAt DateTime @updatedAt

 capabilities PersonnelCapability[]

 @@index([categoryId])
 @@map("biz_inspection_standard")
}

// 新增：检测项目表（关联到具体标准）
model InspectionItem {
 id String @id @default(cuid())
 standardId  String
  standard  InspectionStandard @relation(fields: [standardId], references: [id], onDelete: Cascade)

 name  String @db.VarChar(200) // 检测项目名称
 method   String? @db.VarChar(200)  // 检测方法
 unit  String? @db.VarChar(50) // 单位
 requirement String? @db.Text    // 技术要求
 remark  String? @db.Text
  sort  Int  @default(0)
 status  Int   @default(1)
 createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

 @@index([standardId])
 @@map("biz_inspection_item")
}
```

### 2.3 任务报告增强 (TestReport)

```prisma
// 修改现有 TestReport 模型
model TestReport {
 // ... 现有字段 ...

 // 新增：富文本内容字段
 richContent String?  @db.LongText // 富文本报告内容（HTML格式）

 // 新增：最后编辑信息
 lastEditedAt DateTime?
  lastEditedBy  String? @db.VarChar(50)

 // ... 其他字段 ...
}
```

### 2.4 客户报告增强 (ClientReport)

```prisma
// 修改现有 ClientReport 模型
model ClientReport {
 // ... 现有字段 ...

  // 新增：首页配置
 coverImage  String? @db.VarChar(500) // 首页图片URL
 coverText  String? @db.Text  // 首页文字内容

 // 新增：尾页配置
  backCoverImage String? @db.VarChar(500) // 尾页图片URL
 backCoverText  String? @db.Text // 尾页文字内容（替代原backCoverData）

 // 新增：任务报告排序
 taskReportOrder String? @db.Text  // JSON数组，任务报告ID的排序

 // ... 其他字段 ...
}

// 新增：客户报告生成记录
model ClientReportHistory {
 id    String @id @default(cuid())
 clientReportId String
  clientReport  ClientReport @relation(fields: [clientReportId], references: [id], onDelete: Cascade)

 version  Int @default(1) // 版本号
 generatedAt DateTime @default(now()) // 生成时间
 generatedBy String @db.VarChar(50) // 生成人

 // 快照数据
  snapshotData String @db.LongText   // JSON: 生成时的完整数据快照
 exportFormat String? @db.VarChar(20) // pdf/word/both
  fileUrl  String? @db.VarChar(500) // 导出文件URL

 remark   String? @db.Text
 createdAt  DateTime @default(now())

 @@index([clientReportId])
 @@map("biz_client_report_history")
}
```

---

## 三、API 接口设计

### 3.1 发票管理 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/finance/invoice` | 获取发票列表（新增委托单关联信息） |
| POST | `/api/finance/invoice` | 创建发票（校验entrustmentId唯一性，paymentDate必填） |
| PUT | `/api/finance/invoice/[id]` | 更新发票 |
| GET | `/api/finance/invoice/available-entrustments` | 获取可关联的委托单列表（未被其他发票关联的） |

**关键逻辑：**
```typescript
// POST /api/finance/invoice
// 1. 校验 entrustmentId 唯一性
const existing = await prisma.financeInvoice.findFirst({
 where: { entrustmentId }
})
if (existing) throw new Error('该委托单已关联发票')

// 2. 校验 paymentDate 必填
if (!paymentDate) throw new Error('回款日期为必填项')

// 委托单金额变更时自动更新发票
// 在 Entrustment 更新 API 中添加触发器逻辑
```

### 3.2 检测标准分类 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/inspection-standard-category` | 获取分类列表 |
| POST | `/api/inspection-standard-category` | 创建分类 |
| PUT | `/api/inspection-standard-category/[id]` | 更新分类 |
| DELETE | `/api/inspection-standard-category/[id]` | 删除分类 |
| GET | `/api/inspection-standard-category/tree` | 获取树形结构（分类+标准） |

### 3.3 检测项目 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/inspection-item?standardId=xxx` | 获取某标准下的检测项目 |
| POST | `/api/inspection-item` | 创建检测项目 |
| PUT | `/api/inspection-item/[id]` | 更新检测项目 |
| DELETE | `/api/inspection-item/[id]` | 删除检测项目 |

### 3.4 任务报告 API 增强

| 方法 | 路径 | 说明 |
|------|------|------|
| PUT | `/api/test-report/[id]` | 更新报告（支持任意状态编辑） |
| PUT | `/api/test-report/[id]/content` | 更新富文本内容 |

**关键逻辑：**
```typescript
// PUT /api/test-report/[id]
// 移除状态检查，允许任意状态编辑
// 记录最后编辑信息
await prisma.testReport.update({
 where: { id },
 data: {
 ...data,
  lastEditedAt: new Date(),
 lastEditedBy: user.name
 }
})
```

### 3.5 客户报告 API 增强

| 方法 | 路径 | 说明 |
|------|------|------|
| PUT | `/api/client-report/[id]` | 更新报告（含首尾页配置、任务排序） |
| POST | `/api/client-report/[id]/export` | 导出报告（PDF/Word） |
| GET | `/api/client-report/[id]/history` | 获取生成历史记录 |
| POST | `/api/client-report/[id]/history` | 保存生成记录 |

**导出逻辑：**
```typescript
// POST /api/client-report/[id]/export
// body: { format: 'pdf' | 'word' | 'both' }

// 1. 使用 puppeteer 生成 PDF
// 2. 使用 docx 库生成 Word
// 3. 保存到存储（阿里云 OSS）
// 4. 创建历史记录
```

---

## 四、前端页面改动

### 4.1 发票管理页面 (`/finance/invoice/page.tsx`)

**改动内容：**
1. 表格新增列：委托单号、委托单金额、回款日期
2. 新增/编辑弹窗：
 - 新增委托单选择下拉框（只显示未关联的委托单）
 - 新增回款日期选择器（必填）
3. 选择委托单后自动填充金额

**新增组件：**
- `EntrustmentSelector` - 委托单选择器组件

### 4.2 检测标准页面 (`/basic-data/inspection-standards/page.tsx`)

**改动内容：完全重构**

**布局：**
```
┌──────────────────────────────────────────────────────────────┐
│ 检查标准/依据管理 [新增分类] │
├──────────────────┬───────────────────────────────────────────┤
│  │    │
│ 🔽 企业标准  │ 当前分类: 企业标准 > GB/T 228.1-2021 │
│ ├─ GB/T 228 │ ┌─────────────────────────────────────┐ │
│ └─ GB/T 229 │ │ [新增标准] [新增检测项目] │ │
│ 🔽 奇瑞汽车标准 │ ├─────────────────────────────────────┤ │
│ ├─ Q/CQ xxx │ │ 检测项目列表（Table）  │ │
│ └─ ...  │ │ - 项目名称 | 方法 | 单位 | 要求 | 操作│ │
│  │ └─────────────────────────────────────┘ │
│ [+新增分类] │   │
└──────────────────┴───────────────────────────────────────────┘
```

**新增组件：**
- `StandardCategoryTree` - 左侧树形分类组件
- `StandardItemTable` - 右侧检测项目表格组件
- `CategoryModal` - 分类新增/编辑弹窗
- `StandardModal` - 标准新增/编辑弹窗
- `InspectionItemModal` - 检测项目新增/编辑弹窗

### 4.3 任务报告详情页 (`/report/task/[id]/page.tsx`)

**改动内容：**
1. 添加"编辑"按钮（所有状态可见）
2. 集成富文本编辑器（推荐使用 `@wangeditor/editor-for-react`）
3. 检测结论区域改为富文本展示/编辑

**新增组件：**
- `RichTextEditor` - 富文本编辑器组件

### 4.4 客户报告生成页 (`/report/client-generate/page.tsx`)

**改动内容：**
1. 生成弹窗新增：
  - 首页图片上传
 - 首页文字输入
 - 尾页图片上传
 - 尾页文字输入
2. 任务报告选择改为可拖拽排序列表
3. 新增导出格式选择（PDF/Word/两者）
4. 列表新增"查看历史"按钮

**新增组件：**
- `ImageUpload` - 图片上传组件
- `DraggableTaskList` - 可拖拽排序的任务报告列表
- `ReportHistoryModal` - 生成历史查看弹窗

### 4.5 客户报告详情页 (`/report/client/[id]/page.tsx`)

**改动内容：**
1. 封面页显示上传的图片
2. 封底页显示上传的图片
3. 任务报告按排序顺序显示
4. 新增"导出PDF"、"导出Word"按钮
5. 新增"查看历史版本"按钮

---

## 五、实现步骤与优先级

### 第一天（Day 1）- 数据模型与基础 API

| 序号 | 任务 | 优先级 | 预估时间 |
|------|------|--------|----------|
| 1.1 | 更新 Prisma Schema（所有新增/修改的模型） | P0 | 1h |
| 1.2 | 运行 `prisma db push` 同步数据库 | P0 | 10min |
| 1.3 | 发票管理 API 增强（关联委托单、回款日期校验） | P0 | 2h |
| 1.4 | 检测标准分类 CRUD API | P0 | 2h |
| 1.5 | 检测项目 CRUD API | P0 | 1.5h |

### 第二天（Day 2）- 发票与检测标准前端

| 序号 | 任务 | 优先级 | 预估时间 |
|------|------|--------|----------|
| 2.1 | 发票管理页面增强（委托单选择、回款日期） | P0 | 3h |
| 2.2 | 检测标准页面重构（左右布局、树形组件） | P0 | 4h |

### 第三天（Day 3）- 任务报告富文本编辑

| 序号 | 任务 | 优先级 | 预估时间 |
|------|------|--------|----------|
| 3.1 | 安装并配置富文本编辑器 `@wangeditor/editor-for-react` | P0 | 1h |
| 3.2 | 创建 RichTextEditor 组件 | P0 | 2h |
| 3.3 | 任务报告 API 增强（任意状态可编辑） | P0 | 1h |
| 3.4 | 任务报告详情页集成富文本编辑 | P0 | 3h |

### 第四天（Day 4）- 客户报告增强

| 序号 | 任务 | 优先级 | 预估时间 |
|------|------|--------|----------|
| 4.1 | 客户报告 API 增强（首尾页配置、排序、历史记录） | P0 | 3h |
| 4.2 | 图片上传组件开发 | P0 | 1.5h |
| 4.3 | 可拖拽排序组件开发 | P0 | 1.5h |
| 4.4 | 客户报告生成页增强 | P0 | 2h |

### 第五天（Day 5）- 导出与收尾

| 序号 | 任务 | 优先级 | 预估时间 |
|------|------|--------|----------|
| 5.1 | PDF 导出功能（puppeteer） | P0 | 3h |
| 5.2 | Word 导出功能（docx 库） | P1 | 2h |
| 5.3 | 生成历史记录功能 | P1 | 2h |
| 5.4 | 全面测试与 Bug 修复 | P0 | 3h |

---

## 六、技术难点与风险

### 6.1 技术难点

| 难点 | 解决方案 |
|------|----------|
| **富文本编辑器**：内容保存与回显 | 使用 wangEditor，内容以 HTML 格式存储在 `richContent` 字段 |
| **PDF 导出**：保持样式一致性 | 使用 puppeteer 截图方式，确保 CSS 完整加载 |
| **Word 导出**：复杂表格渲染 | 使用 `docx` 库，预定义模板结构，动态填充数据 |
| **拖拽排序**：状态管理 | 使用 `@dnd-kit/core` 或 `react-beautiful-dnd` |
| **委托单金额同步**：数据一致性 | 在委托单更新 API 中添加发票同步逻辑，使用事务保证一致性 |

### 6.2 风险点

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| **时间紧迫** | 可能无法完成全部功能 | 优先完成 P0 需求，P1 可延后 |
| **服务器资源** | PDF 生成可能 OOM | 使用本地构建上传方式部署 |
| **富文本 XSS** | 安全风险 | 使用 DOMPurify 清理 HTML |
| **大量数据导出** | 性能问题 | 添加分页、限制导出数量 |

---

## 七、Commit 策略

```
feat(invoice): 增强发票管理 - 关联委托单、回款日期必填
feat(inspection): 重构检测标准 - 树形分类与检测项目管理
feat(task-report): 添加富文本编辑功能
feat(client-report): 增强客户报告 - 首尾页配置、排序、导出
```

---

## 八、验收标准

### 需求1 - 发票管理
- [ ] 创建发票时可选择委托单（未被关联的）
- [ ] 一张发票只能关联一个委托单
- [ ] 回款日期为必填字段
- [ ] 委托单金额修改后，关联发票金额自动更新

### 需求2 - 检测标准
- [ ] 左侧显示两层树结构（分类→标准）
- [ ] 支持分类的增删改
- [ ] 支持标准的增删改
- [ ] 选中标准后，右侧显示检测项目表格
- [ ] 支持检测项目的增删改

### 需求8 - 任务报告
- [ ] 任意状态下都可以编辑报告
- [ ] 使用富文本编辑器编辑内容
- [ ] 生成报告后仍可编辑

### 需求9 - 客户报告
- [ ] 首页支持上传图片和输入文字
- [ ] 尾页支持上传图片和输入文字
- [ ] 任务报告支持手动拖拽排序
- [ ] 支持导出 PDF 格式
- [ ] 支持导出 Word 格式
- [ ] 保存生成记录，可查看历史版本

---

## 九、文件变更清单

### 新增文件

```
prisma/
 └── schema.prisma (修改)

src/app/api/
 ├── inspection-standard-category/
 │ ├── route.ts (新增)
 │ ├── [id]/route.ts (新增)
 │ └── tree/route.ts (新增)
 ├── inspection-item/
 │ ├── route.ts (新增)
 │ └── [id]/route.ts (新增)
 ├── finance/invoice/
 │ └── available-entrustments/route.ts (新增)
 ├── test-report/[id]/
 │ └── content/route.ts (新增)
 └── client-report/[id]/
  ├── export/route.ts (新增)
 └── history/route.ts (新增)

src/components/
 ├── RichTextEditor/
 │ └── index.tsx (新增)
 ├── ImageUpload/
 │ └── index.tsx (新增)
 └── DraggableList/
 └── index.tsx (新增)

src/app/(dashboard)/
 ├── basic-data/inspection-standards/
 │ └── page.tsx (重构)
 ├── finance/invoice/
 │ └── page.tsx (修改)
 ├── report/task/[id]/
 │  └── page.tsx (修改)
 └── report/client-generate/
 └── page.tsx (修改)
```

### 依赖安装

```bash
npm install @wangeditor/editor @wangeditor/editor-for-react
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install puppeteer docx
npm install dompurify @types/dompurify
```

---

## 十、执行模式建议

由于时间紧迫，建议使用 **ultrawork** 模式并行开发：

```
/ultrawork

任务分配：
- Agent 1: 发票管理（API + 前端）
- Agent 2: 检测标准树形管理（API + 前端）
- Agent 3: 任务报告富文本编辑
- Agent 4: 客户报告增强（首尾页、排序、导出）
```

或使用 **ralph** 模式确保完整性：

```
/ralph 按照 .omc/plans/urgent-features-v2.md 计划实施全部需求
```

---

*计划创建者: Prometheus (Strategic Planning Consultant)*
*创建时间: 2026-02-05*
