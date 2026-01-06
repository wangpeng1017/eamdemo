# LIMS Next.js 开发计划

> **版本**: 1.0
> **创建日期**: 2026-01-05
> **基于**: E:/trae/2LIMS/docs/PRD.md

---

## 一、开发概述

### 1.1 目标
将现有 LIMS 系统从基础功能升级为符合完整 PRD 规范的生产级系统。

### 1.2 开发原则
- 保持现有数据结构兼容性
- 优先开发核心业务流程
- 分模块迭代开发
- 每完成一个模块进行测试验证

### 1.3 技术栈确认
| 层级 | 技术选型 |
|------|----------|
| 前端 | Next.js 15 + TypeScript + Ant Design 5 |
| 后端 | Next.js API Routes |
| 数据库 | MySQL 8 + Prisma 5 |
| 认证 | NextAuth.js v5 |
| 表格组件 | Fortune-sheet (待集成) |
| 图表 | Recharts / Ant Design Charts |

---

## 二、数据库变更计划

### 2.1 新增模型

#### ReportTemplate (报告模板)
```prisma
model ReportTemplate {
  id          String   @id @default(cuid())
  name        String   @db.VarChar(200)
  code        String   @unique @db.VarChar(50)
  category    String   @db.VarChar(50)
  fileUrl     String   @db.VarChar(500)
  uploadDate  DateTime @default(now())
  uploader    String   @db.VarChar(50)
  status      String   @default("active") // active/inactive
  remark      String?  @db.Text
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("biz_report_template")
}
```

#### ClientReport (客户报告)
```prisma
model ClientReport {
  id                String   @id @default(cuid())
  reportNo          String   @unique @db.VarChar(50)
  entrustmentId     String?  @db.VarChar(50)
  projectName       String?  @db.VarChar(200)
  clientName        String   @db.VarChar(200)
  clientAddress     String?  @db.VarChar(500)
  sampleName        String   @db.VarChar(200)
  sampleNo          String?  @db.VarChar(50)
  specification     String?  @db.VarChar(200)
  sampleQuantity    String?  @db.VarChar(50)
  receivedDate      DateTime?
  taskReportNos     String?  @db.Text // JSON 关联任务报告
  testItems         String?  @db.Text // JSON 检测项目
  testStandards     String?  @db.Text // JSON 检测依据
  overallConclusion String?  @db.Text
  preparer          String?  @db.VarChar(50)
  reviewer          String?  @db.VarChar(50)
  approver          String?  @db.VarChar(50)
  status            String   @default("draft") // draft/pending_review/pending_approve/approved/issued
  approvalFlow      String?  @db.Text // JSON 审批记录
  issuedDate        DateTime?
  attachmentUrl     String?  @db.VarChar(500)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@map("biz_client_report")
}
```

#### SupplierCategory (供应商分类)
```prisma
model SupplierCategory {
  id          String     @id @default(cuid())
  name        String     @db.VarChar(100)
  code        String     @unique @db.VarChar(50)
  parentId    String?
  parent      SupplierCategory? @relation("CategoryTree", fields: [parentId], references: [id])
  children    SupplierCategory[] @relation("CategoryTree")
  description String?    @db.VarChar(500)
  sort        Int        @default(0)
  status      Int        @default(1)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  suppliers   Supplier[]

  @@map("biz_supplier_category")
}
```

#### ConsumableCategory (易耗品分类)
```prisma
model ConsumableCategory {
  id          String             @id @default(cuid())
  name        String             @db.VarChar(100)
  code        String             @unique @db.VarChar(50)
  parentId    String?
  parent      ConsumableCategory? @relation("CategoryTree", fields: [parentId], references: [id])
  children    ConsumableCategory[] @relation("CategoryTree")
  description String?            @db.VarChar(500)
  sort        Int                @default(0)
  status      Int                @default(1)
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt

  consumables Consumable[]

  @@map("biz_consumable_category")
}
```

### 2.2 模型修改

#### Supplier (添加分类关联)
```prisma
// 添加字段
categoryId  String?
category    SupplierCategory? @relation(fields: [categoryId], references: [id])
```

#### Consumable (添加分类关联)
```prisma
// 添加字段
categoryId  String?
category    ConsumableCategory? @relation(fields: [categoryId], references: [id])
```

#### TestReport (添加客户报告关联)
```prisma
// 添加字段
isClientReport  Boolean   @default(false)
clientReportId  String?   @db.VarChar(50)
```

### 2.3 字段调整

| 模型 | 当前字段 | 调整后 |
|------|----------|--------|
| Entrustment | 无需调整 | 保持 `entrustmentNo` |
| Device | `deviceNo` | 保持不变 |

---

## 三、页面开发计划

### 阶段一：核心业务流程（优先级 P0）

#### 1. 样品管理模块

| 页面 | 路由 | 任务 |
|------|------|------|
| 收样登记 | `/sample/receipt` | 新建页面，实现样品接收登记、生成标签功能 |
| 样品明细 | `/sample/details` | 新建页面，展示所有样品流转记录 |
| 我的样品 | `/sample/my` | 新建页面，当前用户领用的样品 |

**开发内容**：
- 样品标签生成（条形码/二维码）
- 样品状态流转
- 样品领用/归还记录

#### 2. 任务管理模块

| 页面 | 路由 | 任务 |
|------|------|------|
| 全部任务 | `/task/all` | 新建页面，查看和管理所有检测任务 |
| 我的任务 | `/task/my` | 新建页面，当前用户的任务列表 |

**开发内容**：
- 任务分配功能
- 任务状态管理
- 任务转交功能

#### 3. 检测管理模块

| 页面 | 路由 | 任务 |
|------|------|------|
| 数据录入 | `/test/data-entry` | **新建**，集成 Fortune-sheet 表格编辑 |

**开发内容**：
- Fortune-sheet 组件集成
- 从检测模板加载数据
- 自动保存功能
- 公式计算支持

### 阶段二：报告管理（优先级 P1）

#### 4. 报告管理模块

| 页面 | 路由 | 任务 |
|------|------|------|
| 检测报告 | `/report/test` | 改造现有 `/test/report` |
| 客户报告 | `/report/client` | **新建**，综合报告管理 |
| 报告审批 | `/report/approval` | **新建**，审批流程页面 |
| 报告模板 | `/report/template` | **新建**，模板管理 |

**开发内容**：
- 报告生成（从任务数据）
- 报告审批流程
- 报告模板上传/管理
- PDF 导出功能

### 阶段三：财务管理（优先级 P1）

#### 5. 财务管理模块

| 页面 | 路由 | 任务 |
|------|------|------|
| 收款记录 | `/finance/payment` | **新建**，收款明细记录 |

**开发内容**：
- 收款登记
- 关联应收款
- 凭证上传

### 阶段四：设备管理（优先级 P2）

#### 6. 设备管理模块

| 页面 | 路由 | 任务 |
|------|------|------|
| 设备台账 | `/device/info` | 改造现有 `/device` |
| 保养计划 | `/device/maintenance` | **新建** |
| 维修管理 | `/device/repair` | **新建** |
| 定检计划 | `/device/calibration` | **新建** |

### 阶段五：统计报表（优先级 P2）

#### 7. 统计报表模块

| 页面 | 路由 | 任务 |
|------|------|------|
| 委托统计 | `/statistics/entrustment` | **新建** |
| 样品统计 | `/statistics/sample` | **新建** |
| 任务统计 | `/statistics/task` | **新建** |

**开发内容**：
- ECharts/Recharts 图表集成
- 数据聚合统计
- 导出功能

### 阶段六：系统配置（优先级 P3）

#### 8. 系统配置模块

| 页面 | 路由 | 任务 |
|------|------|------|
| 权限配置 | `/system/permission` | **新建** |
| 审批流程配置 | `/system/approval-flow` | **新建** |

### 阶段七：供应商管理（优先级 P2）

#### 9. 供应商管理模块

| 页面 | 路由 | 任务 |
|------|------|------|
| 供应商分类 | `/supplier/category` | **新建** |
| 评价模板 | `/supplier/template` | **新建** |
| 绩效评价 | `/supplier/evaluation` | **新建** |

### 阶段八：易耗品管理（优先级 P3）

#### 10. 易耗品管理模块

| 页面 | 路由 | 任务 |
|------|------|------|
| 易耗品信息 | `/consumable/info` | **新建** |
| 出入库记录 | `/consumable/transaction` | **新建** |

---

## 四、API 开发计划

### 4.1 新增 API

| 模块 | API 路径 | 功能 |
|------|----------|------|
| **样品** | `/api/sample/receipt` | 收样登记 CRUD |
| **样品** | `/api/sample/requisition` | 领用记录 CRUD |
| **样品** | `/api/sample/my` | 我的样品列表 |
| **样品** | `/api/sample/[id]/label` | 生成样品标签 |
| **任务** | `/api/task/all` | 全部任务 |
| **任务** | `/api/task/my` | 我的任务 |
| **任务** | `/api/task/[id]/assign` | 任务分配 |
| **任务** | `/api/task/[id]/transfer` | 任务转交 |
| **检测** | `/api/test/data-entry` | 数据录入 CRUD |
| **检测** | `/api/test/template` | 检测模板管理 |
| **报告** | `/api/report/test` | 检测报告 CRUD |
| **报告** | `/api/report/client` | 客户报告 CRUD |
| **报告** | `/api/report/[id]/approve` | 报告审批 |
| **报告** | `/api/report/[id]/pdf` | 导出 PDF |
| **报告** | `/api/report/template` | 报告模板 CRUD |
| **财务** | `/api/finance/payment` | 收款记录 CRUD |
| **设备** | `/api/device/maintenance` | 保养计划 CRUD |
| **设备** | `/api/device/repair` | 维修记录 CRUD |
| **设备** | `/api/device/calibration` | 定检计划 CRUD |
| **统计** | `/api/statistics/entrustment` | 委托统计 |
| **统计** | `/api/statistics/sample` | 样品统计 |
| **统计** | `/api/statistics/task` | 任务统计 |
| **系统** | `/api/system/permission` | 权限配置 |
| **系统** | `/api/system/approval-flow` | 审批流程配置 |
| **供应商** | `/api/supplier/category` | 供应商分类 CRUD |
| **供应商** | `/api/supplier/evaluation` | 绩效评价 CRUD |
| **易耗品** | `/api/consumable` | 易耗品 CRUD |
| **易耗品** | `/api/consumable/category` | 易耗品分类 CRUD |
| **易耗品** | `/api/consumable/transaction` | 出入库记录 CRUD |

### 4.2 API 修改

| 模块 | 修改内容 |
|------|----------|
| `/api/entrustment` | 添加项目分配、外包分配接口 |
| `/api/test-report` | 添加客户报告关联 |
| `/api/supplier` | 添加分类关联 |

---

## 五、路由调整计划

### 5.1 需要调整的页面

| 当前路由 | 新路由 | 操作 |
|----------|--------|------|
| `/entrustment/list` | `/entrustment/order` | 重命名 |
| `/sample/list` | `/sample/details` | 重命名 |
| `/test/task` | `/task/all` | 重命名 |
| `/test/report` | `/report/test` | 重命名 |
| `/finance/receivable` | `/finance/receivables` | 重命名 |
| `/finance/invoice` | `/finance/invoices` | 重命名 |
| `/device` | `/device/info` | 重命名 |
| `/statistics` | `/statistics/dashboard` | 重命名 |
| `/system/user` | `/system/users` | 重命名 |
| `/system/role` | `/system/roles` | 重命名 |
| `/system/dept` | `/system/departments` | 重命名 |
| `/outsource/order` | `/outsourcing/all` | 重命名 |
| `/outsource/supplier` | `/supplier/info` | 重命名 |

### 5.2 侧边栏菜单更新

需要同步更新侧边栏菜单配置，确保新路由正确导航。

---

## 六、功能增强任务

### 6.1 组件集成

| 组件 | 用途 | 优先级 |
|------|------|--------|
| Fortune-sheet | 数据录入表格编辑 | P0 |
| Recharts | 统计图表展示 | P1 |
| React-PDF | PDF 预览 | P1 |
| jsPDF | PDF 导出 | P1 |
| React-Barcode | 样品标签条形码 | P1 |

### 6.2 功能增强

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 样品标签 | 生成带条形码的样品标签 | P0 |
| 报告生成 | 从模板生成 PDF 报告 | P1 |
| 三级审批 | 报价单/报告三级审批流程 | P1 |
| 数据统计 | 各维度统计图表 | P2 |
| 消息通知 | 待办任务消息提醒 | P2 |

---

## 七、测试数据计划

### 7.1 需要准备的测试数据

| 模块 | 数据内容 | 数量 |
|------|----------|------|
| 咨询 | 跟进中/已报价/已关闭状态 | 10 条 |
| 报价单 | 各状态 + 审批记录 | 10 条 |
| 合同 | 各状态 | 5 条 |
| 委托单 | 带检测项目 | 10 条 |
| 样品 | 各状态流转 | 20 条 |
| 任务 | 待开始/进行中/已完成 | 15 条 |
| 设备 | 各类型设备 | 10 台 |
| 供应商 | 各类型供应商 | 5 家 |
| 易耗品 | 常用易耗品 | 20 项 |

### 7.2 测试数据脚本

创建 `prisma/seed-full.ts` 用于完整测试数据初始化。

---

## 八、开发里程碑

### 里程碑 1：核心业务流程（Week 1-2）
- ✅ 样品管理模块
- ✅ 任务管理模块
- ✅ 数据录入功能

### 里程碑 2：报告管理（Week 3）
- ✅ 检测报告
- ✅ 客户报告
- ✅ 报告审批
- ✅ 报告模板

### 里程碑 3：财务与设备（Week 4）
- ✅ 收款记录
- ✅ 设备保养/维修/定检

### 里程碑 4：统计与配置（Week 5）
- ✅ 统计报表
- ✅ 权限配置
- ✅ 审批流程配置

### 里程碑 5：供应商与易耗品（Week 6）
- ✅ 供应商分类/评价
- ✅ 易耗品管理

---

## 九、技术债务处理

| 项目 | 处理方案 |
|------|----------|
| 路由命名不统一 | 按新 PRD 统一调整 |
| API 响应格式不一致 | 统一返回格式 |
| 错误处理不完善 | 添加全局错误处理 |
| 类型定义缺失 | 补充 TypeScript 类型 |

---

## 十、开发顺序建议

**按业务优先级排序：**

1. **样品管理** - 核心流程起点
2. **任务管理** - 检测执行核心
3. **数据录入** - 检测数据采集
4. **报告管理** - 交付成果
5. **财务管理** - 收款记录补充
6. **设备管理** - 保养/维修/定检
7. **统计报表** - 数据分析
8. **系统配置** - 权限/流程
9. **供应商管理** - 分类/评价
10. **易耗品管理** - 库存管理

---

> **文档维护**：每完成一个里程碑，更新本文档状态。
