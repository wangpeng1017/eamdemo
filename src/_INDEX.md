# src - 源代码索引

> LIMS 系统源代码根目录 | Next.js 15 App Router

## 📁 目录结构

```
src/
├── app/                    # Next.js App Router (页面 + API路由)
│   ├── (dashboard)/       # 仪表盘布局组（15个功能模块）
│   ├── api/               # API 路由 (40+ 接口)
│   ├── external/          # 外部访问入口
│   └── login/             # 登录页面
├── components/            # React 组件
├── lib/                  # 工具库和业务逻辑
└── _INDEX.md             # 本文件
```

---

## 1️⃣ 功能模块 (app/(dashboard))

| 模块 | 路径 | 功能描述 | 索引文件 |
|------|------|----------|----------|
| **委托管理** | entrustment | 咨询、报价、合同、委托单全流程 | ✅ entrustment/_INDEX.md |
| 审批管理 | approval | 审批流程配置与审批记录 | ❌ 缺失 |
| 基础数据 | basic-data | 检测标准、人员能力、报告类别等 | ❌ 缺失 |
| 易耗品管理 | consumable | 易耗品库存与出入库 | ❌ 缺失 |
| 设备管理 | device | 设备档案、校准、维护、维修 | ❌ 缺失 |
| 财务管理 | finance | 发票、付款、应收款 | ❌ 缺失 |
| 外协管理 | outsource | 外协订单与供应商 | ❌ 缺失 |
| 人员管理 | personnel | 人员能力与考核 | ❌ 缺失 |
| 报告管理 | report | 报告模板、生成、审批、发布 | ❌ 缺失 |
| 样品管理 | sample | 样品登记、流转、归还 | ❌ 缺失 |
| 统计分析 | statistics | 数据统计与仪表盘 | ❌ 缺失 |
| 供应商管理 | supplier | 供应商档案、评价、分类 | ❌ 缺失 |
| 系统管理 | system | 用户、角色、权限、部门、审批流 | ❌ 缺失 |
| 任务管理 | task | 我的任务、全部任务、数据录入 | ❌ 缺失 |
| 检测管理 | test | 检测任务与检测报告 | ❌ 缺失 |

---

## 2️⃣ API 路由 (app/api)

### 2.1 核心业务 API

| 模块 | 路径 | 说明 |
|------|------|------|
| 委托相关 | /api/consultation, /api/quotation, /api/contract, /api/entrustment | 委托流程 CRUD |
| 样品相关 | /api/sample | 样品登记与流转 |
| 任务相关 | /api/task, /api/test-task | 任务分配与执行 |
| 报告相关 | /api/report, /api/report-template, /api/client-report | 报告生成与模板 |

### 2.2 基础数据 API

| 模块 | 路径 | 说明 |
|------|------|------|
| 客户管理 | /api/client | 客户档案 CRUD |
| 设备管理 | /api/device | 设备档案 CRUD |
| 供应商 | /api/supplier, /api/supplier-category, /api/supplier-performance | 供应商管理 |
| 检测标准 | /api/inspection-standard | 检测标准库 |
| 检测模板 | /api/test-template, /api/evaluation-template | 检测模板 |

### 2.3 系统管理 API

| 模块 | 路径 | 说明 |
|------|------|------|
| 用户管理 | /api/user, /api/role, /api/permission, /api/dept | 用户权限管理 |
| 审批流程 | /api/approval-flow, /api/approval | 审批配置与执行 |
| 人员管理 | /api/personnel-capability, /api/capability-review | 人员能力考核 |

### 2.4 财务与外协 API

| 模块 | 路径 | 说明 |
|------|------|------|
| 财务管理 | /api/finance/invoice, /api/finance/payment, /api/finance/receivable | 发票、付款、应收款 |
| 外协管理 | /api/outsource-order, /api/consumable | 外协订单、易耗品 |

### 2.5 外部接口 API

| 模块 | 路径 | 说明 |
|------|------|------|
| 外部委托 | /api/external/entrustment | 外部用户提交委托单 |
| 外部委托页面 | /external/entrustment/[token] | 外部委托表单页面 |

---

## 3️⃣ 组件库 (components)

| 组件目录 | 功能说明 |
|----------|----------|
| components/approval | 审批相关组件（审批流、审批表单等） |
| components/layout | 布局组件（侧边栏、头部等） |
| 其他 | StatusTag, UserSelect 等通用组件 |

---

## 4️⃣ 工具库 (lib)

| 工具库目录 | 功能说明 |
|------------|----------|
| lib/approval | 审批引擎与审批流逻辑 |
| lib/utils | 通用工具函数 |

---

## 5️⃣ 技术栈

| 类型 | 技术 | 版本 |
|------|------|------|
| 框架 | Next.js | 15.1.0 (App Router) |
| 语言 | TypeScript | - |
| UI库 | Ant Design | 6.x |
| ORM | Prisma | 6.x |
| 认证 | NextAuth.js | v5 |
| 状态管理 | React Hooks | - |

---

## 6️⃣ 快速导航

- **功能模块页**：`src/app/(dashboard)/*/`
- **API路由**：`src/app/api/`
- **组件定义**：`src/components/`
- **业务逻辑**：`src/lib/`
- **主需求文档**：`docs/PRD.md`
- **部署文档**：`docs/部署文档-阿里云.md`

---

> **维护说明**
> - 新增功能模块时，同步更新本索引
> - 每个模块应有独立的 `_INDEX.md` 文件
> - API变更时更新对应的接口文档
