
# 慧新 EAM 系统产品需求文档 (PRD)

> 最后更新: 2026-02-03 | 版本: 1.2

---

## 一、项目概述

### 1.1 项目愿景
构建一个功能完善的 EAM（企业资产管理）系统 DEMO，展示设备全生命周期管理核心功能，包括设备台账、维修管理、数据统计等，为后续完整系统开发奠定基础。

### 1.2 目标用户
| 角色 | 描述 | 核心诉求 |
|------|------|----------|
| 设备管理员 | 管理设备台账、查看设备状态 | 快速查询设备信息、统计设备数据 |
| 维修人员 | 处理维修工单、执行维修任务 | 查看派工任务、更新维修进度 |
| 报修人员 | 提交维修申请、跟踪维修进度 | 快速报修、了解处理进度 |

### 1.3 业务流程图
```
报修流程：现场人员发现故障 → 提交报修单 → 管理员派工 → 维修人员执行 → 完成维修 → 验收关闭
设备管理：设备入网 → 建立台账 → 维护保养 → 维修记录 → 报废处置
```

---

## 二、功能清单

### 状态说明
- 🔴 待开发 | 🟡 开发中 | 🟢 已完成 | ⚫ 已废弃

### 功能总览

| ID | 模块 | 功能 | 状态 | 优先级 | 对应代码 |
|----|------|------|------|--------|--------|----------|
| F001 | 控制台 | 数据统计仪表盘 | 🟢 | P0 | app/(admin)/dashboard/page.tsx |
| F002 | 设备台账 | 设备列表查询 | 🟢 | P0 | app/(admin)/equipment/page.tsx |
| F003 | 设备台账 | 设备详情查看 | 🟢 | P0 | app/(admin)/equipment/[id]/page.tsx |
| F004 | 设备台账 | 设备删除 | 🟢 | P1 | app/(admin)/equipment/page.tsx |
| F005 | 维修管理 | 工单列表查询 | 🟢 | P0 | app/(admin)/repair/page.tsx |
| F006 | 维修管理 | 新增报修 | 🟢 | P0 | app/(admin)/repair/page.tsx |
| F007 | 维修管理 | 工单详情查看 | 🟢 | P0 | app/(admin)/repair/[id]/page.tsx |
| F008 | 维修管理 | 工单派工 | 🟡 | P1 | app/(admin)/repair/[id]/page.tsx |
| F009 | 维修管理 | 维修验收 | 🟡 | P1 | app/(admin)/repair/[id]/page.tsx |
| F010 | 备品备件 | 备件库存查询 | 🟢 | P0 | app/(admin)/spareparts/page.tsx |
| F011 | 备品备件 | 备件详情查看 | 🟢 | P0 | app/(admin)/spareparts/[id]/page.tsx |
| F012 | 备品备件 | 入库/出库记录 | 🟢 | P0 | app/(admin)/spareparts/[id]/page.tsx |
| F013 | 维护保养 | 保养计划列表 | 🟢 | P0 | app/(admin)/maintenance/page.tsx |
| F014 | 维护保养 | 保养任务详情 | 🟢 | P0 | app/(admin)/maintenance/[id]/page.tsx |

---

## 三、功能详情

### F001: 控制台仪表盘
- **用户故事**: 作为设备管理员，我希望在控制台查看系统整体运行状况，包括设备统计、维修工单统计等
- **验收标准**:
  - [x] 显示设备总数、运行中、保养中、维修中数量
  - [x] 显示维修工单总数、待派工、处理中、已完成数量
  - [x] 显示最近维修工单列表
  - [x] 显示设备告警信息
- **技术备注**: 使用 Ant Design 组件库，数据从模拟数据中读取
- **关联页面**: /admin/dashboard

### F002: 设备列表查询
- **用户故事**: 作为设备管理员，我希望查看所有设备的列表，支持搜索和筛选
- **验收标准**:
  - [x] 表格展示设备信息（编码、名称、型号、位置、状态等）
  - [x] 支持按名称/编码/型号搜索
  - [x] 支持按状态筛选
  - [x] 显示设备统计卡片
  - [x] 支持跳转详情页
- **关联页面**: /admin/equipment

### F003: 设备详情查看
- **用户故事**: 作为设备管理员，我希望查看设备的详细信息，包括基本信息和维修记录
- **验收标准**:
  - [x] 展示设备完整信息
  - [x] 显示关联的维修工单列表
  - [x] 支持返回列表
- **关联页面**: /admin/equipment/[id]

### F004: 设备删除
- **用户故事**: 作为设备管理员，我希望删除不需要的设备记录
- **验收标准**:
  - [x] 删除前二次确认
  - [x] 删除后列表自动刷新
- **关联页面**: /admin/equipment

### F005: 维修工单列表
- **用户故事**: 作为维修人员，我希望查看所有维修工单，了解待处理任务
- **验收标准**:
  - [x] 表格展示工单信息（编号、设备、故障类型、描述、状态等）
  - [x] 支持按编号/设备/描述搜索
  - [x] 支持按状态筛选
  - [x] 显示工单统计卡片
  - [x] 支持跳转详情页
- **关联页面**: /admin/repair

### F006: 新增报修
- **用户故事**: 作为现场人员，我希望快速提交维修申请
- **验收标准**:
  - [x] 弹窗表单录入报修信息
  - [x] 选择设备、故障类型、优先级
  - [x] 填写故障描述
  - [x] 提交后显示成功提示
- **关联页面**: /admin/repair

### F007: 工单详情查看
- **用户故事**: 作为维修人员，我希望查看工单的完整信息，包括处理记录
- **验收标准**:
  - [x] 展示工单完整信息
  - [x] 显示维修记录（如有）
  - [x] 显示处理时间轴
  - [x] 支持返回列表
- **关联页面**: /admin/repair/[id]

### F008: 工单派工
- **用户故事**: 作为设备管理员，我希望将待派工工单分配给维修人员
- **验收标准**:
  - [ ] 选择维修人员
  - [ ] 记录派工时间
  - [ ] 更新工单状态
- **关联页面**: /admin/repair/[id] (UI已就位，待实现逻辑)

### F009: 维修验收
- **用户故事**: 作为设备管理员，我希望对已完成的维修进行验收
- **验收标准**:
  - [ ] 填写验收结果
  - [ ] 填写验收意见
  - [ ] 更新工单状态为已关闭
- **关联页面**: /admin/repair/[id] (UI已就位，待实现逻辑)

### F010: 备件库存查询
- **用户故事**: 作为库管员，我希望查看所有备件的库存情况，包括库存预警信息
- **验收标准**:
  - [x] 表格展示备件信息（编码、名称、型号、分类、库存等）
  - [x] 显示库存状态（正常/预警/缺货）
  - [x] 库存进度条显示
  - [x] 支持按名称/编码/型号搜索
  - [x] 支持按分类筛选
  - [x] 显示库存统计卡片（总数、正常、预警、缺货、总价值）
- **关联页面**: /admin/spareparts

### F011: 备件详情查看
- **用户故事**: 作为库管员，我希望查看备件的详细信息，包括入库出库记录
- **验收标准**:
  - [x] 展示备件完整信息
  - [x] 显示库存状态和进度条
  - [x] 显示入库记录列表
  - [x] 显示出库记录列表
- **关联页面**: /admin/spareparts/[id]

### F012: 入库/出库记录
- **用户故事**: 作为库管员，我希望查看备件的出入库历史记录
- **验收标准**:
  - [x] 表格展示入库记录（单号、类型、数量、单价、总价、供应商等）
  - [x] 表格展示出库记录（单号、类型、数量、关联单据、领用人等）
- **关联页面**: /admin/spareparts/[id]

### F013: 保养计划列表
- **用户故事**: 作为设备管理员，我希望查看所有保养计划和任务
- **验收标准**:
  - [x] Tab 切换查看保养计划和保养任务
  - [x] 表格展示任务信息（编号、设备、类型、内容、计划日期、负责人、状态等）
  - [x] 支持按编号/设备/内容搜索
  - [x] 支持按状态筛选
  - [x] 显示统计卡片（计划数、执行中、已完成等）
- **关联页面**: /admin/maintenance

### F014: 保养任务详情
- **用户故事**: 作为保养人员，我希望查看保养任务的详细信息
- **验收标准**:
  - [x] 展示任务完整信息（任务编号、设备、保养内容、标准、时间等）
  - [x] 显示保养结果（发现问题、使用备件等）
  - [x] 显示处理时间轴
  - [x] 显示关联计划信息
- **关联页面**: /admin/maintenance/[id]

---

## 四、数据模型概览

| 实体 | 说明 | 主要字段 |
|------|------|----------|
| Equipment | 设备表 | id, code, name, model, manufacturer, category, location, department, status, criticality, purchaseDate, originalValue, responsiblePerson |
| RepairOrder | 维修工单表 | id, orderNo, equipmentId, equipmentName, faultType, faultDescription, priority, status, reporter, reportTime, assignee, assignTime, startTime, endTime, repairDescription, spareParts, laborHours, cost |
| SparePart | 备品备件表 | id, code, name, model, category, unit, manufacturer, supplier, unitPrice, safetyStock, reorderPoint, currentStock, reservedStock, location, warehouse |
| StockInRecord | 入库记录表 | id, orderNo, sparePartId, type, quantity, unitPrice, totalPrice, supplier, warehouse, location, operator, createdAt |
| StockOutRecord | 出库记录表 | id, orderNo, sparePartId, type, quantity, requestId, requestNo, department, operator, receiver, createdAt |
| MaintenancePlan | 保养计划表 | id, planNo, name, equipmentId, type, period, content, standard, estimatedHours, responsiblePerson, priority, nextDate, lastDate, active |
| MaintenanceTask | 保养任务表 | id, taskNo, planId, equipmentId, type, content, standard, scheduledDate, responsiblePerson, priority, status, startTime, endTime, actualHours, result, findings, spareParts |
| InspectionRecord | 点检记录表 | id, recordNo, equipmentId, inspectionDate, inspector, items, summary, status |

### 设备状态枚举
- `running`: 运行中
- `standby`: 待机
- `maintenance`: 保养中
- `repair`: 维修中
- `scrapped`: 已报废

### 工单状态枚举
- `pending`: 待派工
- `assigned`: 已派工
- `processing`: 维修中
- `completed`: 待验收
- `closed`: 已关闭

---

## 五、技术栈

| 分类 | 技术 |
|------|------|
| 前端框架 | Next.js 16 (App Router) |
| UI 组件 | Ant Design 5.x |
| 样式 | Tailwind CSS 4.x |
| 图标 | @ant-design/icons |
| 日期处理 | dayjs |
| 类型系统 | TypeScript |
| 数据存储 | 内存模拟数据 |

---

## 六、UI 设计规范

基于《慧新全智线上UI设计规范 2.0》：

### 颜色
- 主色: `#00405C` (深蓝色)
- 点击色: `#0097BA` (蓝色)
- 成功色: `#2BA471` (绿色)
- 警告色: `#E37318` (橙色)
- 错误色: `#D54941` (红色)

### 字体
- 中文字体: HarmonyOS Sans, 思源黑体
- 字号: H1(36px), H2(24px), H3(20px), H4(18px), 正文(14px), 辅助(12px)

### 栅格
- 有效显示区域: 1128px
- 列宽: 72px
- 沟宽: 24px
- 网格: 8px

### 间距
- 基础单位: 4px
- 常用间距: 8px, 12px, 16px, 20px, 24px, 28px, 32px, 40px

---

## 七、变更历史

| 日期 | 版本 | 变更内容 | 操作人 |
|------|------|----------|--------|
| 2026-02-03 | 1.0 | 初始版本，完成设备台账和维修管理基础功能 | AI |
| 2026-02-03 | 1.1 | 新增备品备件管理模块：库存查询、详情查看、出入库记录 | AI |
| 2026-02-03 | 1.2 | 新增维护保养管理模块：保养计划、保养任务、点检记录 | AI |
