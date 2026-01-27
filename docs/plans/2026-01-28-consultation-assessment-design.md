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

  // 状态和时间
  status         String       @default("pending") // pending/completed
  requestedAt    DateTime     @default(now()) // 发起时间
  completedAt    DateTime? // 完成时间
  requestedBy    String       @db.VarChar(50) // 发起人

  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@index([consultationId])
  @@index([assessorId, status])
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
- `closed`: 已关闭

**状态流转规则**：
- `following` → 发起评估 → `assessing`
- `assessing` → 所有人反馈且全部通过 → `following`（可以生成报价单）
- `assessing` → 所有人反馈但有人不通过 → `assessment_failed`
- `following` → 生成报价单 → `quoted`
- `assessment_failed` → 不能生成报价单（需要重新评估或关闭）

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
3. 如果都已完成，更新咨询单的 `assessmentStatus` 为 `completed`

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

---

## 五、业务流程设计

### 5.1 状态流转图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          业务咨询评估流程                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [新建咨询]                                                                  │
│      │                                                                       │
│      ▼                                                                       │
│  assessmentStatus = not_started                                            │
│      │                                                                       │
│      ├──────────────┬──────────────┐                                        │
│      │              │              │                                        │
│      ▼              ▼              ▼                                        │
│  [直接生成报价]  [发起评估]    [继续跟进]                                     │
│                      │                                                       │
│                      ▼                                                       │
│              assessmentStatus = in_progress                                │
│              创建N条 ConsultationAssessment (status=pending)                │
│                      │                                                       │
│                      ▼                                                       │
│              [评估人收到待办]                                                │
│                      │                                                       │
│                      ▼                                                       │
│              [评估人提交反馈]                                                │
│              更新 status = completed                                        │
│                      │                                                       │
│                      ▼                                                       │
│              [检查是否所有人都已反馈]                                         │
│                      │                                                       │
│              是      │     否                                                │
│              ▼      │     ▼                                                │
│      assessmentStatus = completed   [继续等待]                              │
│              │                                                               │
│              ▼                                                               │
│          [可以生成报价单]                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

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
   - 提交后不可修改（如需修改，联系管理员）

3. **生成报价单限制**：
   - 如果 `assessmentStatus = in_progress`，不能生成报价单
   - 如果 `assessmentStatus = not_started` 或 `completed`，可以生成报价单

4. **评估结果影响**：
   - 评估结果会显示在咨询详情中，供业务人员参考
   - 如果有评估人给出"不可行"结论，系统会在生成报价单时给出提示警告

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
- [ ] API 接口开发
  - [ ] POST `/api/consultation/[id]/assessment` - 发起评估
  - [ ] POST `/api/consultation/assessment/[id]/submit` - 提交反馈
  - [ ] GET `/api/consultation/assessment/my-pending` - 我的待评估
  - [ ] GET `/api/consultation/[id]/assessment` - 查询评估详情
- [ ] 前端组件开发
  - [ ] `ConsultationAssessmentModal` - 评估人选择弹窗
  - [ ] `AssessmentFeedbackModal` - 评估反馈弹窗
  - [ ] `AssessmentProgress` - 评估进度展示组件
- [ ] 页面集成
  - [ ] 业务咨询列表页 - 添加"评估"按钮
  - [ ] 工作台首页 - 添加"待我评估"卡片
  - [ ] 业务咨询详情 - 集成评估进度展示
- [ ] 业务逻辑修改
  - [ ] 生成报价单时检查评估状态
  - [ ] 评估完成后更新状态
- [ ] 测试
  - [ ] 单元测试
  - [ ] 集成测试
  - [ ] UI 测试

### 6.3 预计工作量

| 任务 | 预计时间 |
|------|----------|
| 数据库设计与变更 | 0.5天 |
| API 接口开发 | 1天 |
| 前端组件开发 | 1.5天 |
| 页面集成 | 1天 |
| 测试与调试 | 1天 |
| **总计** | **5天** |

---

## 七、待讨论问题

1. **评估超时提醒**：如果评估人长时间不反馈（如3天），是否需要发送提醒通知？

2. **评估结果权重**：如果多个评估人给出不同结论（有人说可行，有人说不可行），如何处理？

3. **评估历史**：是否需要保留历史评估记录？如果咨询单被修改后重新发起评估，旧的评估记录如何处理？

4. **评估撤回**：发起人是否可以撤回评估请求？

5. **评估修改**：评估人提交后，是否允许修改反馈？

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
