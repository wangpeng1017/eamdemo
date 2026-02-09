# LIMS-Next 列表页 UI 规范

## 操作列按钮排序规则

操作列按钮遵循统一的排列顺序，**从左到右**：

```
[业务操作按钮] → [查看👁] → [编辑✏] → [删除🗑]
```

### 具体排列

| 位置 | 类型 | 示例 | 说明 |
|------|------|------|------|
| 最左 | 业务按钮 | 提交审批、打印、生成报价单 | 条件显示，`type="primary" ghost` |
| 中右 | 查看 | `<EyeOutlined />` | 打开**右侧 Drawer** 抽屉 |
| 右 | 编辑 | `<EditOutlined />` | 跳转到**编辑页面**（内容区新页面） |
| 最右 | 删除 | `<DeleteOutlined />` danger | 需 `Popconfirm` 确认，条件显示 |

### 参考实现（业务咨询页 consultation）

```tsx
<Space size="small" style={{ whiteSpace: 'nowrap' }}>
  {/* 业务按钮在左 */}
  <Button size="small" type="primary" ghost icon={<FileTextOutlined />}
    onClick={() => handleGenerateQuote(record)}>
    生成报价单
  </Button>
  {/* 查看/编辑/删除固定在右 */}
  <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record)} />
  <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
  <Popconfirm title="确认删除?" onConfirm={() => handleDelete(record.id)}>
    <Button size="small" danger icon={<DeleteOutlined />} />
  </Popconfirm>
</Space>
```

---

## 详情查看 = 右侧 Drawer 抽屉

- 点击「查看」按钮打开 `<Drawer>` 组件
- 抽屉宽度：`width={800}`
- 使用 `<Tabs>` 区分不同信息，通常包含：
  - **基本信息** Tab：`<Descriptions>` 展示字段
  - **审批记录** Tab：`<Timeline>` 展示审批历史
- 抽屉内**不包含**编辑功能

---

## 编辑 = 内容区新页面

- 点击「编辑」按钮通过 `router.push()` 跳转到独立编辑页
- 编辑页左上角有「返回」按钮 `<ArrowLeftOutlined />`
- 编辑页面路径格式：`/模块/edit/[id]` 或 `/模块/[id]`
- 根据状态控制是否可编辑（如草稿可编辑，已审批只读）

---

## 条件显示按钮

| 按钮 | 显示条件 |
|------|---------|
| 提交审批 | `status === 'draft'` |
| 编辑 | `status === 'draft'`（部分页面所有状态可编辑） |
| 删除 | `status === 'draft'` |
| 打印 | 所有状态 |
| 查看 | 所有状态 |

---

## 表格通用规范

- 操作列：`fixed: 'right'`，防止换行 `whiteSpace: 'nowrap'`
- 表格横向滚动：`scroll={{ x: 1200 }}`
- 分页：显示总数 `showTotal: (t) => \`共 ${t} 条\`` 
- 状态列使用 `<Tag>` 或 `<StatusTag>` 组件
- 日期格式：`YYYY-MM-DD HH:mm`
