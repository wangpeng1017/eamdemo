# LIMS 项目 UI 与交互一致性分析报告

> 分析日期: 2026-02-21
> 项目路径: /Users/wangpeng/Downloads/limsnext
> 分析范围: 表单、按钮、对话框、交互模式

---

## 一、项目 UI 基础架构

### 1.1 UI 组件库

| 组件库 | 版本 | 使用范围 |
|--------|------|----------|
| **Ant Design (antd)** | ^5.21.0 | **主 UI 库**，覆盖 128+ 文件 |
| @ant-design/icons | ^5.5.0 | 图标库，103 文件使用 |
| Tailwind CSS | ^3.4.1 | 已配置但使用较少 |
| TipTap | ^3.19.0 | 富文本编辑器（套） |
| wangEditor | ^5.1.23 | 富文本编辑器（另一套） |

### 1.2 样式方案

- **主要方式**: Ant Design 内置样式 + 内联 `style={}` 对象
- **Tailwind CSS**: 已配置但使用度低（仅 55 处 `className` vs 89 处 `style={}`）
- **CSS 模块**: 未使用
- **主题色**: `#1890ff`（Ant Design 默认蓝）

### 1.3 状态管理

| 方案 | 用途 |
|------|------|
| SWR | 数据请求与缓存 |
| zustand | 已安装但 **未使用** |

### 1.4 全局配置

**ConfigProvider** (`src/components/Providers.tsx`):
- 语言: 中文（`zhCN`）
- 主题色: `#1890ff`
- 无暗色模式支持

---

## 二、按钮一致性分析

### 2.1 Button 组件来源

- **无自定义 Button 组件**，全部使用 antd `Button`
- 有 3 个业务按钮封装: `CreateEntrustmentButton`, `QuotationPDFButton`, `ClientApprovalButtons`

### 2.2 Button Type 使用统计

| Type | 使用次数 | 典型用途 | 一致性 |
|------|---------|---------|--------|
| `type="primary"` | ~100+ | 新增、保存、提交、查询 | ✅ 统一 |
| `type="link"` | ~35 | 操作列链接、返回 | ✅ 统一 |
| `type="text"` | ~15 | 文字按钮、删除 | ✅ 统一 |
| `type="dashed"` | ~8 | 表格行内"添加" | ✅ 统一 |
| 未指定 (default) | ~60+ | 取消、返回、关闭 | ✅ 统一 |

### 2.3 删除按钮类型不一致 ⚠️

**问题**: 删除按钮的 `type` 属性混用

| 模式 | 使用处 | 示例文件 |
|------|--------|----------|
| `danger` (无 type) | ~40 处 | 大部分列表页 |
| `type="text"` + `danger` | 部分 | `SampleTestItemTable.tsx:509` |
| `type="link"` + `danger` | 部分 | `MaterialTestTable.tsx:235` 等 |

**建议**: 统一为 `<Button size="small" danger icon={<DeleteOutlined />} />`（不带 type）

### 2.4 按钮尺寸不一致 ⚠️

| 场景 | 尺寸设置 | 一致性 |
|------|---------|--------|
| 表格操作列 | `size="small"` | ✅ 统一 |
| 列表工具栏 | 未指定 (middle) | ✅ 统一 |
| 业务表单提交 | **不统一** | ❌ 部分用 `size="large"`，部分默认 |

**业务表单提交按钮尺寸**:
- 使用 `size="large"`: `ContractForm`, `QuotationForm`, `ConsultationForm`, `EntrustmentForm`
- 使用默认尺寸: `TemplateEditor`, 其他简单表单

### 2.5 按钮文本不一致 ⚠️

#### 2.5.1 "确认" vs "确定" 混用（中严重度）

| 用法 | 场景 | 示例文件 |
|------|------|----------|
| **"确认"** | Modal okText（主流） | `SampleTestItemTable.tsx` 等 8 处 |
| **"确定"** | Popconfirm okText（主流） | `system-document/page.tsx` 等 12 处 |

**规律**: Modal 倾向"确认"，Popconfirm 倾向"确定"，但不完全统一。

#### 2.5.2 "新增" vs "添加" vs "新建"

| 词汇 | 含义 | 使用次数 |
|------|------|---------|
| **新增** | 列表页顶部创建新记录 | ~25+ 处（主流） |
| **添加** | 在已有记录基础上追加子项 | ~5 处 |
| **新建** | 委托模块专用 | 2 处 |

**建议**: 委托模块的"新建委托"改为"新增委托"以保持一致。

#### 2.5.3 "取消" vs "关闭"

| 词汇 | 用途 | 一致性 |
|------|------|--------|
| **取消** | 有操作的对话框 | ✅ 合理 |
| **关闭** | 只读的查看/预览弹窗 | ✅ 合理 |

**结论**: 两者区分使用是合理的。

#### 2.5.4 "搜索" vs "查询"

| 词汇 | 使用次数 |
|------|---------|
| **查询** | 3 处（主流） |
| **搜索** | 1 处 |

**建议**: 统一为"查询"。

### 2.6 按钮间距问题 ⚠️

**7 处**使用内联样式做按钮间距:
```tsx
style={{ marginRight: 8 }}
```

**文件**: 设备、样品、耗材、报告等创建/编辑页

**建议**: 改用 `<Space>` 组件统一管理间距。

### 2.7 启用按钮硬编码颜色 ⚠️

**3 处**使用硬编码绿色:
```tsx
style={{ color: '#52c41a', borderColor: '#52c41a' }}
```

**文件**: 权限管理、用户管理、审批流页面

**建议**: 提取为样式常量或使用 Ant Design 的颜色 token。

### 2.8 图标按钮一致性

| 操作 | 图标 | 一致性 |
|------|------|--------|
| 删除 | `<DeleteOutlined />` | ✅ 统一 |
| 编辑 | `<EditOutlined />` | ✅ 统一 |
| 新增 | `<PlusOutlined />` | ✅ 统一 |
| 查看 | `<EyeOutlined />` | ✅ 统一 |
| 保存 | `<SaveOutlined />` | ✅ 统一 |

**异常**: 1 处使用 `<CloseCircleOutlined />` 作为删除图标。

---

## 三、表单一致性分析

### 3.1 表单组件来源

- **100% 使用 Ant Design 表单组件**
- 无原生 HTML `<input>`/`<select>`/`<textarea>` 使用
- 自定义组件: `UserSelect`, `ImageUpload`, `SampleTestItemTable` 等

### 3.2 表单验证模式

#### 3.2.1 后端验证（API 层）

- **使用 Zod** (`src/lib/validation.ts`)
- 定义了 pagination, user, client, sample, device, supplier 等的 schema
- 提供了 `validate()`, `validateQuery()`, `validatePagination()` 辅助函数

#### 3.2.2 前端验证（Form 层）

**全部使用 antd Form rules**，存在两种写法不一致:

| 模式 | 写法 | 使用范围 | 问题 |
|------|------|---------|------|
| **模式 A** | `rules={[{ required: true, message: '请选择客户' }]}` | 业务表单组件 | ✅ 有中文提示 |
| **模式 B** | `rules={[{ required: true }]}` | 页面级 Modal 表单（约 50%） | ❌ 显示英文默认提示 |

**受影响文件**（示例）:
- `personnel/review/page.tsx`
- `device/calibration-plan/page.tsx`
- `finance/receivable/page.tsx`
- `TemplateEditor.tsx`
- 等 20+ 文件

**严重度**: 高

**建议**: 统一使用模式 A，所有必填字段添加中文 `message`。

#### 3.2.3 前后端验证不对称

| 后端 Zod 已有验证 | 前端缺失 |
|------------------|---------|
| 邮箱格式 `z.string().email()` | ❌ 无 |
| 手机号格式 `z.string().regex(/^\d{11}$/)` | ❌ 无 |
| 密码最小长度 | ✅ 仅修改密码表单有 |

**严重度**: 高

**建议**: 在前端表单中补充邮箱、手机号的格式验证。

### 3.3 表单布局

| 属性 | 设置 | 一致性 |
|------|------|--------|
| `layout="vertical"` | 主流模式（约 80 处） | ✅ 统一 |
| `layout="inline"` | 搜索/筛选表单（5 处） | ✅ 合理区分 |
| `gutter={16}` | Row/Col 栅格间距 | ✅ 统一 |
| Divider 分段 | ① ② ③ 编号 | ✅ 统一 |

**异常**: 客户编辑表单使用 CSS Grid 而非 Row/Col。

### 3.4 表单提交模式不一致 ⚠️

| 模式 | 写法 | 使用文件 |
|------|------|---------|
| **模式 A** | `onFinish` + `htmlType="submit"` | `ContractForm`, `EntrustmentForm`, 登录页等 |
| **模式 B** | `onClick` + `validateFields()` | `ConsultationForm`, `QuotationForm`, 外部委托页等 |

**严重度**: 中

**建议**: 统一使用模式 A（Ant Design 推荐方式）。

### 3.5 表单标签语言不一致 ⚠️

| 组件 | 标签风格 |
|------|---------|
| **ContractForm** | 纯中文（客户名称、联系电话...） |
| **EntrustmentForm** | 中英混合（联系人 Person in Charge） |
| **ConsultationForm/QuotationForm** | 中英混合（委托人 From） |
| **外部委托表单** | 中英混合（联系人 Contact Person） |

**英文翻译不一致**:

| 含义 | EntrustmentForm | ConsultationForm/QuotationForm |
|------|----------------|-------------------------------|
| 电话 | `电话 Telephone` | `电话 Tel` |
| 联系人 | `联系人 Person in Charge` | `委托人 From` |
| 委托单位 | `委托单位 Applicant` | `委托方 Company` |
| 邮箱 | `电子邮箱 Email` | `邮箱 Email` |

**严重度**: 中

**建议**:
1. 决定标签语言策略（全中文 vs 中英混合）
2. 如用中英混合，统一英文翻译

### 3.6 表单底部按钮布局不一致 ⚠️

| 模式 | 写法 | 文件 |
|------|------|------|
| **模式 A** | Space 包裹: 取消 + 提交 | `ConsultationForm`, `QuotationForm` |
| **模式 B** | 提交 + 取消（顺序相反，用 marginRight） | 设备、样品、耗材创建页 |
| **模式 C** | 单个 block 按钮 | `EntrustmentForm` |

### 3.7 消息提示不一致 ⚠️

**主流**: 使用 `@/lib/confirm.ts` 封装的 `showSuccess()`/`showError()`

**异常**（6 处直接使用 `message.error()`）:
- `SWRProvider.tsx`
- `upload/ImageUpload.tsx`
- `ConsultationForm.tsx`

**严重度**: 低

**建议**: 统一使用 `@/lib/confirm.ts` 的封装函数。

---

## 四、对话框与交互模式分析

### 4.1 Modal 使用

| 模式 | 用途 | 一致性 |
|------|------|--------|
| 表单 Modal | 新增/编辑 | ✅ 统一 |
| 专用 Modal | 驳回、评估等业务场景 | ✅ 统一 |
| Modal.confirm/静态方法 | 特殊确认/提示 | ✅ 统一 |

**Modal 配置**: 53 个文件使用，`width` 400-900 不等

### 4.2 Drawer 使用

**统一用途**: 查看详情（右侧滑出）

**20+ 页面使用 Drawer**，配置:
- `width={600}` 或 `width={700}`
- 右侧打开

**结论**: ✅ 用途和配置高度统一

### 4.3 确认模式

| 方式 | 使用次数 | 一致性 |
|------|---------|--------|
| **Popconfirm** | ~140 次（40 文件） | ❌ 确认文本不统一 |
| **showConfirm** (封装) | 4 处 | ✅ 统一 |
| **Modal.confirm** (直接) | 1 处 | - |
| **window.confirm** | 0 处 | ✅ 未使用 |

#### 4.3.1 Popconfirm 确认文本不一致 ⚠️

| 模式 | title | okText | cancelText | 严重度 |
|------|-------|--------|------------|--------|
| 模式 1 | "确认删除此角色?" | 默认 | 默认 | 低 |
| 模式 2 | "确认删除该设备？" | "确定" | "取消" | 低 |
| 模式 3 | "确认删除?" | "确认" | "取消" | 中 |
| 模式 4 | "确认删除" | 默认 | 默认 | 中 |
| 模式 5 | "删除后将回滚应收账款，确认删除?" | 默认 | 默认 | 低 |

**不一致点**:
- 有的带问号，有的不带
- 有的说"确认删除该xxx?"，有的说"确认删除?"，有的说"确认删除"
- `okText` 有的用"确定"，有的用"确认"，有的不设置

**严重度**: 中

**建议**: 统一为 `{ title: '确认删除此{实体}?', okText: '确定', cancelText: '取消' }`

### 4.4 Toast/Notification 模式

- **无第三方 toast 库**（无 sonner/react-hot-toast）
- 全部使用 antd `message`，封装在 `@/lib/confirm.ts`

**统一封装函数**:
```typescript
showSuccess(content)   // 3 秒自动关闭
showError(content)     // 3 秒自动关闭
showWarningMessage(content)
showInfo(content)
showLoading(content, key)  // 不自动关闭
```

**成功消息格式**:
- "创建成功", "更新成功", "删除成功"
- "审批通过", "已驳回", "已撤回"
- "操作成功"（通用）

**错误消息格式**:
- 从 API 提取: `json.error?.message`
- 回退消息: "操作失败" / "网络错误" / "xxx失败"

### 4.5 Loading 状态

| 场景 | 组件 | 配置 | 一致性 |
|------|------|------|--------|
| 页面级 Loading | `<Spin>` | `size="large"` | ✅ 统一 |
| 数据加载 | `<Spin>` | `tip` 不统一 | ⚠️ 部分有 tip，部分无 |
| Table Loading | `<Table loading>` | - | ✅ 统一 |
| Button Loading | `loading` 属性 | - | ✅ 统一 |
| Modal Loading | `confirmLoading` | - | ✅ 统一 |
| Skeleton | - | - | ❌ 未使用 |

**Loading 文本不一致**:
- "加载中..."
- "正在加载表格编辑器..."
- "正在加载模板内容..."
- 无 tip（多数）

**Loading 变量命名**: `loading`, `submitting`, `saving`, `generating`, `approveLoading`, `passwordLoading`, `paymentSubmitting`, `uploading`, `voucherUploading`

**严重度**: 低

**建议**: 统一 Loading 文本，变量命名可接受。

### 4.6 Table 操作列

#### 4.6.1 统一模式 ✅

**高度一致**:
- `title: '操作'`
- `fixed: 'right'`
- 使用 `<Space>` 包裹按钮
- `size="small"`
- 查看: `<EyeOutlined />`
- 编辑: `<EditOutlined />`
- 删除: `<DeleteOutlined />` + `<Popconfirm>`

#### 4.6.2 不一致点 ⚠️

| 属性 | 不一致值 | 严重度 |
|------|---------|--------|
| `width` | 120/150/160/180/200/250/300/不设置 | 低 |
| `align: 'center'` | 有的有，有的无 | 低 |

### 4.7 空状态模式

**三种渲染方式混用**:

| 方式 | 使用场景 | 示例 |
|------|---------|------|
| **Empty 组件** | 通知、待评估等 | `NotificationProvider.tsx` |
| **内联 div** | 审批记录等 | `ApprovalRecords.tsx` |
| **locale.emptyText** | 可编辑表格 | `SampleInfoTable.tsx` |

**空状态文本**: "暂无xxx" 前缀，具体描述各异。

**严重度**: 低

---

## 五、交互模式总结

### 5.1 高度统一的模式 ✅

| 模式 | 实现 | 一致性 |
|------|------|--------|
| UI 组件库 | Ant Design (唯一) | 100% |
| 表单布局 | `layout="vertical"` | ~98% |
| 操作列固定 | `fixed: 'right'` | 100% |
| 查看详情 | Drawer 右侧滑出 | 100% |
| 表单编辑 | Modal 居中弹窗 | 100% |
| 图标按钮 | 统一 antd icons | ~99% |
| 消息提示 | `@/lib/confirm.ts` 封装 | ~98% |
| 删除确认 | Popconfirm（非 window.confirm） | ~95% |

### 5.2 主要不一致问题 ⚠️

| 问题 | 严重度 | 影响范围 | 优先级 |
|------|--------|---------|--------|
| 表单验证缺少 message（显示英文） | **高** | ~50% 表单 | P0 |
| 前后端验证不对称（缺邮箱/手机验证） | **高** | 全局 | P0 |
| "确认" vs "确定" 混用 | **中** | ~20 处 | P1 |
| 删除按钮 type 不统一 | **中** | ~40 处 | P1 |
| 表单提交方式不一致 | **中** | ~25% 表单 | P1 |
| 表单标签语言不统一 | **中** | 4 个业务表单 | P1 |
| 表单底部按钮布局不统一 | **低** | ~15 处 | P2 |
| 按钮间距用内联样式 | **低** | 7 处 | P2 |
| Popconfirm 确认文本不统一 | **中** | ~140 处 | P1 |
| 操作列 width 不统一 | **低** | 40+ 表格 | P2 |
| Loading 文本不统一 | **低** | ~20 处 | P2 |
| 空状态渲染方式不统一 | **低** | ~30 处 | P2 |
| "新增" vs "新建" 混用 | **低** | 2 处 | P2 |
| 部分代码直接用 message.error | **低** | 6 处 | P2 |

---

## 六、优化建议

### P0 - 高优先级（必须修复）

1. **统一表单验证规则**
   - 所有 `rules={[{ required: true }]}` 改为 `rules={[{ required: true, message: '请输入xxx' }]}`
   - 补充前端邮箱、手机号格式验证

2. **统一删除按钮**
   - 统一为 `<Button size="small" danger icon={<DeleteOutlined />} />`（无 type）

### P1 - 中优先级（强烈建议）

3. **统一确认文本**
   - Popconfirm: `{ title: '确认删除此{实体名}?', okText: '确定', cancelText: '取消' }`
   - Modal: `okText: '确认'`, `cancelText: '取消'`

4. **统一表单提交方式**
   - 统一使用 `onFinish` + `htmlType="submit"`

5. **统一表单标签语言**
   - 决策: 全中文 vs 中英混合
   - 如中英混合，统一英文翻译

6. **统一"确认" vs "确定"**
   - 建议: 统一为 "确定"（符合中文习惯）

### P2 - 低优先级（建议优化）

7. **统一操作列 width**
   - 建议: `width={180}`（容纳 3 个按钮）

8. **统一 Loading 文本**
   - 页面加载: "加载中..."
   - 特殊加载: "正在加载{具体内容}..."

9. **统一空状态渲染**
   - 建议: 统一使用 `<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无xxx" />`

10. **替换内联样式为 Space 组件**

11. **统一"新增" vs "新建"**
    - 委托模块改"新建"为"新增"

12. **统一消息提示调用**
    - 6 处 `message.error()` 改为 `showError()`

---

## 七、技术债务

| 债务 | 影响 | 建议 |
|------|------|------|
| **zustand 未使用** | 依赖冗余 | 决策是否需要或移除 |
| **两套富文本编辑器** | 维护成本 | 选择其一统一使用 |
| **useModalForm Hook 未使用** | 代码重复 | 推广使用或移除 |
| **Tailwind 使用率低** | 样式分散 | 决策是否加强使用 |

---

## 八、附录：文件清单

### 8.1 自定义 UI 组件

| 组件 | 路径 | 用途 |
|------|------|------|
| StatusTag | `src/components/StatusTag.tsx` | 通用状态标签 |
| UserSelect | `src/components/UserSelect.tsx` | 用户选择器 |
| EditableTable | `src/components/EditableTable.tsx` | 可编辑表格 |
| DragSortList | `src/components/drag-sort/DragSortList.tsx` | 拖拽排序 |
| ImageUpload | `src/components/upload/ImageUpload.tsx` | 图片上传 |
| RichTextEditor (TipTap) | `src/components/RichTextEditor.tsx` | 富文本编辑器 |
| RichTextEditor (wang) | `src/components/editor/RichTextEditor.tsx` | 富文本编辑器（另一套） |
| DataSheet | `src/components/DataSheet.tsx` | 电子表格 |
| DashboardLayout | `src/components/layout/DashboardLayout.tsx` | 主布局 |

### 8.2 核心配置文件

| 文件 | 用途 |
|------|------|
| `src/components/Providers.tsx` | Ant Design 全局配置 |
| `src/lib/confirm.ts` | 消息提示封装 |
| `src/lib/validation.ts` | Zod 验证 schema |
| `src/hooks/useModalForm.ts` | Modal 表单 Hook（未使用） |
| `tailwind.config.js` | Tailwind 配置 |
| `src/app/globals.css` | 全局样式 |

---

**报告生成时间**: 2026-02-21
**分析工具**: Claude Code (Sonnet 4.5)
