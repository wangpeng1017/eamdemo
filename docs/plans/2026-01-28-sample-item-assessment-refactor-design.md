# 样品检测项评估功能重构设计文档

> 创建日期: 2026-01-28
> 设计目标: 从批量分配评估改为单条样品检测项分配评估人

---

## 一、需求背景

### 当前问题
- 现有"批量分配评估"功能使用不便
- 用户需要在新建/编辑咨询单时就能为每条样品检测项分配评估人

### 新需求
1. 在新建/编辑咨询单时，样品检测项列表每行显示"评估"按钮
2. 点击"评估"按钮后，直接选择评估人（来源于组织架构）
3. 完全替换"批量分配评估"功能
4. 只标记"已分配评估人"，等待评估人后续提交评估结果

---

## 二、数据结构设计

### 扩展 SampleTestItemData 接口

```typescript
export interface SampleTestItemData {
  id?: string
  key: string
  // ... 现有字段（样品名称、批次号、检测项目等）

  // === 新增：评估相关字段 ===
  assessorId?: string          // 评估人 ID
  assessorName?: string        // 评估人姓名
  assigningState?: 'none' | 'selecting' | 'assigned'  // 分配状态
}
```

### 分配状态说明
- `none`：未分配评估人（显示"评估"按钮）
- `selecting`：正在选择评估人（显示下拉框）
- `assigned`：已分配评估人（显示"评估人姓名 + 更换按钮"）

### 数据流
1. 用户点击"评估"按钮 → `assigningState` 变为 `selecting`
2. 用户选择评估人 → 更新 `assessorId` 和 `assessorName`，状态变为 `assigned`
3. 点击"更换"按钮 → 状态回到 `selecting`
4. 点击"复制"按钮 → 复制上一行的 `assessorId` 和 `assessorName`

---

## 三、UI 交互设计

### 3.1 操作列渲染逻辑

**未分配状态（`none`）**：
```
[评估] [复制]（仅第 2 行及以后显示）
```

**选择状态（`selecting`）**：
```
[选择评估人下拉框 ▼] [确定]
```

**已分配状态（`assigned`）**：
```
[已分配] [张三] [更换] [复制]
```

### 3.2 关键交互细节
- "复制"按钮只在第 2 行及以后显示（第 1 行没有上一行可复制）
- "复制"按钮只在上一行有评估人时显示
- 下拉框使用现有的 `UserSelect` 组件
- 选择评估人后，点击"确定"才完成分配（防止误操作）

### 3.3 视觉样式
- 未分配：灰色"待分配"标签 + 蓝色"评估"按钮
- 选择中：蓝色"选择中"标签
- 已分配：绿色"已分配"标签 + 蓝色 Tag 显示评估人姓名
- 复制按钮：灰色图标按钮，hover 时有提示"复制上一行评估人"

---

## 四、组件实现细节

### 4.1 扩展 Props 接口

```typescript
interface SampleTestItemTableProps {
  bizType: string
  bizId?: string
  value?: SampleTestItemData[]
  onChange?: (items: SampleTestItemData[]) => void
  readonly?: boolean
  showAssessment?: boolean  // 新增：是否显示评估功能
}
```

### 4.2 状态转换函数

```typescript
// 开始分配评估人
const handleStartAssigning = (key: string) => {
  updateItem(key, { assigningState: 'selecting' })
}

// 选择评估人
const handleSelectAssessor = (key: string, userId: string) => {
  const user = users.find(u => u.id === userId)
  updateItem(key, {
    assessorId: userId,
    assessorName: user?.name
  })
}

// 确认分配
const handleConfirmAssign = (key: string) => {
  updateItem(key, { assigningState: 'assigned' })
}

// 更换评估人
const handleChangeAssessor = (key: string) => {
  updateItem(key, { assigningState: 'selecting' })
}

// 从上一行复制
const handleCopyFromPrevious = (key: string, index: number) => {
  const prevItem = items[index - 1]
  if (prevItem.assessorId) {
    updateItem(key, {
      assessorId: prevItem.assessorId,
      assessorName: prevItem.assessorName,
      assigningState: 'assigned'
    })
  }
}
```

### 4.3 加载用户列表

```typescript
const [users, setUsers] = useState<User[]>([])

useEffect(() => {
  const fetchUsers = async () => {
    const res = await fetch('/api/user?pageSize=1000')
    const json = await res.json()
    if (json.success && json.data) {
      setUsers(json.data.list || [])
    }
  }
  fetchUsers()
}, [])
```

### 4.4 条件渲染评估列

```typescript
// 只有 showAssessment=true 时才添加评估列
if (showAssessment && !readonly) {
  columns.push({
    title: '评估人',
    width: 250,
    render: (text, record, index) => renderAssessmentColumn(record, index)
  })
}
```

---

## 五、保存流程设计

### 5.1 前端保存咨询单

```typescript
const handleSaveConsultation = async () => {
  const values = await form.validateFields()

  // sampleTestItems 已经包含了评估人信息
  const data = {
    ...values,
    sampleTestItems: sampleTestItems.map(item => ({
      sampleName: item.sampleName,
      testItemName: item.testItemName,
      quantity: item.quantity,
      material: item.material,
      // 评估人信息
      currentAssessorId: item.assessorId,
      currentAssessorName: item.assessorName,
    }))
  }

  // 提交到后端
  const res = await fetch('/api/consultation', {
    method: editingId ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })

  if (res.ok) {
    message.success('保存成功')
    // 刷新数据并关闭弹窗
  }
}
```

### 5.2 后端 API 处理

```typescript
// POST /api/consultation 或 PUT /api/consultation/[id]
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { sampleTestItems, ...consultationData } = body

  // 1. 创建或更新咨询单
  const consultation = await prisma.consultation.create({
    data: {
      ...consultationData,
      status: 'following',
    }
  })

  // 2. 批量创建/更新样品检测项
  for (const itemData of sampleTestItems) {
    await prisma.sampleTestItem.create({
      data: {
        bizType: 'consultation',
        bizId: consultation.id,
        sampleName: itemData.sampleName,
        testItemName: itemData.testItemName,
        quantity: itemData.quantity,
        material: itemData.material,
        // 评估人信息
        currentAssessorId: itemData.currentAssessorId,
        currentAssessorName: itemData.currentAssessorName,
        assessmentStatus: itemData.currentAssessorId ? 'assessing' : 'pending',
      }
    })
  }

  return NextResponse.json({ success: true, data: consultation })
}
```

### 5.3 关键点
- 评估人信息作为样品检测项的一部分一起保存
- 如果分配了评估人，`assessmentStatus` 自动设为 `assessing`
- 如果没有分配评估人，`assessmentStatus` 保持 `pending`

---

## 六、状态标签中文显示

### 6.1 评估状态标签

```typescript
const ASSESSMENT_STATUS_MAP: Record<string, { text: string; color: string }> = {
  pending: { text: '待分配', color: 'default' },
  assessing: { text: '评估中', color: 'processing' },
  passed: { text: '已通过', color: 'success' },
  failed: { text: '未通过', color: 'error' },
}
```

### 6.2 分配状态标签

```typescript
const ASSIGNMENT_STATE_MAP: Record<string, { text: string; color: string }> = {
  none: { text: '待分配', color: 'default' },
  selecting: { text: '选择中', color: 'processing' },
  assigned: { text: '已分配', color: 'success' },
}
```

### 6.3 UI 渲染示例

**未分配**：
```jsx
<Space>
  <Tag color="default">待分配</Tag>
  <Button type="primary" size="small">评估</Button>
</Space>
```

**选择中**：
```jsx
<Space>
  <Tag color="processing">选择中</Tag>
  <UserSelect placeholder="选择评估人" />
  <Button type="primary" size="small">确定</Button>
</Space>
```

**已分配**：
```jsx
<Space>
  <Tag color="success">已分配</Tag>
  <Tag color="blue">张三</Tag>
  <Button size="small">更换</Button>
  <Button size="small">复制</Button>
</Space>
```

---

## 七、实现步骤

### 阶段 1：组件修改
1. ✅ 扩展 `SampleTestItemData` 接口
2. ✅ 添加评估相关状态字段
3. ✅ 实现评估列渲染逻辑
4. ✅ 实现状态转换函数
5. ✅ 实现"复制上一行"功能
6. ✅ 加载用户列表

### 阶段 2：API 修改
1. ✅ 修改咨询单创建/更新 API
2. ✅ 支持接收评估人字段
3. ✅ 自动设置 assessmentStatus

### 阶段 3：集成测试
1. ✅ 新建咨询单并分配评估人
2. ✅ 编辑咨询单并更换评估人
3. ✅ 复制评估人功能
4. ✅ 评估流程验证

---

## 八、移除旧功能

### 需要删除的文件
- `src/components/ConsultationBatchAssessmentModal.tsx`
- `src/app/api/consultation/[id]/assessment/batch/route.ts`
- `src/app/api/consultation/[id]/assessment/batch/__tests__/batch-assessment.test.ts`

### 需要修改的文件
- `src/app/(dashboard)/entrustment/consultation/page.tsx`
  - 移除"批量分配评估"按钮
  - 移除 `ConsultationBatchAssessmentModal` 引用
  - 在 `SampleTestItemTable` 添加 `showAssessment={true}` 属性

---

## 九、技术要点

### 9.1 数据一致性
- 评估人信息暂存在前端内存
- 保存咨询单时一起提交到后端
- 后端在事务中创建样品检测项和评估人信息

### 9.2 用户体验
- 内联编辑，不需要弹窗
- 支持"复制上一行"快捷操作
- 状态标签中文显示，清晰易懂

### 9.3 代码复用
- 使用现有的 `UserSelect` 组件
- 基于 `StatusTag` 组件显示状态
- 最小化改动，复用现有逻辑

---

## 十、后续优化

### 10.1 可能的增强功能
- 支持批量分配所有未分配项
- 支持按部门筛选评估人
- 支持评估工作量统计

### 10.2 性能优化
- 用户列表缓存
- 虚拟滚动（当样品检测项很多时）

---

## 十一、风险评估

### 11.1 技术风险
- **风险**：样品检测项未保存时，评估人信息可能丢失
- **应对**：前端提示用户保存，评估人信息随表单一起提交

### 11.2 兼容性风险
- **风险**：其他业务单据（委托单、检测任务）也可能使用 SampleTestItemTable
- **应对**：通过 `showAssessment` 属性控制是否显示评估功能，默认为 false

---

## 十二、验收标准

### 功能验收
- [ ] 新建咨询单时，样品检测项列表显示"评估"按钮
- [ ] 点击"评估"按钮后，显示评估人选择下拉框
- [ ] 选择评估人并确定后，显示"评估人姓名 + 更换按钮"
- [ ] 可以更换已分配的评估人
- [ ] 可以复制上一行的评估人
- [ ] 保存咨询单时，评估人信息一起保存到数据库
- [ ] 样品检测项的 assessmentStatus 正确设置

### 界面验收
- [ ] 所有状态标签显示中文
- [ ] 评估人姓名以蓝色 Tag 显示
- [ ] 复制按钮只在第 2 行及以后显示
- [ ] UI 交互流畅，无卡顿

---

**文档版本**: 1.0
**最后更新**: 2026-01-28
**设计者**: Claude AI
**审核者**: 待定
