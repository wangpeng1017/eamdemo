# LIMS 实验室信息管理系统 - 产品需求文档 (PRD)

> **版本**: 2.2
> **最后更新**: 2026-01-14
> **本次更新**: 修复 Fortune-sheet 数据加载问题、外部链接弹窗显示问题、合同生成 clientId 缺失问题
> **文档类型**: 详细需求规格说明书
> **技术栈变更**: 已迁移至 Next.js 全栈方案
> **审批流系统**: 统一可配置审批流系统 v1.1

---

## 一、项目概述

### 1.1 项目简介

LIMS（Laboratory Information Management System）是一套面向检测实验室的全流程信息化管理系统，覆盖从客户咨询、报价、合同签订、样品接收、任务分配、检测执行、报告生成到财务结算的完整业务链条。

### 1.2 技术栈

| 层级 | 技术选型 |
|------|----------|
| **框架** | Next.js 15 (App Router) + TypeScript |
| **前端UI** | React 19 + Ant Design 6 |
| **后端API** | Next.js API Routes (Route Handlers) |
| **ORM** | Prisma 6 |
| **数据库** | MySQL 8.0 |
| **认证** | NextAuth.js v5 (Auth.js) |
| **表单验证** | 自定义 API Handler + Zod |
| **安全模块** | 身份认证 + 输入验证 + 状态机 + 乐观锁 + 速率限制 |
| **日期处理** | Day.js |
| **文件存储** | MinIO / 阿里云 OSS |
| **报告生成** | EasyExcel + LibreOffice |
| **表格组件** | Fortune-sheet |
| **部署** | PM2 + Nginx |

> **注意**：本项目已从最初规划的 Spring Boot 方案迁移至 Next.js 全栈方案，以实现更快的开发迭代和更简洁的部署架构。所有后续功能开发均使用此技术栈。

### 1.3 目标用户

| 角色 | 描述 | 核心诉求 |
|------|------|----------|
| 业务员/销售 | 负责客户对接、咨询跟进、报价 | 快速响应客户需求，跟踪业务进度 |
| 样品管理员 | 负责样品收发、登记、流转 | 精准管理样品状态，避免混乱 |
| 检测人员 | 执行检测任务、录入数据 | 高效完成任务，准确记录数据 |
| 实验室主管 | 任务分配、审核报告 | 合理分配资源，把控质量 |
| 财务人员 | 收款、开票管理 | 准确对账，及时回款 |
| 系统管理员 | 用户权限、系统配置 | 保障系统安全稳定运行 |

---

## 二、业务流程

### 2.1 核心业务流程图

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              LIMS 核心业务流程                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐                  │
│  │ 委托咨询 │───▶│ 报价管理 │───▶│ 合同签订 │───▶│ 委托单   │                  │
│  │ (跟进中) │    │ (三级审批)│    │ (执行中) │    │ (生成)   │                  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘                  │
│       │                                               │                         │
│       │              ┌────────────────────────────────┘                         │
│       │              ▼                                                          │
│       │         ┌──────────┐    ┌──────────┐    ┌──────────┐                   │
│       │         │ 样品收样 │───▶│ 任务分配 │───▶│ 检测执行 │                   │
│       │         │ (登记)   │    │ (内部/外包)│   │ (数据录入)│                   │
│       │         └──────────┘    └──────────┘    └──────────┘                   │
│       │                                               │                         │
│       │                                               ▼                         │
│       │         ┌──────────┐    ┌──────────┐    ┌──────────┐                   │
│       │         │ 财务结算 │◀───│ 报告发布 │◀───│ 报告审批 │                   │
│       │         │ (收款开票)│    │ (交付)   │    │ (三级)   │                   │
│       └────────▶└──────────┘    └──────────┘    └──────────┘                   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 状态流转说明

#### 2.2.1 委托咨询状态流转

```
[following - 跟进中] ← 新建咨询默认状态
      │ 生成报价单
      ▼
[quoted - 已报价]
      │
      ├─── 报价被客户接受 → [合同流程]
      ├─── 报价被客户拒绝 → [rejected - 已拒绝]
      │
[closed - 已关闭] ← 手动关闭（任意时间）
```

#### 2.2.2 报价单审批流程

```
[draft - 草稿]
      │ 提交审批
      ▼
[pending_sales - 待销售审批] → 销售经理审批
      │ 通过
      ▼
[pending_finance - 待财务审批] → 财务审批
      │ 通过
      ▼
[pending_lab - 待实验室审批] → 实验室负责人审批
      │ 通过
      ▼
[approved - 已批准] → 等待客户反馈
      │
      ├─── 客户接受(OK) → 生成合同
      └─── 客户拒绝(NG) → 归档
```

#### 2.2.3 合同状态流转

```
[draft - 草稿] → [signed - 已签订] → [executing - 执行中] → [completed - 已完成]
                                                        ↘
                                                    [terminated - 已终止]
```

#### 2.2.4 样品状态流转

```
[待收样] → [已收样] → [已分配] → [检测中] → [已完成]
                 ↘                      ↘
              [已外包]              [已归还/已销毁]
```

#### 2.2.5 任务状态流转

```
[pending - 待开始] → [in_progress - 进行中] → [pending_review - 待审核] → [completed - 已完成]
                              ↘                        ↙
                           [transferred - 已转交]
```

**状态说明**：
| 状态 | 说明 | 可执行操作 |
|------|------|-----------|
| pending | 任务已创建，等待检测人员开始 | 开始、转交 |
| in_progress | 检测人员正在录入数据 | 录入数据、转交 |
| pending_review | 数据已提交，等待主管审核 | 查看数据 |
| completed | 审核通过，任务完成 | 查看数据 |
| transferred | 任务已转交给其他人员 | - |

#### 2.2.6 报告审批流程

```
[草稿] → [待审核] → [已审核] → [已批准] → [已发布]
```

---

## 三、功能模块详细说明

### 3.1 委托管理模块

#### 3.1.1 委托咨询 (EntrustmentConsultation)

**功能描述**：记录客户检测咨询信息，跟踪咨询进度，转化为报价单。

**页面路径**：`/entrustment/consultation`

**表单字段**：

| 字段名 | 字段标识 | 类型 | 必填 | 说明 |
|--------|----------|------|------|------|
| 咨询单号 | consultationNo | string | 是 | 自动生成，格式：ZX+年月日+序号 |
| 客户公司 | clientCompany | string | 是 | 客户单位名称 |
| 联系人 | clientContact | string | 是 | 客户联系人姓名 |
| 联系电话 | clientTel | string | 是 | 联系电话 |
| 邮箱 | clientEmail | string | 否 | 电子邮箱 |
| 地址 | clientAddress | string | 否 | 客户地址 |
| 样品名称 | sampleName | string | 是 | 样品名称 |
| 样品型号 | sampleModel | string | 否 | 型号规格 |
| 样品材质 | sampleMaterial | string | 否 | 材质信息 |
| 预计数量 | estimatedQuantity | number | 否 | 预估样品数量 |
| 检测项目 | testItems | string[] | 是 | 检测项目列表（多选） |
| 检测目的 | testPurpose | enum | 是 | quality_inspection/product_certification/rd_testing/other |
| 期望完成时间 | expectedDeadline | date | 否 | 期望报告交付日期 |
| 客户要求 | clientRequirements | text | 否 | 特殊要求说明 |
| 预算范围 | budgetRange | string | 否 | 如"5000-10000" |
| 状态 | status | enum | 是 | following/quoted/rejected/closed |
| 跟进人 | follower | string | 是 | 负责跟进的业务员 |
| 可行性评估 | feasibility | enum | 否 | feasible/difficult/infeasible |
| 可行性说明 | feasibilityNote | text | 否 | 评估说明 |
| 预估价格 | estimatedPrice | number | 否 | 初步估价 |

**跟进记录字段**：

| 字段名 | 字段标识 | 类型 | 说明 |
|--------|----------|------|------|
| 跟进日期 | date | datetime | 跟进时间 |
| 跟进方式 | type | enum | phone/email/visit/other |
| 跟进内容 | content | text | 详细内容 |
| 下一步行动 | nextAction | text | 计划行动 |
| 操作人 | operator | string | 跟进人 |

**按钮逻辑**：

| 按钮 | 触发条件 | 操作逻辑 |
|------|----------|----------|
| 新建咨询 | 任意时刻 | 打开新建表单，状态默认"跟进中" |
| 编辑 | status = "following" | 打开编辑表单 |
| 查看 | 任意状态 | 打开详情抽屉 |
| 删除 | status = "following" 且有删除权限 | 确认后删除 |
| 关闭咨询 | status = "following" | 状态改为"已关闭" |
| 生成报价单 | status = "following" 且无关联报价单 | 跳转报价单页面，携带咨询信息 |
| 添加跟进 | status = "following" | 在详情抽屉中添加跟进记录 |

**筛选条件**：
- 关键词搜索：咨询单号、客户名称、联系人
- 状态筛选：全部/跟进中/已报价/已拒绝/已关闭
- 跟进人筛选
- 日期范围筛选

---

#### 3.1.2 报价管理 (QuotationManagement)

**功能描述**：创建和管理报价单，支持三级审批流程。

**页面路径**：`/entrustment/quotation`

**表单字段**：

| 字段名 | 字段标识 | 类型 | 必填 | 说明 |
|--------|----------|------|------|------|
| 报价单号 | quotationNo | string | 是 | 自动生成，格式：BJ+年月日+序号 |
| 创建时间 | createTime | datetime | 是 | 自动记录 |
| 客户公司 | clientCompany | string | 是 | 委托方公司 |
| 联系人 | clientContact | string | 是 | 联系人姓名 |
| 联系电话 | clientTel | string | 是 | 联系电话 |
| 邮箱 | clientEmail | string | 否 | 电子邮箱 |
| 地址 | clientAddress | string | 否 | 客户地址 |
| 服务公司 | serviceCompany | string | 是 | 默认：江苏国轻检测技术有限公司 |
| 服务联系人 | serviceContact | string | 是 | 业务员 |
| 服务电话 | serviceTel | string | 是 | 业务电话 |
| 样品名称 | sampleName | string | 是 | 样品名称 |
| 客户备注 | clientRemark | text | 否 | 客户特殊要求 |
| 报价合计 | subtotal | number | 是 | 自动计算 |
| 含税合计 | taxTotal | number | 是 | subtotal × 1.06 |
| 优惠后合计 | discountTotal | number | 是 | 最终报价 |
| 状态 | status | enum | 是 | draft/pending_sales/pending_finance/pending_lab/approved/rejected/archived |
| 客户反馈 | clientStatus | enum | 是 | pending/ok/ng |
| NG原因 | ngReason | text | 否 | 客户拒绝原因 |
| 关联咨询单 | consultationNo | string | 否 | 来源咨询单号 |
| 关联合同 | contractNo | string | 否 | 生成的合同编号 |

**报价明细项字段**：

| 字段名 | 字段标识 | 类型 | 说明 |
|--------|----------|------|------|
| 检测项目 | serviceItem | string | 检测项目名称 |
| 检测标准 | methodStandard | string | 依据标准 |
| 数量 | quantity | number | 样品数量 |
| 单价 | unitPrice | number | 单价（元） |
| 总价 | totalPrice | number | quantity × unitPrice |

**审批记录字段**：

| 字段名 | 字段标识 | 类型 | 说明 |
|--------|----------|------|------|
| 审批级别 | level | number | 1/2/3 |
| 审批角色 | role | enum | sales_manager/finance/lab_director |
| 审批人 | approver | string | 审批人姓名 |
| 审批动作 | action | enum | approve/reject |
| 审批意见 | comment | text | 审批备注 |
| 审批时间 | timestamp | datetime | 操作时间 |

**按钮逻辑**：

| 按钮 | 触发条件 | 操作逻辑 |
|------|----------|----------|
| 新建报价 | 任意时刻 | 打开新建表单 |
| 编辑 | status = "draft" | 打开编辑表单 |
| 提交审批 | status = "draft" | 状态改为"pending_sales" |
| 审批通过 | 当前用户有对应级别审批权限 | 进入下一审批状态 |
| 审批驳回 | 当前用户有对应级别审批权限 | 状态改为"rejected" |
| 生成合同 | status = "approved" 且 clientStatus = "ok" | 跳转合同页面 |
| 归档 | status = "approved" | 状态改为"archived" |
| 删除 | status = "draft" | 确认后删除 |

**三级审批流程**：

| 级别 | 角色 | 审批内容 |
|------|------|----------|
| 1 | 销售经理 | 审核客户信息、报价合理性 |
| 2 | 财务 | 审核价格、付款条款 |
| 3 | 实验室负责人 | 审核检测能力、周期 |

---

#### 3.1.3 合同管理 (ContractManagement)

**功能描述**：管理检测服务合同，支持从报价单生成。

**页面路径**：`/entrustment/contract`

**表单字段**：

| 字段名 | 字段标识 | 类型 | 必填 | 说明 |
|--------|----------|------|------|------|
| 合同编号 | contractNo | string | 是 | 格式：HT+年月日+序号 |
| 合同名称 | contractName | string | 是 | 合同标题 |
| 关联报价单 | quotationNo | string | 是 | 来源报价单号 |
| 甲方公司 | partyA.company | string | 是 | 客户公司 |
| 甲方联系人 | partyA.contact | string | 是 | 客户联系人 |
| 甲方电话 | partyA.tel | string | 是 | 联系电话 |
| 甲方地址 | partyA.address | string | 是 | 公司地址 |
| 甲方税号 | partyA.taxId | string | 否 | 纳税人识别号 |
| 甲方开户行 | partyA.bankName | string | 否 | 银行名称 |
| 甲方账号 | partyA.bankAccount | string | 否 | 银行账号 |
| 乙方公司 | partyB.company | string | 是 | 服务方公司 |
| 乙方联系人 | partyB.contact | string | 是 | 业务员 |
| 乙方电话 | partyB.tel | string | 是 | 联系电话 |
| 乙方地址 | partyB.address | string | 是 | 公司地址 |
| 合同金额 | contractAmount | number | 是 | 合同总金额 |
| 样品名称 | sampleName | string | 是 | 检测样品 |
| 是否有预付款 | hasAdvancePayment | boolean | 是 | 是否需要预付款 |
| 预付款金额 | advancePaymentAmount | number | 否 | 预付款金额 |
| 签订日期 | signDate | date | 是 | 合同签订日期 |
| 生效日期 | effectiveDate | date | 是 | 合同生效日期 |
| 到期日期 | expiryDate | date | 是 | 合同到期日期 |
| 状态 | status | enum | 是 | draft/signed/executing/completed/terminated |

**合同条款字段**：

| 字段名 | 字段标识 | 类型 | 说明 |
|--------|----------|------|------|
| 付款条款 | terms.paymentTerms | text | 付款方式和时间约定 |
| 交付条款 | terms.deliveryTerms | text | 报告交付方式和时间 |
| 质量条款 | terms.qualityTerms | text | 检测质量要求 |
| 保密条款 | terms.confidentialityTerms | text | 保密责任约定 |
| 违约责任 | terms.liabilityTerms | text | 违约处理方式 |
| 争议解决 | terms.disputeResolution | text | 争议解决方式 |

**按钮逻辑**：

| 按钮 | 触发条件 | 操作逻辑 |
|------|----------|----------|
| 新建合同 | 任意时刻 | 打开新建表单 |
| 编辑 | status = "draft" | 打开编辑表单 |
| 签订 | status = "draft" | 状态改为"signed" |
| 开始执行 | status = "signed" | 状态改为"executing" |
| 生成委托单 | status = "signed" 或 "executing" | 跳转委托单页面并自动填充信息 |
| 下载PDF | 选中一条记录 | 导出完整合同PDF文件 |
| 完成 | status = "executing" | 状态改为"completed" |
| 终止 | status != "completed" | 状态改为"terminated" |
| 上传附件 | 任意状态 | 上传盖章合同等文件 |

---

#### 3.1.4 委托单管理 (Entrustment)

**功能描述**：管理检测委托单，是检测业务的核心单据。

**页面路径**：`/entrustment/list`

**表单字段**：

| 字段名 | 字段标识 | 类型 | 必填 | 说明 |
|--------|----------|------|------|------|
| 委托编号 | entrustmentId | string | 是 | 格式：WT+年月日+序号 |
| 合同编号 | contractNo | string | 否 | 关联合同 |
| 委托单位 | clientName | string | 是 | 客户公司名称 |
| 联系人 | contactPerson | string | 否 | 客户联系人 |
| 送样时间 | sampleDate | date | 是 | 样品送达日期 |
| 跟进人 | follower | string | 是 | 负责跟进的业务员 |
| 样品名称 | sampleName | string | 是 | 样品名称 |
| 规格型号 | sampleModel | string | 否 | 样品规格 |
| 材质牌号 | sampleMaterial | string | 否 | 材质信息 |
| 样品数量 | sampleQuantity | number | 否 | 样品总数 |
| 是否退样 | isSampleReturn | boolean | 否 | 检测后是否退还样品 |
| 来源类型 | sourceType | enum | 否 | contract/quotation/direct |

**检测项目字段**：

| 字段名 | 字段标识 | 类型 | 说明 |
|--------|----------|------|------|
| 项目ID | id | string | 唯一标识 |
| 项目名称 | name | string | 检测项目名称 |
| 检测参数 | testItems | string[] | 检测参数列表 |
| 检测方法 | method | string | 检测方法标准 |
| 判定标准 | standard | string | 结果判定标准 |
| 状态 | status | enum | pending/assigned/subcontracted/completed |
| 分配给 | assignTo | string | 内部检测人员 |
| 分包商 | subcontractor | string | 外包供应商 |
| 外包检测员 | subcontractAssignee | string | 外包方具体检测人员 |
| 使用设备 | deviceId | string | 检测设备ID |
| 分配日期 | assignDate | date | 任务分配日期 |
| 截止日期 | deadline | date | 完成截止日期 |

**按钮逻辑**：

| 按钮 | 触发条件 | 操作逻辑 |
|------|----------|----------|
| 新建委托 | 任意时刻 | 打开新建抽屉 |
| 编辑 | 任意状态 | 打开编辑抽屉 |
| 删除 | 有删除权限 | 确认后删除 |
| 添加检测项目 | 编辑状态 | 打开项目添加弹窗 |
| 分配（内部） | 项目status = "pending" | 打开分配抽屉，选择内部人员 |
| 分配（外包） | 项目status = "pending" | 打开分配抽屉，选择外包供应商 |
| 生成外部链接 | 已选中记录 | 生成客户填写链接 |
| 关联合同跳转 | 合同编号列存在 | 点击跳转到对应合同详情 |

**外部链接功能**：

*功能描述*：为委托单生成外部链接，供客户在线填写样品信息和检测要求。

*使用场景*：
- 客户需要补充样品详细信息
- 客户需要提供特殊检测要求
- 减少电话沟通，提高信息准确性

*功能流程*：
1. 业务员在委托单列表点击"外部链接"按钮
2. 系统生成唯一 token（64位十六进制）和7天有效期
3. 链接自动复制到剪贴板
4. 业务员将链接发送给客户
5. 客户通过链接访问填写页面（无需登录）
6. 客户填写样品信息、检测项目、特殊要求
7. 提交后数据直接更新到委托单

*客户填写页面字段*：

| 字段名 | 字段标识 | 类型 | 必填 | 说明 |
|--------|----------|------|------|------|
| 委托单号 | entrustmentNo | string | - | 只读显示 |
| 委托单位 | clientName | string | - | 只读显示 |
| 样品名称 | sampleName | string | 是 | 样品名称 |
| 规格型号 | sampleModel | string | 否 | 样品规格 |
| 材质牌号 | sampleMaterial | string | 否 | 材质信息 |
| 样品数量 | sampleQuantity | number | 是 | 样品数量 |
| 特殊要求 | specialRequirements | text | 否 | 特殊检测要求 |
| 其他需求 | otherRequirements | text | 否 | 其他补充说明 |
| 验证码 | captcha | string | 是 | 4位数字验证码 |

*技术实现*：
- Token 存储：Entrustment.remark 字段（JSON格式）
- 外部页面路径：`/external/entrustment/[token]`
- API 路由：
  - `POST /api/entrustment/[id]/external-link` - 生成链接
  - `GET /api/external/entrustment/validate?token=xxx` - 验证token
  - `POST /api/external/entrustment/submit` - 提交数据

---

#### 3.1.5 客户单位管理 (ClientUnit)

**功能描述**：管理客户单位信息，包含开票信息。

**页面路径**：`/entrustment/client`

**表单字段**：

| 字段名 | 字段标识 | 类型 | 必填 | 说明 |
|--------|----------|------|------|------|
| 单位名称 | name | string | 是 | 公司全称 |
| 联系人 | contactPerson | string | 是 | 主要联系人 |
| 联系电话 | contactPhone | string | 是 | 联系电话 |
| 地址 | address | string | 否 | 公司地址 |
| 备注 | remark | string | 否 | 备注信息 |
| 税号 | taxId | string | 否 | 纳税人识别号 |
| 开票地址 | invoiceAddress | string | 否 | 发票抬头地址 |
| 开票电话 | invoicePhone | string | 否 | 发票抬头电话 |
| 开户行 | bankName | string | 否 | 银行名称 |
| 银行账号 | bankAccount | string | 否 | 银行账号 |
| 状态 | status | enum | 是 | draft/pending/approved/rejected |
| 创建人 | creator | string | 是 | 自动记录 |
| 创建时间 | createTime | datetime | 是 | 自动记录 |

---

### 3.2 样品管理模块

#### 3.2.1 收样登记 (SampleRegistration)

**功能描述**：登记接收的样品信息，生成样品标签。

**页面路径**：`/sample/receipt`

**表单字段**：

| 字段名 | 字段标识 | 类型 | 必填 | 说明 |
|--------|----------|------|------|------|
| 样品编号 | sampleNo | string | 是 | 自动生成，格式：S+年月日+序号 |
| 委托单号 | entrustmentId | string | 是 | 关联委托单 |
| 样品名称 | name | string | 是 | 样品名称 |
| 规格型号 | spec | string | 是 | 规格型号 |
| 样品总量 | quantity | number | 是 | 接收数量 |
| 单位 | unit | enum | 是 | 个/件/批/kg/g/L/mL/m/m²/m³ |
| 收样日期 | receiptDate | date | 是 | 自动记录当天 |
| 收样人 | receiptPerson | string | 是 | 自动记录当前用户 |
| 状态 | status | enum | 是 | 待收样/已收样/已分配/检测中/已完成/已归还/已销毁 |

**按钮逻辑**：

| 按钮 | 触发条件 | 操作逻辑 |
|------|----------|----------|
| 新建收样 | 任意时刻 | 打开登记弹窗，支持选择委托单自动填充 |
| 编辑 | 任意状态 | 打开编辑弹窗 |
| 删除 | 有权限 | 确认后删除 |
| 标签 | 列表操作列 | 打开标签预览弹窗，支持下载PNG |

**样品标签内容**：
- 条形码 (Code128)
- 样品编号
- 样品名称

---

#### 3.2.2 样品明细 (SampleDetails)

**功能描述**：查看所有样品的详细信息和流转记录。

**页面路径**：`/sample/details`

**展示字段**：
- 样品编号、委托单号、样品名称、规格型号
- 总量 (Total)、可用量 (Remaining)、单位
- 收样日期、收样人
- 状态

**操作按钮**：
- **详情**：查看样品基本信息和流转记录
- **内部领用**：发起内部借用申请（关联实验室、用途）
- **外部委外**：发起委外检测申请（关联供应商、截止日期）
- **记录**：查看该样品的所有领用和委外记录

**筛选条件**：
- 关键词搜索：样品编号、样品名称
- 状态筛选
- 日期范围筛选

---

#### 3.2.3 我的样品 (MySamples)

**功能描述**：查看当前用户领用的样品，支持新建领用和归还。

**页面路径**：`/sample/my`

**展示字段**：
- 样品编号、样品名称、规格型号
- 领用数量、用途
- 领用日期、预计归还日期、实际归还日期
- 状态（领用中/已归还/逾期）

**操作按钮**：
- **新建领用**：选择样品发起领用申请
- **归还**：归还已领用的样品（填写归还日期、备注）

---

### 3.3 任务管理模块

#### 3.3.1 全部任务 (AllTasks)

**功能描述**：查看和管理所有检测任务，支持任务分配。

**页面路径**：`/task/all`

**任务字段**：

| 字段名 | 字段标识 | 类型 | 说明 |
|--------|----------|------|------|
| 任务编号 | taskNo | string | 自动生成 |
| 委托单号 | entrustmentId | string | 关联委托单 |
| 样品名称 | sampleName | string | 检测样品 |
| 检测参数 | parameters | string[] | 检测项目列表 |
| 状态 | status | enum | pending/in_progress/completed |
| 执行人 | assignedTo | string | 分配的检测人员 |
| 截止日期 | dueDate | date | 完成截止日期 |
| 是否外包 | isOutsourced | boolean | 是否委外任务（分包时自动创建） |

**分配表单字段**：

| 字段名 | 字段标识 | 类型 | 必填 | 说明 |
|--------|----------|------|------|------|
| 分配给 | assignedTo | string | 是 | 选择检测人员 |
| 使用设备 | deviceId | string | 否 | 选择检测设备 |
| 截止日期 | dueDate | date | 是 | 完成期限 |
| 备注说明 | remark | text | 否 | 任务说明 |

**按钮逻辑**：

| 按钮 | 触发条件 | 操作逻辑 |
|------|----------|----------|
| 录入数据 | status = "in_progress" | 跳转数据录入页面 |
| 查看数据 | status = "completed" | 查看只读数据页面 |
| 分配 | 任务未分配 | 打开分配弹窗 |


**统计信息**：
- 未分配任务数
- 进行中任务数
- 已完成任务数

---

#### 3.3.2 我的任务 (MyTasks)

**功能描述**：查看当前用户被分配的任务。

**页面路径**：`/task/my`

**统计卡片**：
- 全部任务数
- 待开始数
- 进行中数
- 已完成数

**操作按钮**：

| 按钮 | 触发条件 | 操作逻辑 |
|------|----------|----------|
| 开始 | status = "pending" | 任务状态改为 in_progress，跳转数据录入页 |
| 录入数据 | status = "in_progress" | 跳转到数据录入页面 `/task/data/[id]` |
| 查看数据 | status = "pending_review" 或 "completed" | 查看只读数据页面 |
| 转交 | status != "completed" 且 != "pending_review" | 打开转交弹窗，选择接收人 |

**转交任务弹窗字段**：
| 字段名 | 字段标识 | 类型 | 必填 | 说明 |
|--------|----------|------|------|------|
| 转交给 | assignedToId | string | 是 | 选择接收人员 |
| 转交原因 | reason | enum | 否 | 工作调整/设备故障/技术支援/其他 |

**筛选条件**：
- 状态筛选：待开始/进行中/待审核/已完成

---

### 3.4 检测管理模块

#### 3.4.1 数据录入 (DataEntry)

**功能描述**：检测人员录入检测数据，支持表格编辑。

**页面路径**：`/task/data/[id]`

**功能特点**：
- 基于 Fortune-sheet 的表格编辑组件
- 支持从检测模板加载
- 支持公式计算
- **自动保存**：点击保存草稿暂存数据
- **提交直接完成**：提交后任务状态直接变为"已完成"，数据锁定只读

---

### 3.5 报告管理模块

#### 3.5.1 任务报告 (TaskReports)

**功能描述**：管理基于单个检测任务的原始检测报告。

**页面路径**：
- 报告生成：`/report/task-generate`
- 报告详情：`/report/task/[id]`

**核心流程**：
1. **生成**：从"已完成"的任务中选择生成报告
2. **预览**：实时预览报告内容，包含检测数据表格和结论
3. **导出**：支持 Excel/PDF 导出

**报告字段**：

| 字段名 | 字段标识 | 类型 | 说明 |
|--------|----------|------|------|
| 报告编号 | reportNo | string | 格式：RPT-YYYYMMDD-XXX |
| 任务编号 | taskNo | string | 关联任务 |
| 样品名称 | sampleName | string | 样品名称 |
| 检测结论 | overallConclusion | string | 合格/不合格 |
| 检测数据 | testResults | json | 完整检测数据快照 |
| 检测人 | tester | string | 检测人员 |
| 状态 | status | enum | 草稿/已发布 |

---

#### 3.5.2 客户报告 (ClientReports)

**功能描述**：管理面向客户的正式综合报告，支持合并多个任务报告。

**页面路径**：
- 报告生成：`/report/client-generate`
- 报告详情：`/report/client/[id]`

**功能流程**：
1. **选择委托单**：选择需要出具报告的委托单
2. **选择任务**：勾选该委托单下已完成的任务（支持多选合并）
3. **填写封面**：补充报告标题、备注等信息
4. **生成报告**：系统自动聚合所有任务的检测数据

**报告字段**：

| 字段名 | 字段标识 | 类型 | 说明 |
|--------|----------|------|------|
| 报告编号 | reportNo | string | 客户报告编号 |
| 委托单号 | entrustmentId | string | 关联委托单 |
| 客户名称 | clientName | string | 委托单位 |
| 包含任务 | taskReports | list | 关联的任务报告列表 |
| 总体结论 | conclusion | text | 综合结论 |
| 状态 | status | enum | 草稿/已发布 |

---

#### 3.5.3 报告模板管理

**页面路径**：
- 任务报告模板：`/report/task-template`
- 客户报告模板：`/report/client-template`

**功能描述**：分类管理不同层级的报告模板。

---

### 3.6 财务管理模块

#### 3.6.1 应收账款 (Receivables)

**功能描述**：管理检测服务应收款项。

**页面路径**：`/finance/receivable`

**应收字段**：

| 字段名 | 字段标识 | 类型 | 说明 |
|--------|----------|------|------|
| 应收编号 | receivableNo | string | 格式：AR-YYYYMMDD-XXX |
| 委托单号 | entrustmentId | string | 关联委托单 |
| 客户单位 | clientName | string | 客户名称 |
| 应收总额 | totalAmount | number | 应收金额 |
| 已收金额 | receivedAmount | number | 已收到金额 |
| 待收金额 | remainingAmount | number | 剩余应收 |
| 状态 | status | enum | 未收款/已收款 |
| 关联报告 | reportNos | string[] | 报告编号列表 |
| 应收日期 | dueDate | date | 预计收款日期 |
| 创建时间 | createTime | datetime | 创建时间 |

---

#### 3.6.2 收款记录 (PaymentRecords)

**功能描述**：记录收款明细。

**页面路径**：`/finance/payment`

**收款字段**：

| 字段名 | 字段标识 | 类型 | 说明 |
|--------|----------|------|------|
| 记录编号 | recordNo | string | 收款记录号 |
| 应收编号 | receivableNo | string | 关联应收款 |
| 收款金额 | paymentAmount | number | 本次收款金额 |
| 收款日期 | paymentDate | date | 收款日期 |
| 收款方式 | paymentMethod | enum | 现金/银行转账/支票/其他 |
| 经办人 | handlerName | string | 收款经办人 |
| 银行名称 | bankName | string | 付款银行 |
| 交易流水号 | transactionNo | string | 银行流水号 |
| 附件 | attachments | string[] | 收款凭证 |

---

#### 3.6.3 开票管理 (InvoiceManagement)

**功能描述**：管理发票开具。

**页面路径**：`/finance/invoice`

**发票字段**：

| 字段名 | 字段标识 | 类型 | 说明 |
|--------|----------|------|------|
| 发票号码 | invoiceNo | string | 发票号 |
| 委托单号 | entrustmentId | string | 关联委托单 |
| 应收编号 | receivableNo | string | 关联应收款 |
| 购买方名称 | clientName | string | 发票抬头 |
| 购买方税号 | clientTaxNo | string | 纳税人识别号 |
| 购买方地址 | clientAddress | string | 地址 |
| 购买方电话 | clientPhone | string | 电话 |
| 购买方开户行 | clientBank | string | 银行名称 |
| 购买方账号 | clientBankAccount | string | 银行账号 |
| 发票类型 | invoiceType | enum | 增值税普通发票/增值税专用发票 |
| 开票金额 | invoiceAmount | number | 不含税金额 |
| 税率 | taxRate | number | 6%或13% |
| 税额 | taxAmount | number | 税额 |
| 价税合计 | totalAmount | number | 含税总额 |
| 开票日期 | invoiceDate | date | 开票日期 |
| 状态 | status | enum | 待开票/已开票 |

---

### 3.7 设备管理模块

#### 3.7.1 设备台账 (DeviceInfo)

**功能描述**：管理实验室设备信息。

**页面路径**：`/device`

**设备字段**：

| 字段名 | 字段标识 | 类型 | 说明 |
|--------|----------|------|------|
| 设备ID | id | string | 唯一标识 |
| 设备编号 | code | string | 如 ALTCCS-2022001 |
| 设备名称 | name | string | 设备名称 |
| 型号 | model | string | 设备型号 |
| 制造商 | manufacturer | string | 生产厂家 |
| 出厂编号 | serialNumber | string | 序列号 |
| 资产类型 | assetType | enum | instrument/device/glassware |
| 状态 | status | enum | Running/Maintenance/Idle/Scrapped |
| 存放区域 | location | string | 存放位置 |
| 所属部门 | department | string | 部门 |
| 采购日期 | purchaseDate | date | 采购时间 |
| 启用日期 | commissioningDate | date | 投入使用日期 |
| 上次定检 | lastCalibrationDate | date | 上次校准日期 |
| 下次定检 | nextCalibrationDate | date | 下次校准日期 |
| 设备负责人 | responsiblePerson | string | 负责人 |
| 利用率 | utilization | number | 使用率百分比 |
| 运行时长 | operatingHours | number | 累计运行小时 |

---

#### 3.7.2 保养计划 (MaintenancePlan)

**功能描述**：管理设备保养计划。

**页面路径**：`/device/maintenance-plan`

**计划字段**：

| 字段名 | 字段标识 | 类型 | 说明 |
|--------|----------|------|------|
| 计划ID | id | string | 唯一标识 |
| 设备ID | deviceId | string | 关联设备 |
| 设备名称 | deviceName | string | 设备名称 |
| 计划名称 | planName | string | 保养计划名称 |
| 周期类型 | planType | enum | daily/weekly/monthly/quarterly/annual |
| 间隔天数 | interval | number | 保养间隔 |
| 下次保养日期 | nextMaintenanceDate | date | 计划日期 |
| 负责人 | responsiblePerson | string | 负责人 |
| 保养项目 | maintenanceItems | string[] | 保养内容列表 |
| 状态 | status | enum | active/inactive |

---

#### 3.7.3 维修管理 (RepairManagement)

**功能描述**：管理设备维修记录。

**页面路径**：`/device/repair`

---

#### 3.7.4 定检计划 (CalibrationPlan)

**功能描述**：管理设备校准计划。

**页面路径**：`/device/calibration-plan`

---

### 3.8 统计报表模块

#### 3.8.1 委托统计 (EntrustmentStats)

**页面路径**：`/statistics`

**统计维度**：
- 按时间：月度/季度/年度委托量趋势
- 按客户：TOP客户委托量排名
- 按类型：不同检测类型分布

#### 3.8.2 样品统计 (SampleStats)

**页面路径**：`/statistics`（同一页面内切换）

**统计维度**：
- 样品接收量趋势
- 样品状态分布
- 各类型样品占比

#### 3.8.3 任务统计 (TaskStats)

**页面路径**：`/statistics`（同一页面内切换）

**统计维度**：
- 任务完成情况
- 人员工作量统计
- 任务周期分析

---

### 3.9 系统管理模块

#### 3.9.1 审批中心 (ApprovalCenter)

**页面路径**：`/approval` （入口已集成至工作台 `/dashboard`）

**功能描述**：统一审批中心，集中处理所有待审批业务和查看我的审批提交。

**核心功能**：
1. **待我审批** - 查看所有需要当前用户审批的申请
2. **我的提交** - 查看当前用户提交的所有审批申请
3. **快速审批** - 支持通过、驳回操作
4. **审批历史** - 查看完整的审批记录和流转状态

**展示字段**：

| 字段名 | 字段标识 | 类型 | 说明 |
|--------|----------|------|------|
| 业务类型 | bizType | enum | quotation/contract/client |
| 业务编号 | bizId | string | 关联业务单号 |
| 提交人 | submitterName | string | 申请人姓名 |
| 当前步骤 | currentStep | number | 当前审批级别 |
| 状态 | status | enum | pending/approved/rejected/cancelled |
| 提交时间 | submittedAt | datetime | 提交时间 |

**操作按钮**：

| 按钮 | 功能 | 说明 |
|------|------|------|
| 通过 | approve | 同意该审批，进入下一级或完成 |
| 驳回 | reject | 拒绝该审批，流程结束 |
| 详情 | view | 查看业务详细信息和审批历史 |

**筛选条件**：
- 状态筛选：全部/审批中/已通过/已驳回
- 业务类型筛选：报价单/合同/客户单位
- 提交人筛选
- 日期范围筛选

**相关文件**：
- 审批中心页面：`src/app/(dashboard)/approval/page.tsx`
- 审批实例查询 API：`src/app/api/approval/route.ts`

---

#### 3.9.2 用户管理 (UserManagement)

**页面路径**：`/system/user`

**界面布局**：
- **左侧**：组织架构树（部门树），支持部门增删改
- **右侧**：所选部门下的用户列表

**用户字段**：
- 用户ID、用户名（可选，自动生成）、姓名
- 邮箱、手机、部门
- 角色、状态（支持快速启用/禁用）
- 创建时间、最后登录时间

#### 3.9.3 角色管理 (RoleManagement)

**页面路径**：`/system/role`

**角色字段**：
- 角色ID、角色名称、角色编码
- 角色描述、状态
- **数据权限 (Data Scope)**：
  - 全部数据 (All)：可查看所有数据
  - 本部门数据 (Department)：可查看本部门及下级部门成员创建的数据
  - 仅本人数据 (Self)：仅可查看自己创建及相关的数据
- 关联权限菜单

#### 3.9.4 部门管理 (DepartmentManagement)

**页面路径**：`/system/user` (集成在用户管理页面左侧)

**功能特点**：
- 树状结构展示
- 支持右键或按钮操作：添加子部门、编辑、删除
- 部门人员递归查询：选择父部门可查看所有子部门人员
- **用户筛选增强**：在部门管理中，系统会根据当前用户的“数据权限”自动过滤可见的用户和部门范围。

**部门字段**：
- 部门ID、部门名称、部门编码
- 上级部门、负责人
- 排序、状态

#### 3.9.5 权限配置 (PermissionConfig)

**页面路径**：`/system/permission`

**功能描述**：
- 对系统菜单和按钮级权限进行集中配置。
- 支持树形结构展示权限层级。
- 权限编码可选（不填则自动生成），支持批量启用/禁用。

**业务数据过滤机制 (Data Filtering)**：
- 系统核心业务模块（报价、合同、客户、委托）自动应用数据权限过滤。
- **归属原则**：数据创建时自动记录 `createdById`。
- **查询规则**：根据当前用户角色的 `dataScope` 自动注入查询条件（All > Dept > Self）。

#### 3.9.6 审批流程管理 (ApprovalFlow)

**页面路径**：`/system/approval-flow`

**功能描述**：统一审批流系统，支持为不同业务类型配置审批流程。

**核心功能**：
1. **审批流程配置** - 为报价单、合同、客户单位等业务配置审批流程
2. **可视化配置** - 拖拽式配置审批节点，支持角色/用户/部门负责人审批
3. **灵活可扩展** - 新增业务类型无需改代码，仅配置即可

**审批流程配置字段**：

| 字段名 | 字段标识 | 类型 | 必填 | 说明 |
|--------|----------|------|------|------|
| 流程名称 | name | string | 是 | 审批流程名称 |
| 流程编码 | code | string | 否 | 唯一标识，如不填自动生成 |
| 业务类型 | businessType | string | 是 | quotation/contract/client |
| 流程描述 | description | string | 否 | 流程说明 |
| 审批节点 | nodes | json | 是 | 审批节点配置 |
| 状态 | status | boolean | 是 | 是否启用 |

**审批节点配置格式**：
```json
[
  {
    "step": 1,
    "name": "销售经理审批",
    "type": "role",
    "targetId": "sales_manager",
    "targetName": "销售经理",
    "required": true
  },
  {
    "step": 2,
    "name": "财务审批",
    "type": "role",
    "targetId": "finance",
    "targetName": "财务",
    "required": true
  }
]
```

**支持的审批类型**：
| 类型 | 说明 | targetId 示例 |
|------|------|---------------|
| role | 角色审批 | sales_manager, finance, lab_director |
| user | 指定用户 | user_id_123 |
| department | 部门负责人 | dept_id_456 |

**已配置的审批流程**：

1. **报价审批流程** (QUOTATION_APPROVAL)
   - 第1级：销售经理审批
   - 第2级：财务审批
   - 第3级：实验室负责人审批

2. **合同审批流程** (CONTRACT_APPROVAL)
   - 第1级：部门经理审批
   - 第2级：法务审批

3. **客户单位审批流程** (CLIENT_APPROVAL)
   - 第1级：销售经理审批

**审批状态流转**：
```
[草稿] → [提交审批] → [pending - 审批中]
                              ↓
                    ┌─────────┴─────────┐
                    ↓                   ↓
               [通过]               [驳回]
                    ↓                   ↓
            [下一级/完成]          [rejected]
                    ↓
            [approved - 已批准]
```

**相关文件**：
- 审批引擎：`src/lib/approval/engine.ts`
- 审批类型：`src/lib/approval/types.ts`
- 统一审批 API：`src/app/api/approval/route.ts`
- 审批操作 API：`src/app/api/approval/[id]/route.ts`
- 前端组件：`src/components/approval/`

---

### 3.10 供应商管理模块

#### 3.10.1 供应商信息 (SupplierInfo)

**页面路径**：`/outsource/supplier`

#### 3.10.2 供应商分类 (SupplierCategory)

**页面路径**：`/supplier/category`

#### 3.10.3 评价模板 (EvaluationTemplate)

**页面路径**：`/supplier/template`

#### 3.10.4 绩效评价 (PerformanceEvaluation)

**页面路径**：`/supplier/evaluation`

---

### 3.11 易耗品管理模块

#### 3.11.1 易耗品信息 (ConsumableInfo)

**页面路径**：`/consumable/info`

#### 3.11.2 出入库记录 (StockTransactions)

**页面路径**：`/consumable/transaction`

---

### 3.12 委外管理模块

#### 3.12.1 全部委外 (AllOutsourcing)

**页面路径**：`/outsource/order`

#### 3.12.2 我的委外 (MyOutsourcing)

**页面路径**：`/outsource/my`

---

## 四、测试数据示例

### 4.1 委托咨询测试数据

```json
{
  "id": "1",
  "consultationNo": "ZX20231201001",
  "createTime": "2023-12-01 10:00:00",
  "clientCompany": "奇瑞汽车股份有限公司",
  "clientContact": "李工",
  "clientTel": "13800138000",
  "clientEmail": "ligong@chery.com",
  "clientAddress": "安徽省芜湖市经济技术开发区长春路8号",
  "sampleName": "莱尼 K01",
  "sampleModel": "K01-2023",
  "sampleMaterial": "合金钢",
  "estimatedQuantity": 5,
  "testItems": ["拉伸强度测试", "金相分析", "硬度测试"],
  "testPurpose": "quality_inspection",
  "urgencyLevel": "urgent",
  "expectedDeadline": "2023-12-10",
  "clientRequirements": "需要加急处理，3天内出具报告",
  "budgetRange": "3000-5000",
  "status": "quoted",
  "follower": "张馨",
  "feasibility": "feasible",
  "feasibilityNote": "实验室具备相关检测能力，设备齐全",
  "estimatedPrice": 3500,
  "quotationNo": "BJ20231201001"
}
```

### 4.2 报价单测试数据

```json
{
  "id": "1",
  "quotationNo": "BJ20231201001",
  "createTime": "2023-12-01 09:30:00",
  "clientCompany": "奇瑞汽车股份有限公司",
  "clientContact": "李工",
  "clientTel": "13800138000",
  "clientEmail": "ligong@chery.com",
  "clientAddress": "安徽省芜湖市经济技术开发区长春路8号",
  "serviceCompany": "江苏国轻检测技术有限公司",
  "serviceContact": "张馨",
  "serviceTel": "15952575002",
  "sampleName": "莱尼 K01",
  "items": [
    { "id": 1, "serviceItem": "拉伸强度测试", "methodStandard": "GB/T 228.1-2021", "quantity": 3, "unitPrice": 500, "totalPrice": 1500 },
    { "id": 2, "serviceItem": "金相分析", "methodStandard": "GB/T 13298-2015", "quantity": 2, "unitPrice": 800, "totalPrice": 1600 }
  ],
  "subtotal": 3100,
  "taxTotal": 3286,
  "discountTotal": 3000,
  "status": "approved",
  "clientStatus": "ok",
  "approvalHistory": [
    { "level": 1, "role": "sales_manager", "approver": "王经理", "action": "approve", "comment": "同意报价", "timestamp": "2023-12-01 10:30:00" },
    { "level": 2, "role": "finance", "approver": "张会计", "action": "approve", "comment": "价格合理", "timestamp": "2023-12-01 14:20:00" },
    { "level": 3, "role": "lab_director", "approver": "李主任", "action": "approve", "comment": "同意", "timestamp": "2023-12-01 16:00:00" }
  ]
}
```

### 4.3 委托单测试数据

```json
{
  "id": 1,
  "entrustmentId": "WT20231101001",
  "contractNo": "HT20231101",
  "sourceType": "contract",
  "clientName": "奇瑞汽车股份有限公司",
  "contactPerson": "张经理",
  "sampleDate": "2023-11-01",
  "follower": "李四",
  "sampleName": "C30混凝土试块",
  "sampleModel": "150*150*150mm",
  "sampleMaterial": "C30",
  "sampleQuantity": 3,
  "isSampleReturn": false,
  "testItems": "抗压强度",
  "projects": [
    {
      "id": "P001",
      "name": "混凝土抗压强度检测",
      "testItems": ["抗压强度"],
      "method": "GB/T 50081-2019",
      "standard": "GB/T 50081-2019",
      "status": "completed",
      "assignTo": "张三"
    }
  ]
}
```

### 4.4 客户单位测试数据

```json
{
  "id": 1,
  "name": "奇瑞汽车股份有限公司",
  "contactPerson": "王经理",
  "contactPhone": "13800138001",
  "address": "安徽省芜湖市经济技术开发区长春路8号",
  "taxId": "91340200713920435C",
  "invoiceAddress": "安徽省芜湖市经济技术开发区长春路8号",
  "invoicePhone": "0553-5961111",
  "bankName": "中国工商银行芜湖分行",
  "bankAccount": "1307023009022100123",
  "status": "approved"
}
```

### 4.5 样品测试数据

```json
{
  "id": 1,
  "sampleNo": "S20231101001",
  "receiptId": 1,
  "entrustmentId": "WT20231101001",
  "name": "C30混凝土试块",
  "spec": "150*150*150mm",
  "quantity": 3,
  "totalQuantity": 3,
  "unit": "个",
  "remainingQuantity": 3,
  "receiptDate": "2023-11-01",
  "receiptPerson": "张三",
  "status": "已收样"
}
```

### 4.6 设备测试数据

```json
{
  "id": "1",
  "code": "ALTCCS-2022001",
  "name": "火花源原子发射光谱仪",
  "model": "SPECTRO MAXx",
  "manufacturer": "SPECTRO",
  "serialNumber": "SN2022001",
  "assetType": "instrument",
  "status": "Running",
  "location": "光谱室",
  "department": "检测部",
  "purchaseDate": "2022-01-15",
  "commissioningDate": "2022-02-01",
  "nextCalibrationDate": "2024-02-01",
  "responsiblePerson": "张三",
  "utilization": 30,
  "operatingHours": 1200
}
```

### 4.7 财务数据测试

```json
{
  "id": 1,
  "receivableNo": "AR-20231125-001",
  "entrustmentId": "WT20231101001",
  "clientName": "某汽车零部件公司",
  "samples": [
    {
      "sampleNo": "S20231101001",
      "sampleName": "钢筋混凝土试件",
      "testItems": ["抗压强度", "外观质量"],
      "unitPrice": 500,
      "quantity": 3,
      "subtotal": 1500
    }
  ],
  "totalAmount": 1500,
  "receivedAmount": 1500,
  "remainingAmount": 0,
  "status": "已收款",
  "reportNos": ["RPT-20231125-001"],
  "dueDate": "2023-11-30"
}
```

---

## 五、系统配置

### 5.1 默认账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 管理员 |

### 5.2 服务方默认信息

```javascript
{
  serviceCompany: "江苏国轻检测技术有限公司",
  serviceContact: "张馨",
  serviceTel: "15952575002",
  serviceEmail: "zhangxin@sae-china.org",
  serviceAddress: "扬州市邗江区金山路99号"
}
```

### 5.3 编号规则

| 单据类型 | 格式 | 示例 |
|----------|------|------|
| 咨询单 | ZX + 年月日 + 序号 | ZX20231201001 |
| 报价单 | BJ + 年月日 + 序号 | BJ20231201001 |
| 合同 | HT + 年月日 + 序号 | HT20231201001 |
| 委托单 | WT + 年月日 + 序号 | WT20231101001 |
| 样品 | S + 年月日 + 序号 | S20231101001 |
| 任务 | T + 年月日 + 序号 | T20231101001 |
| 报告 | RPT-YYYYMMDD-XXX | RPT-20231125-001 |
| 应收 | AR-YYYYMMDD-XXX | AR-20231125-001 |
| 发票 | INV-YYYYMMDD-XXX | INV-20231115-001 |

---

## 六、附录

### 6.1 状态枚举对照表

#### 咨询状态
| 值 | 显示文本 | 颜色 |
|-----|----------|------|
| following | 跟进中 | processing |
| quoted | 已报价 | success |
| rejected | 已拒绝 | error |
| closed | 已关闭 | default |

#### 报价单状态
| 值 | 显示文本 | 颜色 |
|-----|----------|------|
| draft | 草稿 | default |
| pending_sales | 待销售审批 | processing |
| pending_finance | 待财务审批 | processing |
| pending_lab | 待实验室审批 | processing |
| approved | 已批准 | success |
| rejected | 已拒绝 | error |
| archived | 已归档 | cyan |

#### 合同状态
| 值 | 显示文本 | 颜色 |
|-----|----------|------|
| draft | 草稿 | default |
| signed | 已签订 | success |
| executing | 执行中 | processing |
| completed | 已完成 | success |
| terminated | 已终止 | error |

#### 设备状态
| 值 | 显示文本 |
|-----|----------|
| Running | 运行中 |
| Maintenance | 维护中 |
| Idle | 空闲 |
| Scrapped | 已报废 |

### 6.2 文件目录结构

```
client/src/
├── pages/                    # 页面组件
│   ├── Entrustment/          # 委托管理
│   │   ├── EntrustmentConsultation.tsx  # 委托咨询
│   │   ├── QuotationManagement.tsx      # 报价管理
│   │   ├── ContractManagement.tsx       # 合同管理
│   │   ├── index.tsx                    # 委托单管理
│   │   └── ClientUnit.tsx               # 客户单位
│   ├── SampleManagement/     # 样品管理
│   ├── TaskManagement/       # 任务管理
│   ├── TestManagement/       # 检测管理
│   ├── ReportManagement/     # 报告管理
│   ├── FinanceManagement/    # 财务管理
│   ├── DeviceManagement/     # 设备管理
│   ├── StatisticsReport/     # 统计报表
│   └── SystemSettings/       # 系统设置
├── mock/                     # Mock数据
├── services/                 # API服务
├── components/               # 公共组件
├── hooks/                    # 自定义Hook
├── utils/                    # 工具函数
└── config/                   # 配置文件
```

---

## 七、变更历史

### v2.2 - 2026-01-14

**Bug 修复**：
- ✅ **Fortune-sheet 数据加载修复**：
  - 问题：保存后再次加载数据不显示
  - 原因：Fortune-sheet 初始化需要 `celldata` 格式，但保存后数据变成 `data` 格式
  - 方案：添加 `convertDataToCelldata()` 转换函数，加载时自动转换格式
  - 修改文件：`src/components/DataSheet.tsx`、`src/app/(dashboard)/task/data/[id]/page.tsx`
- ✅ **外部链接弹窗修复**：
  - 问题：点击"生成外部链接"按钮后没有弹窗显示
  - 原因：剪贴板 API 成功时只显示小提示，用户容易忽略
  - 方案：改为始终显示 Modal.success 弹窗，点击链接文本框可全选
  - 修改文件：`src/app/(dashboard)/entrustment/list/page.tsx`
- ✅ **合同生成 clientId 缺失修复**：
  - 问题：通过报价单生成合同时报 400 错误
  - 原因：缺少 clientId 字段
  - 方案：在合同创建时自动查找或创建客户单位
  - 修改文件：`src/app/api/contract/route.ts`

---

### v2.1 - 2026-01-13

**Bug 修复**：
- ✅ **任务状态流转修复**：
  - 恢复 `pending_review`（待审核）状态
  - 统一状态定义为英文：pending/in_progress/pending_review/completed/transferred
  - 修复 `statusFlow.ts` 中状态定义中英文不一致的问题
- ✅ **我的任务页面修复**：
  - `pending` 状态添加"开始"按钮
  - `pending_review` 状态添加"查看数据"按钮
  - 修复全部任务统计显示 NaN 的问题
  - 添加"待审核"状态到筛选器
- ✅ **审核功能修复**：
  - 提交数据后进入 `pending_review` 状态（而非直接 completed）
  - 审核通过后才变为 `completed`
- ✅ **用户分配优化**：
  - 优先使用 `assignToId` 查找用户，兼容名称查找
  - 避免重名用户导致的分配错误
- ✅ **数据完整性保护**：
  - 样品更新改为智能模式：更新现有、创建新增、删除前检查关联任务
  - 委托单删除前检查关联的任务和样品
  - 任务编号统一使用 `generateNo()` 函数，避免高并发重复
- ✅ **API 权限控制**：
  - `task/all` API 添加 `withAuth` 权限验证

**代码文件变更**：
- `src/lib/statusFlow.ts` - 统一任务状态定义
- `src/app/api/task/[id]/data/route.ts` - 修复审核流程
- `src/app/api/entrustment/[id]/projects/[projectId]/route.ts` - 优化用户分配
- `src/app/api/entrustment/[id]/route.ts` - 保护数据完整性
- `src/app/api/entrustment/route.ts` - 移除重复代码
- `src/app/api/task/all/route.ts` - 添加权限控制
- `src/app/(dashboard)/task/my/page.tsx` - 修复操作按钮

---

### v2.0 - 2026-01-12

**可视化模版编辑器**：
- ✅ **新增组件**：
  - `src/components/TemplateEditor.tsx` - 可视化模版编辑器主组件
  - `src/components/ColumnPropertyForm.tsx` - 列属性配置表单
  - `src/lib/template-converter.ts` - Schema 转换工具
- ✅ **编辑器功能**：
  - 左右分栏布局（表格编辑区 70% + 属性配置面板 30%）
  - 右键菜单支持：插入/删除行列、设置列属性、配置统计列
  - 统计配置：平均值、标准差、离散系数 (CV%)
  - 实时 JSON 预览
- ✅ **模版自动关联**：
  - 新增 `/api/test-template/by-method` API - 根据检测方法匹配模版
  - 数据录入页面自动根据检测方法加载对应模版
  - 支持模版与检测标准的智能匹配
- ✅ **预置检测项目**：
  - 拉伸性能试验 (GB/T 3354-2014)
  - 金属材料拉伸试验 (GB/T 228.1-2021)
  - 布氏硬度试验 (GB/T 231.1-2018)

---

### v1.5 - 2026-01-10

**Bug 修复**：
- ✅ 修复报价单检测项目选择后名称不显示的问题
  - 原因：`itemColumns` 定义在组件外部，导致 `testTemplateOptions` 状态不同步
  - 方案：将 `itemColumns` 移入组件内部，直接使用 `testTemplates` 状态
- ✅ 修复合同客户名称为输入框的问题
  - 改为下拉选择框，从委托单位列表选择
  - 选择后自动填充联系人、电话、地址
- ✅ 修复委托单项目无法重新分配/重新分包的问题
  - 已分配的项目现在可以点击"重新分配"
  - 已分包的项目现在可以点击"重新分包"
- ✅ 修复工作台 API 404 错误
  - 新增 `/api/statistics/dashboard` - 工作台统计数据
  - 新增 `/api/todo` - 待办事项列表
  - 新增 `/api/recent-activities` - 最近活动列表
- ✅ 修复委托单"外部链接"按钮点击无反应
  - API 使用正确的服务器地址 (8.130.182.148:3001)
  - 添加剪贴板降级方案，在 HTTP 环境下显示弹窗让用户手动复制

**新功能**：
- ✅ 委托单状态自动更新
  - 所有项目完成时，委托单自动变为"已完成"
  - 项目分配时，委托单自动变为"检测中"
- ✅ 检测数据保存/提交分离
  - 保存：仅保存数据，不变更状态
  - 提交：校验结论必填 → 任务完成 → 项目完成 → 委托单自动完成

---

### v1.7 - 2026-01-11

**样品管理增强**：
- ✅ **收样登记** (`/sample/receipt`)
  - 新增委托单选择：自动填充样品名称、规格、数量
  - 新增标签生成：支持生成并下载条码标签 (Code128)
- ✅ **样品明细** (`/sample/details`)
  - 新增字段：总量、可用量（颜色区分状态）
  - 新增操作：内部领用（关联实验室）、外部委外（关联供应商）、查看记录
- ✅ **我的样品** (`/sample/my`)
  - 新增"新建领用"功能
  - 保留并优化"归还"功能
- ✅ **菜单调整**：移除独立的"样品借还"菜单，功能合并

**系统管理优化**：
- ✅ **组织架构**：用户管理页改为"左树右表"布局，集成部门管理
- ✅ **配置体验**：
  - 角色/权限/审批流编码改为可选（自动生成）
  - 支持列表页快速启用/禁用状态
- ✅ **UI 细节**：修复收样状态 "returned" 显示为中文 "已归还"

---

### v1.6 - 2026-01-11

**功能增强**：
- ✅ **分包管理升级**
  - 分包弹窗新增"检测人员"选择字段 (`subcontractAssignee`)
  - 分包分配后自动为指定人员创建检测任务 (`TestTask`)
  - 外包任务自动同步至"任务管理 -> 我的任务"列表
- ✅ **审批可视化**
  - 新增 `ApprovalTimeline` 组件，直观展示审批节点进度
  - 报价单详情页应用时间线组件，显示销售→财务→实验室的三级审批状态
- ✅ **交互体验优化**
  - 委托单新增/编辑页面由 Drawer 改为 Modal，统一弹窗体验
  - 委托单检测项目表单简化：移除复杂参数，改为"检测项目"选择 + "方法/标准"自动填充
  - 工作台新增"待审批" (显示提交时间) 和 "我的任务" 模块
  - 侧边栏移除"审批中心"入口，功能融合至工作台

**工程化与部署**：
- ✅ 新增快速部署脚本 `deploy-fast.sh` (本地构建+上传架构)
- ✅ 数据库新增 `EntrustmentProject.subcontractAssignee` 字段
- ✅ 修复所有状态标签的国际化显示 (English -> 中文)

---

### v1.9 - 2026-01-12

**安全加固**：
- ✅ **API 身份认证**：所有 API 添加 `withAuth`/`withRole`/`withAdmin` 中间件
- ✅ **输入验证**：使用 Zod 实现类型安全验证 (`src/lib/validation.ts`)
- ✅ **状态流转验证**：状态机防止非法跳转 (`src/lib/status-flow.ts`)
- ✅ **并发控制**：乐观锁防止更新冲突 (`src/lib/optimistic-lock.ts`)
- ✅ **速率限制**：外部接口限流保护 (`src/lib/rate-limit.ts`)
- ✅ **结构化日志**：API/操作/安全事件日志 (`src/lib/logger.ts`)
- ✅ **删除调试 API**：移除 `/api/debug-data`、`/api/init-test-users`

**代码改进**：
- ✅ 启用审批权限验证
- ✅ 添加删除级联检查（客户、供应商、角色、部门）
- ✅ 统一 API 错误处理和响应格式

---

### v1.8 - 2026-01-12

**报告管理迭代**：
- ✅ **重构报告模块**：拆分为"任务报告"和"客户报告"双层结构
  - 任务报告：针对单一检测任务，记录原始数据
  - 客户报告：支持多任务合并，生成最终对外报告
- ✅ **新增页面**：
  - `/report/task-generate` & `/report/task-template`
  - `/report/client-generate` & `/report/client-template`
- ✅ **报告预览**：支持实时预览检测数据表格
- ✅ **导出**：实现 Excel 格式报告导出

**任务流程简化**：
- ✅ **状态简化**：去除 pending_review 状态，简化为 in_progress -> completed
- ✅ **字段精简**：移除不常用的 progress 进度字段
- ✅ **交互优化**：
  - 移除"开始"、"完成"按钮，提交即完成
  - 移除冗余的"审核"按钮，简化操作路径

**其他修复**：
- ✅ 修复工作台 KPI 统计中的状态过滤问题
- ✅ 修复数据保存弹窗未显示的问题
- ✅ 优化 DataSheet 数据同步机制

---

### v1.4 - 2026-01-08

**文档优化**：
- 移除咨询单 urgencyLevel（紧急程度）字段，实际业务不需要

---

### v1.3 - 2026-01-08

**新增功能**：
- ✅ 统一审批流系统上线
  - 新增 ApprovalInstance 和 ApprovalRecord 数据模型
  - 实现审批引擎 (approvalEngine)
  - 创建统一审批 API (/api/approval)
- ✅ 审批中心页面
  - 待我审批：集中处理所有待审批业务
  - 我的提交：查看我提交的所有审批申请
  - 支持快速审批（通过/驳回）
- ✅ 审批流程配置管理
  - 系统设置 > 审批流程菜单
  - 可视化配置审批节点和审批人
  - 支持角色/用户/部门负责人三种审批类型
- ✅ 预置审批流程
  - 报价审批流程（三级：销售经理 → 财务 → 实验室负责人）
  - 合同审批流程（两级：部门经理 → 法务）
  - 客户单位审批流程（单级：销售经理）

**Bug 修复**：
- ✅ 修复咨询管理页面 testItems 字段类型不匹配问题
  - 数据库存储 JSON 字符串，前端期望数组
  - 统一在 API 层进行序列化/反序列化处理

**技术改进**：
- 统一审批流引擎设计，支持扩展新业务类型
- 前端审批组件化（ApprovalActions、ApprovalHistory、ApprovalStatus）
- 审批权限验证机制

---

### v1.2 - 2026-01-07

**初始功能**：
- 委托管理模块（咨询、报价、合同、委托单、客户单位）
- 样品管理模块
- 任务管理模块
- 检测管理模块
- 报告管理模块
- 财务管理模块
- 设备管理模块
- 统计报表模块
- 系统管理模块

---

> **文档维护说明**：本文档需随系统功能迭代同步更新，每次功能变更后需在"变更历史"中记录。
