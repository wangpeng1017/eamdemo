# 业务咨询样品检测项级评估功能设计文档

> 日期: 2026-01-28
> 版本: 1.0
> 作者: AI Assistant

## 一、需求概述

### 核心变更
从"咨询单级评估"改为"样品检测项级评估"

### 关键规格
1. **评估粒度**: 每一行样品检测项（样品 + 检测项目组合）
2. **分配方式**: 批量分配界面 + 一键分配快捷操作
3. **通过规则**: 所有样品检测项都评估为"可行"才能生成报价单
4. **重新评估**: 支持单条重新评估 + 修改样品信息后重新评估
5. **历史记录**: 完整保存所有评估历史
6. **状态展示**: 显示整体进度"评估中 (已完成数/总数)"

---

## 二、数据库设计

### 新增表: ConsultationSampleAssessment

```prisma
model ConsultationSampleAssessment {
  id                    String   @id @default(cuid())
  consultationId        String
  sampleTestItemId      String
  assessorId            String
  assessorName          String?
  feasibility           String   // feasible/difficult/infeasible
  feasibilityNote       String?  @db.Text
  assessedAt            DateTime @default(now())
  round                 Int      @default(1)      // 第几轮评估
  isLatest              Boolean  @default(true)    // 是否是最新记录

  consultation          Consultation @relation(fields: [consultationId], references: [id], onDelete: Cascade)
  sampleTestItem        SampleTestItem @relation(fields: [sampleTestItemId], references: [id], onDelete: Cascade)

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([consultationId, isLatest])
  @@index([sampleTestItemId, isLatest])
  @@map("consultation_sample_assessment")
}
```

### 修改 SampleTestItem 表

新增字段：
- `assessmentStatus` - pending/assessing/passed/failed
- `currentAssessorId` - 当前评估人ID
- `currentAssessorName` - 当前评估人姓名

### 修改 Consultation 表

新增字段：
- `assessmentVersion` - 版本标识 (v1/v2)，默认 "v2"
- `assessmentTotalCount` - 需要评估的样品检测项总数
- `assessmentPassedCount` - 已通过评估的数量
- `assessmentFailedCount` - 评估失败的数量
- `assessmentPendingCount` - 待评估的数量

状态调整：
- 删除 `pending` 状态
- 咨询单创建后直接为 `following` (跟进中)

---

## 三、API 接口设计

### 1. 批量发起评估
```
POST /api/consultation/[id]/assessment/batch
```

**请求体:**
```typescript
{
  assignments: [
    {
      sampleTestItemId: string
      assessorId: string
      assessorName: string
    }
  ]
}
```

**响应:**
```typescript
{
  success: boolean
  data: {
    consultationId: string
    totalAssignments: number
    createdAssessments: number
  }
}
```

### 2. 提交样品检测项评估
```
POST /api/consultation/assessment/[assessmentId]/submit
```

**请求体:**
```typescript
{
  feasibility: "feasible" | "difficult" | "infeasible"
  feasibilityNote: string
}
```

**响应:**
```typescript
{
  success: boolean
  data: {
    assessmentId: string
    sampleTestItemId: string
    consultationStatus: string  // 更新后的咨询单状态
  }
}
```

### 3. 获取评估详情
```
GET /api/consultation/[id]/assessment/details
```

**响应:**
```typescript
{
  success: boolean
  data: {
    consultation: {
      id: string
      consultationNo: string
      assessmentTotalCount: number
      assessmentPassedCount: number
      assessmentFailedCount: number
      assessmentPendingCount: number
    }
    sampleItems: [
      {
        id: string
        sampleName: string
        testItem: string
        quantity: number
        material: string
        assessmentStatus: string
        currentAssessor: string
        latestAssessment: {
          feasibility: string
          feasibilityNote: string
          assessedAt: string
          round: number
        }
        assessmentHistory: Array<Assessment>
      }
    ]
  }
}
```

### 4. 重新评估单条样品检测项
```
POST /api/consultation/assessment/item/[sampleTestItemId]/reassess
```

**请求体:**
```typescript
{
  assessorId: string
  assessorName: string
  modifiedData?: {
    sampleName?: string
    testItem?: string
    quantity?: number
    material?: string
  }
}
```

**响应:**
```typescript
{
  success: boolean
  data: {
    sampleTestItemId: string
    newAssessmentId: string
    round: number
  }
}
```

---

## 四、前端组件设计

### 1. ConsultationBatchAssessmentModal
批量分配评估人弹窗

**功能:**
- 显示所有样品检测项列表
- 为每条样品检测项分配评估人
- 支持"一键分配所有项给同一人"

### 2. SampleItemAssessmentDetailsTab
评估详情标签页

**功能:**
- 显示评估进度总览
- 显示每条样品检测项的评估状态
- 支持查看评估历史
- 当前用户是评估人时显示"立即评估"按钮

### 3. SampleItemAssessmentModal
单条样品检测项评估弹窗

**功能:**
- 显示样品信息（只读）
- 评估表单：可行性选择 + 说明文本框
- 提交评估

### 4. SampleItemReassessmentModal
重新评估弹窗

**功能:**
- 标签页1: 直接重新评估（选择新评估人）
- 标签页2: 修改样品信息后重新评估

---

## 五、业务逻辑

### 状态流转

```
following (跟进中)
    ↓
[发起评估] → assessing (评估中)
    ↓
    ├─→ [全部通过] → assessment_passed (评估通过) → [可生成报价单]
    │       ↓
    │   [生成报价单] → quoted (已报价)
    │
    ├─→ [部分不通过] → assessment_failed (评估失败)
    │       ↓
    │   [重新评估] → assessing (评估中)
    │
    └─→ [关闭] → closed (已关闭)
```

### 核心规则

**规则1: 发起评估的前置条件**
- 咨询单状态必须是 `following`
- 咨询单必须有至少1条样品检测项
- 所有样品检测项都必须分配评估人

**规则2: 评估提交后的自动处理**
1. 更新评估记录
2. 更新样品检测项状态（passed/failed）
3. 重新计算咨询单的评估统计
4. 检查是否所有项都已完成评估
5. 如果全部完成且有失败项 → `assessment_failed`
6. 如果全部完成且全部通过 → `assessment_passed`

**规则3: 生成报价单的权限控制**
- 仅当 `status === 'assessment_passed'` 时可生成报价单
- 必须满足：`assessmentPassedCount === assessmentTotalCount`

**规则4: 重新评估的处理**
1. 将该样品检测项的所有旧评估记录标记为 `isLatest = false`
2. 创建新的评估记录（`round` +1，`isLatest = true`）
3. 如果提供了修改数据，同步更新样品检测项
4. 更新样品检测项状态为 `assessing`
5. 更新咨询单状态为 `assessing`
6. 重新计算评估统计

---

## 六、兼容性方案

### 软切换策略

**版本标识:**
- `assessmentVersion = 'v1'` 或 `null`: 使用旧评估逻辑
- `assessmentVersion = 'v2'`: 使用新评估逻辑

**数据隔离:**
- 旧表保留: `consultation_assessment`, `consultation_assessment_result`
- 新表: `consultation_sample_assessment`
- 旧 API 路由保留，新 API 路由新增

**前端判断:**
```typescript
const isNewVersion = consultation.assessmentVersion === 'v2'
const AssessmentComponent = isNewVersion
  ? <SampleItemAssessmentTab />
  : <ConsultationAssessmentTab />
```

---

## 七、实现步骤

### Phase 1: 数据库与后端 API (2-3小时)
1. 编写数据库迁移脚本
2. 实现 4 个新 API 端点（TDD）
3. 实现业务逻辑和统计计算
4. 单元测试覆盖率 ≥ 80%

### Phase 2: 前端组件 (3-4小时)
1. 实现批量分配评估人弹窗
2. 实现评估详情展示组件
3. 实现单条评估弹窗
4. 实现重新评估弹窗
5. 集成到咨询单页面

### Phase 3: 集成测试 (1-2小时)
1. 测试完整评估流程
2. 测试重新评估和修改样品信息
3. 测试兼容性（旧咨询单正常工作）
4. 边界情况和错误处理测试

**预计总时长: 6-9小时**

---

## 八、测试用例

### 单元测试

**API 测试:**
- 批量发起评估 - 正常场景
- 批量发起评估 - 缺少必填字段
- 批量发起评估 - 样品检测项不存在
- 提交评估 - 评估通过
- 提交评估 - 评估失败
- 提交评估 - 最后一项完成后状态更新
- 获取评估详情 - 包含历史记录
- 重新评估 - round 自增
- 重新评估 - 修改样品信息

**业务逻辑测试:**
- 评估统计计算准确性
- 状态流转正确性
- 生成报价单权限判断

### 集成测试

**完整流程测试:**
1. 创建咨询单 → 添加样品检测项
2. 发起评估 → 批量分配评估人
3. 评估人提交评估 → 部分通过
4. 重新评估失败项 → 全部通过
5. 生成报价单 → 成功

**兼容性测试:**
1. 旧版咨询单使用旧评估流程
2. 新版咨询单使用新评估流程
3. 两套逻辑互不干扰

---

## 九、风险与注意事项

### 风险
1. **数据一致性**: 评估统计与实际记录不一致
2. **并发问题**: 多个评估人同时提交
3. **性能问题**: 样品检测项过多时的加载性能

### 应对措施
1. 使用数据库事务确保一致性
2. 添加乐观锁或版本控制
3. 实现分页和懒加载

### 注意事项
1. 旧数据不受影响，保持兼容
2. 评估历史完整保存，便于审计
3. 前端交互流程清晰，降低用户理解成本

---

## 十、后续优化方向

1. **智能推荐评估人**: 根据检测项目类型自动推荐合适的评估人
2. **评估提醒**: 评估人收到待评估任务的通知
3. **评估报告**: 生成评估汇总报告
4. **评估效率统计**: 统计评估人的评估速度和通过率
5. **批量操作**: 支持批量重新评估、批量修改评估人

---

## 变更历史

| 日期 | 版本 | 变更内容 | 操作人 |
|------|------|----------|--------|
| 2026-01-28 | 1.0 | 初始版本 | AI |
