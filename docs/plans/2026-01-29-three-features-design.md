# 三个功能实现设计文档

> 设计日期: 2026-01-29
> 设计师: AI Assistant
> 状态: 待实现

---

## 目录

1. [功能1：报价单列表增加"报告时间"列](#功能1报价单列表增加报告时间列)
2. [功能2：外包管理菜单优化](#功能2外包管理菜单优化)
3. [功能3：样品标签生成增强](#功能3样品标签生成增强)

---

## 功能1：报价单列表增加"报告时间"列

### 背景
这是客户的时间要求，需要在报价单列表显示，包括前序单据（业务咨询等）和后续单据（任务等）都需要这个时间。

### 1.1 数据库设计

#### 新增字段

| 表名 | 字段名 | 类型 | 说明 |
|------|--------|------|------|
| `biz_consultation` | `clientReportDeadline` | `DateTime?` | 客户报告截止日期 |
| `biz_quotation` | `clientReportDeadline` | `DateTime?` | 客户报告截止日期 |
| `biz_contract` | `clientReportDeadline` | `DateTime?` | 客户报告截止日期 |
| `biz_entrustment` | `clientReportDeadline` | `DateTime?` | 客户报告截止日期 |
| `biz_test_task` | `clientReportDeadline` | `DateTime?` | 客户报告截止日期 |

#### 数据继承逻辑

```
咨询（手动输入）
  ↓
报价单（继承自咨询，可编辑）
  ↓
委托单（继承自报价，可编辑）
  ↓
检测任务（继承自委托，可编辑）
```

**字段命名：** 使用 `clientReportDeadline`（客户报告截止日期），与 `expectedDeadline` 区分。

**可编辑规则：**
- 咨询单：手动输入
- 报价单：默认继承，可编辑
- 委托单/任务：默认继承，可编辑

### 1.2 API后端修改

#### 修改清单

1. **POST /api/consultation** - 创建咨询单
   - 接收 `clientReportDeadline` 字段
   - 如果未提供，使用 `expectedDeadline` 作为默认值

2. **POST /api/quotation** - 创建报价单
   - 从咨询单继承：查询 `consultationNo` 对应的咨询单，复制其 `clientReportDeadline`
   - 支持手动编辑：允许前端传入覆盖值
   - 直接创建：允许手动输入 `clientReportDeadline`

3. **PUT /api/quotation/:id** - 更新报价单
   - 允许修改 `clientReportDeadline` 字段

4. **POST /api/entrustment** - 创建委托单
   - 从报价单继承：通过 `quotationId` 查询报价单，复制其 `clientReportDeadline`
   - **可编辑**：前端允许修改此字段

5. **POST /api/test-task** - 创建检测任务
   - 从委托单继承：通过 `entrustmentId` 查询委托单，复制其 `clientReportDeadline`

#### 返回字段增强

- 所有列表和详情接口在返回数据时包含 `clientReportDeadline` 字段
- 格式：ISO 8601 字符串（如 `2025-03-15T00:00:00.000Z`）

### 1.3 前端UI修改

#### 页面修改清单

1. **业务咨询页面** (`/entrustment/consultation/page.tsx`)
   - **表格列**：在"创建时间"前新增"报告时间"列（120px宽）
   - **表单**：在"期望完成时间"旁边新增"客户报告截止日期"日期选择器
   - **显示格式**：`YYYY-MM-DD`（如 `2025-03-15`）

2. **报价单页面** (`/entrustment/quotation/page.tsx`)
   - **表格列**：在"创建日期"前新增"报告时间"列
   - **新增/编辑表单**：
     - 从咨询单生成时：自动填充，显示为可编辑
     - 直接创建时：可编辑的日期选择器
   - **查看详情**：在"报价日期"旁边显示"客户报告截止日期"

3. **委托单页面** (`/entrustment/list/page.tsx`)
   - **表格列**：在"创建时间"前新增"报告时间"列
   - **详情页面**：显示为可编辑的日期选择器

4. **检测任务页面** (`/test/task/page.tsx`)
   - **表格列**：在"创建日期"前新增"报告时间"列
   - **卡片详情**：在"计划日期"旁边显示"客户报告截止日期"

#### 样式规范

- 使用红色标记过期时间（`clientReportDeadline < new Date()`）
- 使用橙色标记7天内到期的（`clientReportDeadline - new Date() < 7天`）
- 使用绿色正常显示其他时间

### 1.4 错误处理与测试

#### 错误处理

1. **继承失败处理**
   - 如果源单据（咨询/报价/委托）不存在 `clientReportDeadline`，使用 `expectedDeadline` 作为备选
   - 如果两者都不存在，返回 `null`，前端显示"未设置"

2. **数据验证**
   - 报告时间不能早于当前时间（创建时）
   - 前端显示警告提示："报告时间不能早于今天"

3. **时间格式化**
   - 后端统一返回 ISO 8601 格式
   - 前端统一显示为 `YYYY-MM-DD HH:mm:ss`

#### 测试用例

1. **继承链条测试**
   - 创建咨询（设置报告时间）→ 生成报价 → 生成委托 → 生成任务
   - 验证所有单据的报告时间一致

2. **可编辑测试**
   - 修改报价单报告时间 → 生成委托单
   - 验证委托单显示的是修改后的时间

3. **边界测试**
   - 报告时间为空的情况
   - 报告时间过期的情况

---

## 功能2：外包管理菜单优化

### 背景
修改现有的两个外包管理菜单：
- **委外订单** - 显示所有委外订单
- **我的委外** - 只显示当前登录用户作为"内部负责人"的订单

### 2.1 数据库查询逻辑

#### 关联关系

```
OutsourceOrder
  ↓ (taskId)
TestTask
  ↓ (projectId)
EntrustmentProject
  ↓ (subcontractAssignee)
用户ID
```

#### 查询逻辑

1. **委外订单页面** (`/outsource/order`)
   - **查询条件**：无过滤，显示所有 `OutsourceOrder` 记录
   - **SQL逻辑**：
     ```sql
     SELECT * FROM biz_outsource_order
     ORDER BY createdAt DESC
     ```

2. **我的委外页面** (`/outsource/my`)
   - **查询条件**：通过关联表过滤
   - **SQL逻辑**：
     ```sql
     SELECT DISTINCT oo.*
     FROM biz_outsource_order oo
     INNER JOIN biz_test_task tt ON tt.id = oo.taskId
     INNER JOIN biz_entrustment_project ep ON ep.id = tt.projectId
     WHERE ep.subcontractAssignee = {当前用户ID}
     ORDER BY oo.createdAt DESC
     ```

#### API修改

- **GET /api/outsource-order** - 委外订单列表
  - 新增查询参数：`?filter=my` 只返回当前用户的任务
  - 不带参数：返回所有订单

**字段说明：**
- `subcontractAssignee` 存储的是**用户ID**（String类型）
- 当前用户ID从 session 中获取：`session.user.id`

### 2.2 前端页面修改

#### 页面修改清单

1. **委外订单页面** (`/outsource/order/page.tsx`)
   - **数据获取**：保持不变，调用 `GET /api/outsource-order`
   - **表格列**：新增"内部负责人"列（150px宽）
   - **显示逻辑**：
     - 通过 `taskId` 关联查询 `EntrustmentProject.subcontractAssignee`
     - 显示用户姓名

2. **我的委外页面** (`/outsource/my/page.tsx`)
   - **数据获取**：修改为 `GET /api/outsource-order?filter=my`
   - **API逻辑**：后端根据当前用户ID过滤
   - **页面标题**：保持"我的委外"
   - **统计卡片**：只统计当前用户的任务数量

#### 新增"内部负责人"列的渲染

```tsx
{
  title: '内部负责人',
  key: 'managerName',
  width: 150,
  render: (_, record) => {
    const managerName = record.task?.project?.subcontractAssigneeName || '-'
    return managerName
  }
}
```

#### 数据结构增强

- API返回时需要包含关联数据：`task.project.subcontractAssigneeName`

### 2.3 错误处理与测试

#### 错误处理

1. **未登录用户处理**
   - "我的委外"页面：如果未登录，重定向到登录页
   - 返回 401 状态码，前端处理跳转

2. **关联数据缺失处理**
   - 如果 `taskId` 为空，显示"-"（内部负责人列）
   - 如果关联的 `TestTask` 或 `EntrustmentProject` 被删除，不影响订单显示

3. **性能优化**
   - SQL查询使用 `JOIN` 而非多次查询
   - 添加索引：`biz_outsource_order(taskId)`

#### 测试用例

1. **权限测试**
   - 用户A登录 → "我的委外"只显示A负责的订单
   - 管理员登录 → "委外订单"显示所有订单

2. **关联测试**
   - 创建委托单 → 分配项目给用户A → 生成外包订单
   - 验证订单出现在A的"我的委外"中

3. **边界测试**
   - 没有任何委外订单的用户
   - 任务被删除后的委外订单显示

---

## 功能3：样品标签生成增强

### 背景
在一维码下面增加"检测项目"字段显示，多行显示，每个检测项目单独一行。

### 3.1 数据查询与组件修改

#### 数据查询逻辑

1. **查询样品检测项**
   - API调用：`GET /api/sample-test-item?bizType=sample_receipt&bizId={sampleId}`
   - 返回数据：`SampleTestItem[]` 数组
   - 每项包含：`testItemName`（检测项目名称）

2. **标签预览时的数据加载**
   - 打开标签弹窗时，自动查询该样品的检测项
   - 加载状态：显示"加载中..."提示

#### 组件修改

**文件位置：** `src/app/(dashboard)/sample/receipt/page.tsx`

**修改点1：新增状态管理**
```tsx
const [labelTestItems, setLabelTestItems] = useState<string[]>([])
```

**修改点2：显示标签时查询检测项**
```tsx
const handleShowLabel = async (record: Sample) => {
  setLabelSample(record)
  setLabelModalOpen(true)

  // 查询检测项目
  try {
    const res = await fetch(`/api/sample-test-item?bizType=sample_receipt&bizId=${record.id}`)
    const json = await res.json()
    if (json.success && json.data) {
      const testItems = json.data.map((item: any) => item.testItemName)
      setLabelTestItems(testItems)
    }
  } catch (e) {
    console.error('加载检测项失败', e)
    setLabelTestItems([])
  }
}
```

**修改点3：标签UI渲染（一维码下方增加检测项）**
```tsx
<div ref={labelRef} style={{ padding: 24, textAlign: 'center', background: '#fff' }}>
  <Barcode {...props} />
  <div style={{ marginTop: 12 }}>
    <div><strong>样品编号:</strong> {labelSample?.sampleNo}</div>
    <div><strong>样品名称:</strong> {labelSample?.name}</div>

    {/* 新增：检测项目多行显示 */}
    {labelTestItems.length > 0 && (
      <>
        <div style={{ marginTop: 8, fontWeight: 'bold', fontSize: 12 }}>检测项目:</div>
        {labelTestItems.map((item, index) => (
          <div key={index} style={{ fontSize: 11, lineHeight: 1.4 }}>
            {index + 1}. {item}
          </div>
        ))}
      </>
    )}
  </div>
</div>
```

### 3.2 样式优化与错误处理

#### 样式优化

1. **标签尺寸调整**
   - Modal宽度：保持 `width={400}` 或微调为 `width={420}`
   - 标签内容区域：`minHeight: 200px`（防止内容跳动）

2. **字体大小规范**
   - 一维码下方字段：`fontSize: 12px`（加粗）
   - 检测项目序号：`fontSize: 11px`（正常）
   - 检测项目名称：`fontSize: 11px`（正常）

3. **间距优化**
   - 样品信息与检测项目之间：`marginTop: 8px`
   - 检测项目列表内：`lineHeight: 1.4`（行间距）

#### 完整样式代码

```tsx
<div ref={labelRef} style={{
  padding: 24,
  textAlign: 'center',
  background: '#fff',
  minHeight: 200
}}>
  <Barcode
    value={labelSample?.sampleNo || 'SAMPLE'}
    width={2}
    height={60}
    displayValue={true}
    fontSize={14}
  />
  <div style={{ marginTop: 12, fontSize: 12 }}>
    <div><strong>样品编号:</strong> {labelSample?.sampleNo}</div>
    <div><strong>样品名称:</strong> {labelSample?.name}</div>

    {labelTestItems.length > 0 && (
      <div style={{ marginTop: 8, textAlign: 'left' }}>
        <div style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 12 }}>
          检测项目:
        </div>
        {labelTestItems.map((item, index) => (
          <div key={index} style={{
            fontSize: 11,
            lineHeight: 1.4,
            paddingLeft: 8
          }}>
            {index + 1}. {item}
          </div>
        ))}
      </div>
    )}
  </div>
</div>
```

#### 错误处理

1. **无检测项处理**
   - 如果 `labelTestItems` 为空数组，不显示检测项目区域
   - 不显示"无检测项"提示，保持标签简洁

2. **加载失败处理**
   - catch块中记录错误日志
   - 设置 `setLabelTestItems([])` 确保UI正常显示

3. **超长检测项名称处理**
   - 使用 `textOverflow: 'ellipsis'` 截断过长的名称
   - 每行最多显示 20 个字符，超出显示"..."

#### 测试用例

1. **正常场景**
   - 样品有3个检测项，标签显示完整信息

2. **边界场景**
   - 样品没有检测项（不显示检测项目区域）
   - 样品有10个检测项（标签自动增高）

3. **异常场景**
   - API请求失败（捕获错误，显示基本信息）
   - 检测项名称超长（自动截断）

---

## 实施计划

### 优先级排序

1. **功能3（样品标签）** - 最简单，独立性强，可快速实现
2. **功能2（外包管理）** - 中等难度，主要是查询逻辑修改
3. **功能1（报告时间）** - 最复杂，涉及多个表和API的修改

### 预计工作量

| 功能 | 数据库修改 | API修改 | 前端修改 | 测试 | 总计 |
|------|-----------|---------|----------|------|------|
| 功能1 | 2小时 | 4小时 | 3小时 | 2小时 | 11小时 |
| 功能2 | 0小时 | 2小时 | 2小时 | 1小时 | 5小时 |
| 功能3 | 0小时 | 0小时 | 2小时 | 1小时 | 3小时 |
| **合计** | **2小时** | **6小时** | **7小时** | **4小时** | **19小时** |

### 技术栈

- **数据库**: MySQL + Prisma ORM
- **后端**: Next.js API Routes
- **前端**: Next.js 15 + React 18 + Ant Design 5 + TypeScript
- **标签生成**: react-barcode + html-to-image

---

## 附录

### 相关文件清单

#### 功能1
- `prisma/schema.prisma` - 数据库schema
- `src/app/api/consultation/route.ts` - 咨询API
- `src/app/api/quotation/route.ts` - 报价API
- `src/app/api/entrustment/route.ts` - 委托API
- `src/app/api/test-task/route.ts` - 任务API
- `src/app/(dashboard)/entrustment/consultation/page.tsx` - 咨询页面
- `src/app/(dashboard)/entrustment/quotation/page.tsx` - 报价页面
- `src/app/(dashboard)/entrustment/list/page.tsx` - 委托页面
- `src/app/(dashboard)/test/task/page.tsx` - 任务页面

#### 功能2
- `src/app/api/outsource-order/route.ts` - 外包订单API
- `src/app/(dashboard)/outsource/order/page.tsx` - 委外订单页面
- `src/app/(dashboard)/outsource/my/page.tsx` - 我的委外页面

#### 功能3
- `src/app/(dashboard)/sample/receipt/page.tsx` - 样品收样页面
- `src/app/api/sample-test-item/route.ts` - 样品检测项API

---

**文档版本**: 1.0
**最后更新**: 2026-01-29
