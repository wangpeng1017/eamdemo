# 业务咨询评估功能设计文档

> 创建时间: 2026-01-28
> 设计者: AI Assistant
> 状态: 待评审

---

## 一、需求概述

### 1.1 功能描述

在业务咨询模块增加评估功能，允许业务人员发起评估，选择多个评估人员进行可行性评估。评估完成后才能生成报价单。

### 1.2 核心需求

1. **可选评估流程**：可以直接生成报价单，也可以先评估再生成
2. **多人评估**：可以选择多个评估人员（从组织架构中选择）
3. **评估反馈**：评估人必须给出可行性结论（可行/困难/不可行）+ 文字意见
4. **待办展示**：评估人在工作台首页看到待评估的业务咨询
5. **全员反馈**：所有评估人都反馈后，才能生成报价单

---

## 二、数据库设计

### 2.1 新增表：biz_consultation_assessment

```prisma
model ConsultationAssessment {
  id             String       @id @default(cuid())
  consultationId String
  consultation   Consultation @relation(fields: [consultationId], references: [id], onDelete: Cascade)

  // 评估人信息
  assessorId     String       // 评估人用户ID
  assessorName   String       @db.VarChar(50) // 评估人姓名

  // 评估内容
  conclusion     String?      @db.VarChar(20) // feasible/difficult/infeasible
  feedback       String?      @db.Text // 评估意见（文字反馈）

  // 评估轮次（支持多轮评估）
  round          Int          @default(1) // 第几轮评估

  // 状态和时间
  status         String       @default("pending") // pending/completed
  requestedAt    DateTime     @default(now()) // 发起时间
  completedAt    DateTime? // 完成时间
  requestedBy    String       @db.VarChar(50) // 发起人

  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@index([consultationId])
  @@index([assessorId, status])
  @@index([consultationId, round]) // 新增：按咨询单+轮次查询
  @@map("biz_consultation_assessment")
}
```

### 2.2 修改现有表：biz_consultation

**修改字段**：

```prisma
model Consultation {
  // ... 现有字段 ...

  // 修改状态枚举
  status String @default("following")
  // following/assessing/assessment_failed/quoted/rejected/closed

  // 新增关联
  assessments ConsultationAssessment[]

  // ... 其他字段 ...
}
```

**status 状态说明**：
- `following`: 跟进中（可以直接生成报价单或发起评估）
- `assessing`: 评估中（已发起评估，等待所有评估人反馈）**【新增】**
- `assessment_failed`: 评估未通过（所有人都已反馈，但有人给出"不可行"结论）**【新增】**
- `quoted`: 已报价（所有评估人都通过，已生成报价单）
- `rejected`: 已拒绝
- `closed`: 已关闭（评估失败后关闭，或业务人员主动关闭）**【新增】**

**状态流转规则**：
- `following` → 发起评估 → `assessing`
- `assessing` → 所有人反馈且全部通过 → `following`（可以生成报价单）
- `assessing` → 所有人反馈但有人不通过 → `assessment_failed`
- `assessment_failed` → 修改需求并重新评估 → `assessing`（新一轮评估）
- `assessment_failed` → 关闭咨询单 → `closed`
- `following` → 生成报价单 → `quoted`
- `closed` → 终态（不可再变更）

---

## 三、API 接口设计

### 3.1 发起评估

**POST** `/api/consultation/[id]/assessment`

**请求体**：
```json
{
  "assessors": [
    { "id": "user_id_1", "name": "张三" },
    { "id": "user_id_2", "name": "李四" }
  ]
}
```

**响应**：
```json
{
  "success": true,
  "message": "评估已发起，等待 2 人反馈"
}
```

**业务逻辑**：
1. 校验咨询单状态（必须是 `following`）
2. 为每个评估人创建一条 `ConsultationAssessment` 记录（status=pending）
3. 更新咨询单的 `assessmentStatus` 为 `in_progress`

---

### 3.2 提交评估反馈

**POST** `/api/consultation/assessment/[assessmentId]/submit`

**请求体**：
```json
{
  "conclusion": "feasible",  // feasible/difficult/infeasible
  "feedback": "项目可行，预计需要 3 天完成，需要使用光谱仪"
}
```

**响应**：
```json
{
  "success": true,
  "message": "评估反馈已提交"
}
```

**业务逻辑**：
1. 更新评估记录的 `conclusion`、`feedback`、`status=completed`、`completedAt`
2. 检查该咨询的所有评估是否都已完成
3. 如果都已完成：
   - 检查是否有任何评估人给出 `infeasible`（不可行）结论
   - **有不可行** → 更新咨询单 `status` 为 `assessment_failed`
   - **全部通过**（可行或有困难） → 更新咨询单 `status` 为 `following`，可以生成报价单
4. 如果未全部完成，保持 `status` 为 `assessing`

---

### 3.3 查询待评估列表

**GET** `/api/consultation/assessment/my-pending`

**响应**：
```json
{
  "success": true,
  "data": [
    {
      "id": "assessment_id_1",
      "consultationNo": "ZX20260128001",
      "clientName": "奇瑞汽车",
      "testItems": ["拉伸强度测试", "金相分析"],
      "requestedBy": "业务员王五",
      "requestedAt": "2026-01-28 10:00:00"
    }
  ]
}
```

---

### 3.4 查询评估详情

**GET** `/api/consultation/[id]/assessment`

**响应**：
```json
{
  "success": true,
  "data": {
    "consultationId": "xxx",
    "assessmentStatus": "in_progress",
    "assessments": [
      {
        "id": "assessment_id_1",
        "assessorName": "张三",
        "conclusion": "feasible",
        "feedback": "项目可行",
        "status": "completed",
        "completedAt": "2026-01-28 10:30:00"
      },
      {
        "id": "assessment_id_2",
        "assessorName": "李四",
        "conclusion": null,
        "feedback": null,
        "status": "pending",
        "completedAt": null
      }
    ]
  }
}
```

---

### 3.5 修改评估反馈

**PUT** `/api/consultation/assessment/[assessmentId]`

**请求体**：
```json
{
  "conclusion": "difficult",  // 修改后的结论
  "feedback": "项目有一定难度，需要额外购买设备"  // 修改后的意见
}
```

**响应**：
```json
{
  "success": true,
  "message": "评估反馈已更新"
}
```

**业务逻辑**：
1. 验证评估记录是否存在，且当前用户是否为该评估的评估人
2. 更新评估记录的 `conclusion`、`feedback`、`updatedAt`
3. 检查该咨询的所有评估是否都已完成
4. 如果都已完成，重新判断状态：
   - 有 `infeasible` → 咨询单 `status` 为 `assessment_failed`
   - 全部通过 → 咨询单 `status` 为 `following`

**权限控制**：
- 只有评估人本人（`assessorId === currentUserId`）可以修改自己的评估反馈
- 已完成的评估也可以修改（允许评估人更正意见）

---

### 3.6 修改需求并重新评估

**POST** `/api/consultation/[id]/reassess`

**请求体**：
```json
{
  "consultationData": {
    "testItems": ["更新后的检测项目"],
    "clientRequirement": "补充说明的需求",
    // ... 其他需要修改的咨询单字段
  },
  "assessors": [
    { "id": "user_id_1", "name": "张三" },
    { "id": "user_id_2", "name": "李四" }
  ]
}
```

**响应**：
```json
{
  "success": true,
  "message": "已开始第 2 轮评估，等待 2 人反馈",
  "round": 2
}
```

**业务逻辑**：
1. 验证咨询单状态必须为 `assessment_failed`
2. 验证当前用户是否有权限（咨询单跟进人或咨询管理权限）
3. 更新咨询单的业务数据（testItems、clientRequirement等）
4. 查询当前最大轮次，新轮次 = 最大轮次 + 1
5. 为每个评估人创建新的评估记录（round = 新轮次，status = pending）
6. 更新咨询单状态为 `assessing`
7. 返回新轮次号

**注意事项**：
- 旧轮次的评估记录保留，不删除
- 可以选择与上一轮相同或不同的评估人
- 详情页可以查看所有轮次的评估历史

---

### 3.7 关闭咨询单

**POST** `/api/consultation/[id]/close`

**请求体**：
```json
{
  "closeReason": "客户需求无法满足"  // 可选，关闭原因
}
```

**响应**：
```json
{
  "success": true,
  "message": "咨询单已关闭"
}
```

**业务逻辑**：
1. 验证咨询单状态（通常从 `assessment_failed` 关闭，也可从其他状态关闭）
2. 验证当前用户是否有权限（咨询单跟进人或咨询管理权限）
3. 更新咨询单状态为 `closed`
4. 可选：记录关闭原因到备注字段

**权限控制**：
- 只有咨询单跟进人或有"咨询管理"权限的用户可以关闭
- `closed` 状态为终态，关闭后不可重新打开

---

## 四、前端界面设计

### 4.1 业务咨询列表页 - 新增"评估"按钮

**位置**：`/entrustment/consultation` 表格操作列

**按钮逻辑**：
- 显示条件：`status === 'following'` 且 `assessmentStatus !== 'in_progress'`
- 点击后：打开评估人选择弹窗

### 4.2 评估人选择弹窗

**组件**：`ConsultationAssessmentModal.tsx`

**内容**：
```tsx
<Modal title="发起评估" open={open} onOk={handleSubmit}>
  <p>业务咨询：{consultationNo}</p>
  <p>客户：{clientName}</p>
  <Form.Item label="选择评估人" required>
    <UserSelect
      mode="multiple"
      placeholder="请选择评估人（可多选）"
      value={selectedAssessors}
      onChange={setSelectedAssessors}
    />
  </Form.Item>
  <Alert
    message="提示"
    description="所有评估人都反馈后，才能生成报价单"
    type="info"
  />
</Modal>
```

### 4.3 工作台待办 - 待评估列表

**位置**：`/dashboard` 工作台首页

**新增卡片**：
```tsx
<Card title="待我评估" extra={<Link href="/entrustment/consultation?tab=my-assessment">查看全部</Link>}>
  <List
    dataSource={myAssessments}
    renderItem={item => (
      <List.Item
        actions={[<Button onClick={() => handleOpenAssessment(item)}>去评估</Button>]}
      >
        <List.Item.Meta
          title={`${item.consultationNo} - ${item.clientName}`}
          description={`发起人：${item.requestedBy} | 时间：${item.requestedAt}`}
        />
      </List.Item>
    )}
  />
</Card>
```

### 4.4 评估反馈弹窗

**组件**：`AssessmentFeedbackModal.tsx`

**内容**：
```tsx
<Modal title="评估反馈" open={open} onOk={handleSubmit}>
  <Descriptions title="业务咨询信息">
    <Descriptions.Item label="咨询单号">{consultationNo}</Descriptions.Item>
    <Descriptions.Item label="客户">{clientName}</Descriptions.Item>
    <Descriptions.Item label="检测项目">{testItems.join('、')}</Descriptions.Item>
  </Descriptions>

  <Form form={form} layout="vertical">
    <Form.Item
      name="conclusion"
      label="可行性评估"
      rules={[{ required: true, message: '请选择可行性结论' }]}
    >
      <Radio.Group>
        <Radio value="feasible">可行</Radio>
        <Radio value="difficult">有困难</Radio>
        <Radio value="infeasible">不可行</Radio>
      </Radio.Group>
    </Form.Item>

    <Form.Item
      name="feedback"
      label="评估意见"
      rules={[{ required: true, message: '请输入评估意见' }]}
    >
      <Input.TextArea
        rows={4}
        placeholder="请详细说明评估结论的原因、所需资源、预计工期等"
      />
    </Form.Item>
  </Form>
</Modal>
```

### 4.5 评估进度展示

**位置**：业务咨询详情抽屉

**内容**：
```tsx
<Divider>评估进度</Divider>
{consultation.assessmentStatus === 'not_started' && (
  <Empty description="暂未发起评估" />
)}
{consultation.assessmentStatus !== 'not_started' && (
  <>
    <Progress
      percent={(completedCount / totalCount) * 100}
      format={() => `${completedCount}/${totalCount} 人已反馈`}
    />
    <Timeline style={{ marginTop: 16 }}>
      {assessments.map(item => (
        <Timeline.Item
          key={item.id}
          color={item.status === 'completed' ? 'green' : 'gray'}
        >
          <div>
            <strong>{item.assessorName}</strong>
            {item.status === 'completed' ? (
              <>
                <Tag color={getConclusionColor(item.conclusion)} style={{ marginLeft: 8 }}>
                  {getConclusionText(item.conclusion)}
                </Tag>
                <div style={{ marginTop: 8, color: '#666' }}>
                  {item.feedback}
                </div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                  {dayjs(item.completedAt).format('YYYY-MM-DD HH:mm:ss')}
                </div>
              </>
            ) : (
              <Tag color="default" style={{ marginLeft: 8 }}>待反馈</Tag>
            )}
          </div>
        </Timeline.Item>
      ))}
    </Timeline>
  </>
)}
```

### 4.6 评估失败后的操作按钮

**位置**：业务咨询详情抽屉，`status === 'assessment_failed'` 时显示

**按钮设计**：
```tsx
{consultation.status === 'assessment_failed' && (
  <Alert
    type="error"
    message="评估未通过"
    description="部分评估人给出了'不可行'的结论，无法生成报价单"
    style={{ marginBottom: 16 }}
  />
)}

{consultation.status === 'assessment_failed' && (
  <Space style={{ marginBottom: 16 }}>
    <Button
      type="primary"
      icon={<EditOutlined />}
      onClick={handleReassess}
    >
      修改需求并重新评估
    </Button>
    <Button
      danger
      icon={<CloseOutlined />}
      onClick={handleClose}
    >
      关闭咨询单
    </Button>
  </Space>
)}
```

### 4.7 修改需求重评弹窗

**组件**：`ReassessmentModal.tsx`

**内容**：
```tsx
<Modal
  title="修改需求并重新评估"
  open={open}
  onOk={handleSubmit}
  width={800}
>
  <Alert
    type="info"
    message="提示"
    description="修改咨询单内容后，将开始新一轮评估。旧的评估记录会被保留。"
    showIcon
    style={{ marginBottom: 16 }}
  />

  <Form form={form} layout="vertical">
    <Form.Item label="检测项目" name="testItems">
      <Select mode="tags" placeholder="请输入或选择检测项目" />
    </Form.Item>

    <Form.Item label="客户需求说明" name="clientRequirement">
      <Input.TextArea
        rows={4}
        placeholder="请详细描述客户的检测需求"
      />
    </Form.Item>

    <Divider />

    <Form.Item
      label="选择评估人"
      name="assessors"
      rules={[{ required: true, message: '请选择评估人' }]}
    >
      <UserSelect
        mode="multiple"
        placeholder="请选择评估人（可多选）"
      />
    </Form.Item>
  </Form>
</Modal>
```

### 4.8 评估结果Tab（详情抽屉）

**位置**：业务咨询详情抽屉，新增 Tab

**Tab设计**：
```tsx
<Tabs>
  <Tabs.TabPane tab="基本信息" key="basic">
    {/* 现有的基本信息内容 */}
  </Tabs.TabPane>

  <Tabs.TabPane
    tab={
      <span>
        评估结果
        {hasAssessments && (
          <Badge
            count={completedCount}
            showZero
            style={{ marginLeft: 8 }}
          />
        )}
      </span>
    }
    key="assessment"
  >
    {/* 评估结果内容 */}
  </Tabs.TabPane>
</Tabs>
```

**评估结果Tab内容**（类似审批流详情交互）：

```tsx
<div style={{ padding: '16px 0' }}>
  {/* 状态总览 */}
  <Alert
    type={getStatusType(consultation.status)}
    message={getStatusMessage(consultation.status)}
    description={getStatusDescription(consultation.status)}
    showIcon
    style={{ marginBottom: 24 }}
  />

  {/* 轮次选择器（如果有多轮评估） */}
  {maxRound > 1 && (
    <div style={{ marginBottom: 16 }}>
      <Space>
        <span>评估轮次：</span>
        <Segmented
          options={Array.from({ length: maxRound }, (_, i) => ({
            label: `第 ${i + 1} 轮`,
            value: i + 1
          }))}
          value={selectedRound}
          onChange={setSelectedRound}
        />
      </Space>
    </div>
  )}

  {/* 当前轮次评估进度 */}
  <div style={{ marginBottom: 24 }}>
    <Progress
      percent={(completedCount / totalCount) * 100}
      status={getProgressStatus(consultation.status, selectedRound)}
      format={() => `${completedCount}/${totalCount} 人已反馈`}
    />
  </div>

  {/* 评估人列表（类似审批流节点） */}
  <Timeline mode="left">
    {assessments
      .filter(item => item.round === selectedRound) // 只显示当前轮次
      .map((item, index) => (
      <Timeline.Item
        key={item.id}
        color={getTimelineColor(item.status, item.conclusion)}
        dot={getTimelineDot(item.status, item.conclusion)}
      >
        <div style={{ paddingBottom: 20 }}>
          {/* 评估人信息 */}
          <div style={{ marginBottom: 8 }}>
            <Space>
              <Avatar size="small" icon={<UserOutlined />} />
              <strong>{item.assessorName}</strong>
              <Tag color={getStatusColor(item.status)}>
                {getStatusText(item.status)}
              </Tag>
              {item.conclusion && (
                <Tag color={getConclusionColor(item.conclusion)}>
                  {getConclusionText(item.conclusion)}
                </Tag>
              )}
              {/* 轮次标记 */}
              {maxRound > 1 && (
                <Tag color="blue">第 {item.round} 轮</Tag>
              )}
            </Space>
          </div>

          {/* 评估时间 */}
          <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>
            {item.status === 'completed' ? (
              <>
                <ClockCircleOutlined /> 完成时间：
                {dayjs(item.completedAt).format('YYYY-MM-DD HH:mm:ss')}
              </>
            ) : (
              <>
                <ClockCircleOutlined /> 发起时间：
                {dayjs(item.requestedAt).format('YYYY-MM-DD HH:mm:ss')}
              </>
            )}
          </div>

          {/* 评估意见 */}
          {item.feedback && (
            <Card
              size="small"
              style={{
                background: '#fafafa',
                border: '1px solid #f0f0f0',
                marginTop: 8
              }}
            >
              <div style={{ whiteSpace: 'pre-wrap' }}>
                {item.feedback}
              </div>
            </Card>
          )}

          {/* 操��按钮（评估人本人可见） */}
          {item.assessorId === currentUserId && item.status === 'completed' && (
            <div style={{ marginTop: 12 }}>
              <Button
                size="small"
                type="link"
                icon={<EditOutlined />}
                onClick={() => handleEditAssessment(item)}
              >
                修改反馈
              </Button>
            </div>
          )}
        </div>
      </Timeline.Item>
    ))}
  </Timeline>

  {/* 空状态 */}
  {assessments.length === 0 && (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description="暂未发起评估"
    />
  )}
</div>
```

**辅助函数**：

```typescript
// 状态颜色映射
const getStatusColor = (status: string) => {
  return {
    pending: 'default',
    completed: 'success'
  }[status] || 'default'
}

// 结论颜色映射
const getConclusionColor = (conclusion: string) => {
  return {
    feasible: 'success',
    difficult: 'warning',
    infeasible: 'error'
  }[conclusion] || 'default'
}

// Timeline dot样式
const getTimelineDot = (status: string, conclusion: string) => {
  if (status === 'pending') {
    return <ClockCircleOutlined style={{ fontSize: 16 }} />
  }
  if (conclusion === 'infeasible') {
    return <CloseCircleOutlined style={{ fontSize: 16, color: '#ff4d4f' }} />
  }
  if (conclusion === 'difficult') {
    return <ExclamationCircleOutlined style={{ fontSize: 16, color: '#faad14' }} />
  }
  return <CheckCircleOutlined style={{ fontSize: 16, color: '#52c41a' }} />
}

// 状态提示消息
const getStatusMessage = (status: string) => {
  return {
    assessing: '评估进行中',
    assessment_failed: '评估未通过',
    following: '评估已完成，可以生成报价单'
  }[status] || ''
}
```

---

## 五、业务流程设计

### 5.1 状态流转图

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                          业务咨询评估流程（含多轮评估）                                      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  [新建咨询]                                                                              │
│      │                                                                                   │
│      ▼                                                                                   │
│  status = following                                                                     │
│      │                                                                                   │
│      ├──────────────┬──────────────┐                                                    │
│      │              │              │                                                    │
│      ▼              ▼              ▼                                                    │
│  [直接生成报价]  [发起评估]    [继续跟进]                                                 │
│                      │                                                                   │
│                      ▼                                                                   │
│              status = assessing (round = 1)                                            │
│              创建N条 ConsultationAssessment (status=pending, round=1)                   │
│                      │                                                                   │
│                      ▼                                                                   │
│              [评估人收到待办]                                                            │
│                      │                                                                   │
│                      ▼                                                                   │
│              [评估人提交反馈]                                                            │
│              更新 status = completed                                                    │
│                      │                                                                   │
│                      ▼                                                                   │
│              [检查是否所有人都已反馈]                                                     │
│                      │                                                                   │
│          ┌───────────┴───────────┐                                                      │
│          │                       │                                                      │
│      所有人反馈                未全部反馈                                                │
│          │                       │                                                      │
│          ▼                       ▼                                                      │
│    [检查结论]              [继续等待]                                                     │
│          │                                                                               │
│   ┌──────┴──────┐                                                                       │
│   │             │                                                                       │
│ 全部可行/有困难  有人不可行                                                              │
│   │             │                                                                       │
│   ▼             ▼                                                                       │
│ status =    status =                                                                    │
│ following   assessment_failed                                                           │
│   │             │                                                                       │
│   │             ├──────────────┬──────────────┐                                        │
│   │             │              │              │                                        │
│   │             ▼              ▼              ▼                                        │
│   │      [修改需求重评]    [关闭咨询]    [业务人员修改]                                  │
│   │             │              │                                                        │
│   │             ▼              ▼                                                        │
│   │      status = assessing   status = closed                                          │
│   │      (round = round+1)    (终态，不可变更)                                           │
│   │      创建新评估记录                                                                  │
│   │      (保留旧记录)                                                                    │
│   │             │                                                                       │
│   │             └──────────────┐                                                        │
│   │                            │                                                        │
│   ▼                            ▼                                                        │
│  [可以生成报价单]          [回到评估流程]                                                 │
│   │                                                                                     │
│   ▼                                                                                     │
│ status = quoted                                                                         │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

**关键状态说明**：
- `following`: 跟进中 → 可发起评估或直接生成报价
- `assessing`: 评估中 → 等待所有评估人反馈
- `assessment_failed`: 评估未通过 → 可修改重评或关闭
- `closed`: 已关闭 → **终态**，不可再变更
- `quoted`: 已报价 → 评估通过，报价单已生成

### 5.2 权限控制

| 操作 | 权限要求 |
|------|----------|
| 发起评估 | 咨询单的跟进人 或 有"咨询管理"权限的用户 |
| 提交评估反馈 | 被指定为评估人的用户 |
| 查看评估结果 | 咨询单的跟进人 或 有"咨询管理"权限的用户 |

### 5.3 业务规则

1. **评估发起时机**：
   - 只有状态为 `following` 的咨询单可以发起评估
   - 如果已经发起过评估且未完成，不能重复发起
   - 可以选择 1~N 个评估人

2. **评估反馈要求**：
   - 评估人必须给出结论（可行/有困难/不可行）
   - 评估意见为必填项
   - **提交后允许修改**（评估人可以更正自己的反馈意见）
   - 修改权限：只有评估人本人可以修改自己的评估反馈

3. **生成报价单限制**：
   - 如果 `status = assessing`（评估中），**不能生成报价单**
   - 如果 `status = assessment_failed`（评估未通过），**不能生成报价单**
   - 如果 `status = following` 或未发起评估，可以生成报价单

4. **评估结果影响**：
   - 评估结果会显示在咨询详情的"评估结果"Tab中
   - 如果有任何评估人给出"不可行"结论，咨询单状态自动变为 `assessment_failed`
   - `assessment_failed` 状态的咨询单无法生成报价单，需要重新评估或修改需求

5. **评估超时处理**：
   - **不设置超时提醒** - 系统会一直等待评估人反馈
   - 评估人可以在任何时间提交反馈
   - 业务人员可以在详情页实时查看评估进度

---

## 六、实施计划

### 6.1 数据库变更

**第一步：添加 ConsultationAssessment 表**

```sql
CREATE TABLE `biz_consultation_assessment` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `consultationId` VARCHAR(191) NOT NULL,
  `assessorId` VARCHAR(191) NOT NULL,
  `assessorName` VARCHAR(50) NOT NULL,
  `conclusion` VARCHAR(20),
  `feedback` TEXT,
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
  `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `completedAt` DATETIME(3),
  `requestedBy` VARCHAR(50) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `biz_consultation_assessment_consultationId_idx` (`consultationId`),
  INDEX `biz_consultation_assessment_assessorId_status_idx` (`assessorId`, `status`),

  CONSTRAINT `biz_consultation_assessment_consultationId_fkey`
    FOREIGN KEY (`consultationId`) REFERENCES `biz_consultation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**第二步：修改 Consultation 表**

```sql
ALTER TABLE `biz_consultation`
ADD COLUMN `assessmentStatus` VARCHAR(20) DEFAULT 'not_started';
```

### 6.2 开发任务清单

- [ ] 数据库 Schema 变更（Prisma）
  - [ ] 添加 ConsultationAssessment 模型（含 round 字段）
  - [ ] 修改 Consultation 模型的 status 枚举值（新增 assessing/assessment_failed/closed）
  - [ ] 添加 round 字段索引
- [ ] API 接口开发
  - [ ] POST `/api/consultation/[id]/assessment` - 发起评估
  - [ ] POST `/api/consultation/assessment/[id]/submit` - 提交反馈
  - [ ] PUT `/api/consultation/assessment/[id]` - **修改评估反馈**
  - [ ] GET `/api/consultation/assessment/my-pending` - 我的待评估
  - [ ] GET `/api/consultation/[id]/assessment` - 查询评估详情
  - [ ] POST `/api/consultation/[id]/reassess` - **修改需求并重新评估**（新增）
  - [ ] POST `/api/consultation/[id]/close` - **关闭咨询单**（新增）
- [ ] 前端组件开发
  - [ ] `ConsultationAssessmentModal` - 评估人选择弹窗
  - [ ] `AssessmentFeedbackModal` - 评估反馈弹窗
  - [ ] `AssessmentResultTab` - **评估结果Tab组件**（含轮次切换）
  - [ ] `AssessmentProgress` - 评估进度展示组件
  - [ ] `ReassessmentModal` - **修改需求重评弹窗**（新增）
- [ ] 页面集成
  - [ ] 业务咨询列表页 - 添加"评估"按钮
  - [ ] 工作台首页 - 添加"待我评估"卡片
  - [ ] 业务咨询详情 - **添加"评估结果"Tab**（含轮次展示）
  - [ ] 业务咨询详情 - **添加评估失败后的操作按钮**（修改需求/关闭）
  - [ ] 业务咨询详情 - 集成评估进度展示
- [ ] 业务逻辑修改
  - [ ] 生成报价单时检查评估状态（`assessing` 和 `assessment_failed` 不可生成）
  - [ ] 评估完成后更新状态（判断是否有 `infeasible` 结论）
  - [ ] 评估修改后重新判断咨询单状态
  - [ ] **多轮评估逻辑**（记录轮次，保留历史）
  - [ ] **关闭咨询单逻辑**（终态处理）
- [ ] 测试
  - [ ] 单元测试
  - [ ] 集成测试
  - [ ] UI 测试
  - [ ] 评估冲突场景测试（有人可行，有人不可行）
  - [ ] **多轮评估场景测试**（新增）

### 6.3 预计工作量

| 任务 | 预计时间 | 备注 |
|------|----------|------|
| 数据库设计与变更 | 0.5天 | 添加评估表（含round字段），修改咨询表状态字段 |
| API 接口开发 | 2天 | 7个接口（含修改评估、重新评估、关闭接口） |
| 前端组件开发 | 2.5天 | 5个组件（含评估结果Tab、重评弹窗） |
| 页面集成 | 1.5天 | 列表、工作台、详情页（含轮次展示） |
| 业务逻辑完善 | 1天 | 状态判断、冲突处理、多轮评估、终态处理 |
| 测试与调试 | 2天 | 含冲突场景测试、多轮评估测试 |
| **总计** | **9.5天** | 完整的混合方案实现（含多轮评估+关闭逻辑） |

---

## 七、待讨论问题

1. ~~**评估超时提醒**~~：✅ **已明确** - 不需要超时提醒，系统一直等待评估人反馈

2. ~~**评估结果权重**~~：✅ **已明确** - 如果有任何评估人给出"不可行"结论，咨询单状态自动变为 `assessment_failed`，无法生成报价单

3. **评估历史**：是否需要保留历史评估记录？如果咨询单被修改后重新发起评估，旧的评估记录如何处理？
   - **建议方案**：保留历史记录，每次发起评估时创建新的评估记录，旧记录标记为"已废弃"

4. **评估撤回**：发起人是否可以撤回评估请求？
   - **建议方案**：允许撤回未完成的评估（所有评估人都未反馈时），删除所有评估记录，咨询单状态回到 `following`

5. ~~**评估修改**~~：✅ **已明确** - 评估人提交后允许修改反馈，修改权限仅限评估人本人

6. ~~**评估失败后的处理**~~：✅ **已明确** - 采用混合方案（方案C + 方案B）

   **主路径 - 修改需求并重新评估**：
   - `assessment_failed` 状态下，业务人员可以点击"修改需求并重新评估"
   - 打开编辑弹窗，修改咨询单内容（检测项目、客户需求等）
   - 保存修改后选择评估人，创建新一轮评估
   - 旧评估记录标记轮次（第1轮），新评估记录标记为第2轮
   - 咨询单状态变回 `assessing`
   - 详情页可以查看每一轮的评估历史

   **兜底路径 - 关闭咨询单**：
   - 如果确实无法满足客户需求，可以点击"关闭咨询单"
   - 咨询单状态变为 `closed`（已关闭）
   - 关闭后的咨询单只能查看，不能再操作
   - 需要重新创建新的咨询单来处理新需求

---

## 八、附录

### 8.1 相关文件

- **Prisma Schema**: `prisma/schema.prisma`
- **API 路由**: `src/app/api/consultation/[id]/assessment/route.ts`
- **前端页面**: `src/app/(dashboard)/entrustment/consultation/page.tsx`
- **前端组件**: `src/components/ConsultationAssessment*.tsx`

### 8.2 参考资料

- [Prisma 关系查询文档](https://www.prisma.io/docs/concepts/components/prisma-client/relation-queries)
- [Next.js API Routes 文档](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Ant Design Timeline 组件](https://ant.design/components/timeline-cn/)
