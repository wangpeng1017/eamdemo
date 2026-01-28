# 业务流程优化设计文档

> 创建日期: 2026-01-28
> 设计目标: 优化报价/合同/委托单关系、完善审批流功能、控制PDF生成、业务单位审批

---

## 一、需求概述

### 1.1 需求背景

**问题1**: 报价单 → 合同 → 委托单，流程固定，合同是必须的
- 实际业务中，合同是可选的
- 希望支持：报价单直接生成委托单（跳过合同）

**问题2**: 审批流驳回功能不完善
- 驳回后没有明确的通知和修改指引
- 缺少驳回历史记录

**问题3**: 报价单PDF生成缺少控制
- 任何人都可以生成PDF
- 缺少审批通过才能生成PDF的控制

**问题4**: 业务单位缺少实际审批流
- 只是在编辑弹框里手动改状态
- 没有真正的审批流程

### 1.2 解决方案

| 问题 | 解决方案 |
|------|----------|
| 报价/合同/委托单关系 | 支持报价单直接生成委托单，合同作为可选环节 |
| 审批流驳回 | 完整的驳回-修改-重新提交闭环，简单记录驳回历史 |
| PDF生成控制 | 审批通过后才能生成PDF，UI层和API层双重控制 |
| 业务单位审批 | 实现1步简单审批流程：管理员审批 |

---

## 二、功能模块设计

### 模块1: 报价/合同/委托单关系优化

#### 2.1.1 业务流程

**流程A：报价单 → 合同 → 委托单**
```
报价单(draft) → 提交审批 → approved
  → 生成委托合同 → 生成委托单
  - sourceType = 'contract'
  - sourceId = contract.id
  - contractNo = contract.contractNo
```

**流程B：报价单 → 委托单（跳过合同）**
```
报价单(draft) → 提交审批 → approved
  → 直接生成委托单
  - sourceType = 'quotation'
  - sourceId = quotation.id
  - quotationNo = quotation.quotationNo
  - contractNo = null
```

#### 2.1.2 数据库变更

```prisma
model Entrustment {
  id            String    @id @default(cuid())
  entrustmentNo String    @unique @db.VarChar(50)

  // 现有字段
  contractNo    String?   @db.VarChar(50)
  contract      Contract? @relation(fields: [contractNo], references: [contractNo])

  // ✅ 新增：来源追踪
  sourceType      String?  @db.VarChar(20)  // contract/quotation/direct
  sourceId        String?  @db.VarChar(50)  // 来源单据ID
  sourceNo        String?  @db.VarChar(50)  // 来源单据号（冗余）

  // ✅ 新增：报价单关联
  quotationNo     String?  @db.VarChar(50)  // 报价单号
  quotationId     String?  @db.VarChar(50)  // 报价单ID
  quotation       Quotation? @relation(fields: [quotationId], references: [id])

  // 其他字段...
  clientId      String?
  client        Client?   @relation(fields: [clientId], references: [id])
  contactPerson String?
  sampleDate    DateTime?
  follower      String?
  status        String    @default("pending")

  @@index([quotationId])
  @@index([sourceType])
  @@map("biz_entrustment")
}
```

#### 2.1.3 API设计

**新增API：从报价单直接生成委托单**
```typescript
// POST /api/quotation/[id]/create-entrustment

// 请求参数（可选）
{
  remark?: string  // 备注
}

// 响应
{
  success: true,
  data: {
    entrustmentNo: "WT20260128001",
    quotationNo: "BJ20260128001",
    sourceType: "quotation",
    // ... 其他字段
  }
}
```

**复制逻辑**：
```typescript
// 从报价单复制的字段
const copyFields = {
  clientId: quotation.clientId,
  contactPerson: quotation.clientContactPerson,
  follower: quotation.follower,
  remark: quotation.clientRemark,

  // 来源信息
  sourceType: 'quotation',
  sourceId: quotation.id,
  sourceNo: quotation.quotationNo,
  quotationNo: quotation.quotationNo,
}

// 复制样品检测项明细
const projects = quotation.items.map(item => ({
  sampleName: item.sampleName,
  sampleModel: item.sampleModel,
  sampleMaterial: item.sampleMaterial,
  sampleQuantity: item.sampleQuantity,
  testItemIds: item.testItemIds,
  price: item.price,
  // ...
}))
```

#### 2.1.4 UI变更

**报价单列表操作列**：
```tsx
<Space>
  {/* 现有按钮 */}
  <Button onClick={() => handleGenerateContract(record)}>
    生成委托合同
  </Button>

  {/* ✅ 新增按钮 */}
  <Button
    type="primary"
    onClick={() => handleCreateEntrustment(record)}
    disabled={record.status !== 'approved'}
  >
    生成委托单
  </Button>

  <Button onClick={() => handleView(record)}>查看</Button>
</Space>
```

---

### 模块2: 审批流驳回功能

#### 2.2.1 驳回流程

```
1. 审批人点击"驳回"按钮
   ↓
2. 弹出对话框，要求填写驳回原因（必填）
   ↓
3. 系统更新单据：
   - status = 'rejected'
   - rejectedCount += 1
   - lastRejectReason = 用户输入的原因
   - lastRejectBy = 当前用户ID
   - lastRejectAt = 当前时间
   ↓
4. 发送通知给发起人
   ↓
5. 发起人看到"已驳回"标签和驳回原因
   ↓
6. 发起人点击"修改"，打开编辑弹窗
   - 显示红色警告条：驳回原因
   - 要求：必须修改内容或添加说明
   ↓
7. 发起人修改后点击"重新提交"
   - 清除驳回标记
   - status = 'pending'
```

#### 2.2.2 数据库变更

```prisma
// 所有需要审批的单据表添加
model Quotation {  // Contract, Entrustment, Client 等类似
  // ... 现有字段

  // ✅ 新增：驳回记录
  rejectedCount    Int      @default(0)      // 驳回次数
  lastRejectReason String?  @db.Text         // 最后一次驳回原因
  lastRejectBy     String?  @db.VarChar(50)  // 最后一次驳回人
  lastRejectAt     DateTime?                 // 最后一次驳回时间
}
```

#### 2.2.3 API设计

**驳回API**：
```typescript
// POST /api/quotation/[id]/reject
{
  rejectReason: string  // 必填
}

// 响应
{
  success: true,
  data: {
    rejectedCount: 1,
    lastRejectReason: "检测项目单价过低",
    lastRejectBy: "张经理",
    lastRejectAt: "2026-01-28T10:30:00Z"
  }
}
```

**重新提交API**：
```typescript
// POST /api/quotation/[id]/resubmit
{
  ...quotationData,  // 单据修改后的完整数据
  modificationNote?: string  // 发起人修改说明（可选）
}
```

#### 2.2.4 UI设计

**驳回确认弹窗**：
```tsx
<Modal title="驳回单据">
  <Form form={form}>
    <Form.Item
      name="rejectReason"
      label="驳回原因"
      rules={[{ required: true, message: '请填写驳回原因' }]}
    >
      <Input.TextArea
        placeholder="请详细说明驳回原因，以便发起人修改..."
        rows={4}
      />
    </Form.Item>
  </Form>

  <Button type="primary" danger onClick={handleReject}>
    确认驳回
  </Button>
</Modal>
```

**列表页驳回状态显示**：
```tsx
{
  title: '状态',
  render: (_, record) => {
    if (record.status === 'rejected') {
      return (
        <Space direction="vertical">
          <Tag color="error">已驳回</Tag>
          <Tooltip title={record.lastRejectReason}>
            <Text type="secondary" ellipsis>
              {record.lastRejectReason}
            </Text>
          </Tooltip>
          <Text type="secondary" style={{ fontSize: 12 }}>
            驳回人: {record.lastRejectBy} •
            {dayjs(record.lastRejectAt).format('MM-DD HH:mm')}
          </Text>
        </Space>
      )
    }
    return <Tag color={STATUS_COLOR_MAP[record.status]}>
      {STATUS_TEXT_MAP[record.status]}
    </Tag>
  }
}
```

**编辑弹窗驳回警告**：
```tsx
{record.status === 'rejected' && (
  <Alert
    type="error"
    message="此单据已被驳回"
    description={
      <div>
        <p><strong>驳回原因:</strong> {record.lastRejectReason}</p>
        <p><strong>驳回人:</strong> {record.lastRejectBy}</p>
        <p style={{ color: '#ff4d4f' }}>
          ⚠️ 请修改内容或添加说明后重新提交
        </p>
      </div>
    }
    showIcon
  />
)}
```

**重新提交验证**：
```typescript
const handleResubmit = async () => {
  const values = await form.validateFields()

  if (record.status === 'rejected') {
    const hasChanges = checkIfChanged(values, record)
    const hasNote = values.modificationNote?.trim()

    if (!hasChanges && !hasNote) {
      message.error('请修改单据内容或添加修改说明！')
      return
    }
  }

  await submit(values)
}
```

---

### 模块3: 报价单PDF生成审批控制

#### 2.3.1 状态流转控制

```typescript
type QuotationStatus =
  | 'draft'      // 草稿
  | 'pending'    // 审批中
  | 'approved'   // 审批通过 ✅ 可生成PDF
  | 'rejected'   // 已驳回
  | 'archived'   // 已归档
```

**状态流转**：
```
draft → pending      // 提交审批
pending → approved   // 审批通过 ✅
pending → rejected   // 审批驳回
rejected → pending   // 重新提交
approved → archived  // 归档
```

#### 2.3.2 API层验证

```typescript
// POST /api/quotation/[id]/generate-pdf
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  // 查询报价单
  const quotation = await prisma.quotation.findUnique({
    where: { id }
  })

  // ✅ 验证审批状态
  if (quotation.status !== 'approved') {
    return NextResponse.json(
      {
        success: false,
        error: `报价单尚未审批通过，当前状态：${quotation.status}`,
        currentStatus: quotation.status
      },
      { status: 403 }
    )
  }

  // 生成PDF
  const pdfUrl = await generateQuotationPDF(quotation)

  return NextResponse.json({ success: true, data: { pdfUrl } })
}
```

#### 2.3.3 UI层控制

**生成PDF按钮**：
```tsx
<Button
  type="primary"
  icon={<FilePdfOutlined />}
  onClick={handleGeneratePDF}
  disabled={quotation.status !== 'approved'}
>
  生成PDF
</Button>

{/* 未通过审批时的提示 */}
{quotation.status !== 'approved' && (
  <Tooltip title={
    quotation.status === 'draft'
      ? '请先提交审批'
      : quotation.status === 'pending'
      ? '审批中，审批通过后可生成PDF'
      : '已驳回，修改并重新审批后可生成PDF'
  }>
    <InfoCircleOutlined />
  </Tooltip>
)}
```

**状态标签**：
```tsx
const STATUS_MAP = {
  draft: { text: '草稿', color: 'default' },
  pending: { text: '审批中', color: 'processing' },
  approved: { text: '已通过', color: 'success' },
  rejected: { text: '已驳回', color: 'error' },
  archived: { text: '已归档', color: 'default' }
}

<Tag color={STATUS_MAP[status].color}>
  {STATUS_MAP[status].text}
</Tag>
```

---

### 模块4: 业务单位审批流

#### 2.4.1 审批流程

```
创建业务单位 → 提交审批 → 管理员审批 → 通过/拒绝
                                      ↓
                               status = 'approved'
                               (可以正常使用该客户)
```

**状态定义**：
```typescript
type ClientStatus =
  | 'draft'      // 草稿
  | 'pending'    // 审批中
  | 'approved'   // 已通过
  | 'rejected'   // 已驳回
```

#### 2.4.2 权限控制

```typescript
// 审批人配置
const APPROVERS = ['admin', 'manager']

// 权限验证
export async function checkApprovalPermission(request: NextRequest) {
  const session = await auth()
  return session?.user && APPROVERS.includes(session.user.role)
}
```

#### 2.4.3 API设计

**提交审批**：
```typescript
// POST /api/client/[id]/submit

// 验证：
// 1. 只有创建人可以提交
// 2. 只能从draft状态提交

// 响应
{
  success: true,
  data: {
    status: 'pending',
    approvalStatus: 'pending',
    approvalStep: 1
  }
}
```

**审批**：
```typescript
// POST /api/client/[id]/approve
{
  action: 'approve' | 'reject',
  reason?: string  // 驳回时必填
}

// 验证：
// 1. 必须有审批权限（admin/manager）
// 2. 只能审批pending状态

// 响应
{
  success: true,
  data: {
    status: 'approved',  // 或 'rejected'
    lastRejectReason?: string
  }
}
```

#### 2.4.4 UI设计

**操作列按钮**：
```tsx
{/* 草稿状态：创建人可以提交审批 */}
{record.status === 'draft' &&
 record.createdById === user?.id && (
  <Button type="primary" onClick={() => handleSubmit(record)}>
    提交审批
  </Button>
)}

{/* 审批中：管理员可以审批 */}
{record.status === 'pending' &&
 APPROVERS.includes(user?.role) && (
  <Space>
    <Button type="primary" onClick={() => handleApprove(record, 'approve')}>
      通过
    </Button>
    <Button danger onClick={() => handleApprove(record, 'reject')}>
      驳回
    </Button>
  </Space>
)}

{/* 已驳回：创建人可以修改并重新提交 */}
{record.status === 'rejected' &&
 record.createdById === user?.id && (
  <Button type="primary" onClick={() => handleResubmit(record)}>
    重新提交
  </Button>
)}
```

**审批弹窗**：
```tsx
<Modal title="审批业务单位">
  <Form form={form}>
    <Form.Item name="action" label="审批决定">
      <Radio.Group>
        <Radio value="approve">通过</Radio>
        <Radio value="reject">驳回</Radio>
      </Radio.Group>
    </Form.Item>

    {/* 驳回时显示原因输入框 */}
    <Form.Item
      noStyle
      shouldUpdate={(prev, curr) => prev.action !== curr.action}
    >
      {({ getFieldValue }) =>
        getFieldValue('action') === 'reject' && (
          <Form.Item
            name="reason"
            label="驳回原因"
            rules={[{ required: true, message: '请填写驳回原因' }]}
          >
            <Input.TextArea rows={4} />
          </Form.Item>
        )
      }
    </Form.Item>
  </Form>
</Modal>
```

---

## 三、实施计划

### 3.1 优先级排序

| 模块 | 优先级 | 预计工时 | 原因 |
|------|--------|----------|------|
| 模块3: PDF生成控制 | P0 | 2h | 最简单，立即可用 |
| 模块2: 审批驳回 | P1 | 4h | 核心功能，影响用户体验 |
| 模块4: 业务单位审批 | P1 | 3h | 完善审批流程 |
| 模块1: 报价合同委托 | P2 | 6h | 业务流程调整，需要测试 |

**总计**: 约15小时

### 3.2 实施步骤

**阶段1：准备工作**
1. 数据库Schema变更
2. 运行 `npx prisma db push`
3. 创建设计文档

**阶段2：核心功能**
1. 实现模块3（PDF生成控制）
2. 实现模块2（审批驳回）
3. 实现模块4（业务单位审批）

**阶段3：业务流程**
1. 实现模块1（报价/合同/委托单关系）
2. 联调测试
3. 编写文档

**阶段4：部署验证**
1. 本地测试
2. 部署到测试环境
3. 用户验收

---

## 四、验收标准

### 4.1 模块1验收

- [ ] 报价单列表显示"生成委托单"按钮
- [ ] 点击"生成委托单"直接创建委托单（跳过合同）
- [ ] 委托单正确记录来源信息（sourceType、sourceId、quotationNo）
- [ ] 委托单正确复制客户信息和样品检测项
- [ ] 原有的"报价单→合同→委托单"流程仍可正常使用

### 4.2 模块2验收

- [ ] 审批人可以驳回单据，必须填写驳回原因
- [ ] 发起人看到驳回标签和驳回原因
- [ ] 发起人修改单据后可重新提交
- [ ] 重新提交前验证是否修改或添加说明
- [ ] 驳回历史正确记录（rejectedCount、lastRejectReason等）

### 4.3 模块3验收

- [ ] draft状态无法生成PDF，提示"请先提交审批"
- [ ] pending状态无法生成PDF，提示"审批中"
- [ ] rejected状态无法生成PDF，提示"已驳回"
- [ ] 只有approved状态可以生成PDF
- [ ] API层也验证状态，绕过前端也无法生成

### 4.4 模块4验收

- [ ] 创建业务单位后状态为draft
- [ ] 创建人可以提交审批
- [ ] 管理员可以看到审批中的业务单位
- [ ] 管理员可以审批通过/驳回
- [ ] 驳回后创建人可以修改并重新提交
- [ ] 非管理员无法审批

---

## 五、技术要点

### 5.1 数据一致性

**委托单来源信息**：
- 同时记录 `quotationNo` 和 `contractNo`
- 支持业务演变：先委托后补签合同
- 冗余存储防止源单据删除导致数据丢失

### 5.2 权限控制

**审批权限验证**：
- API层验证：检查用户角色
- UI层控制：根据角色显示/隐藏按钮
- 双重验证确保安全

### 5.3 用户体验

**友好的提示信息**：
- 禁用按钮时显示Tooltip说明原因
- 驳回时红色Alert显示原因
- 操作失败时明确告知下一步操作

### 5.4 状态管理

**状态机模式**：
- 明确的状态流转规则
- 每个状态对应的可执行操作
- 防止非法状态转换

---

## 六、风险评估

### 6.1 技术风险

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| 数据库迁移失败 | 高 | 先在测试环境验证，备份生产数据 |
| 审批流逻辑错误 | 中 | 充分测试各种场景 |
| 权限控制漏洞 | 中 | API和UI双重验证 |

### 6.2 业务风险

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| 用户不适应新流程 | 中 | 提供操作文档，培训 |
| 历史数据兼容性 | 低 | 添加默认值，迁移脚本 |

---

## 七、后续优化

### 7.1 可能的增强

- 支持多级审批（部门→财务→总经理）
- 审批流可视化展示
- 驳回历史完整记录（独立表）
- 移动端审批

### 7.2 性能优化

- 审批通知缓存
- 批量审批功能
- 审批进度实时推送

---

**文档版本**: 1.0
**最后更新**: 2026-01-28
**设计者**: Claude AI
**审核者**: 待定
