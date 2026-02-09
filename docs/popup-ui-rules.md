# 弹窗提示 UI 交互规范

## 核心原则

所有用户操作的反馈提示，必须使用 `src/lib/confirm.ts` 中的统一工具函数，保持全站一致的提示风格。

## 使用规则

### 1. 操作失败 / 业务阻止 → `showWarning()` 弹窗对话框

**用于**：API 返回错误（400/500）、业务规则不允许、权限不足等场景。

```tsx
import { showWarning } from '@/lib/confirm'

// 示例：生成报告失败
showWarning('操作提示', '该任务已生成过报告，不能重复生成')
```

**特点**：居中 Modal 弹窗，用户必须点「知道了」关闭，确保用户看到错误原因。

### 2. 操作成功 → `showSuccess()` 轻量消息

```tsx
import { showSuccess } from '@/lib/confirm'
showSuccess('报告生成成功')
```

### 3. 危险操作确认 → `showConfirm()` 确认对话框

**用于**：删除、提交、不可逆操作。

```tsx
import { showConfirm } from '@/lib/confirm'
showConfirm('确认删除', '删除后不可恢复，是否继续？', async () => {
  await deleteItem(id)
}, { okType: 'danger' })
```

### 4. 一般性提示 → `showInfo()` / `showWarningMessage()`

```tsx
import { showInfo, showWarningMessage } from '@/lib/confirm'
showInfo('请先选择一个样品')
showWarningMessage('数据未保存')
```

## ❌ 禁止使用

- `alert()` — 原生弹窗
- `message.error()` / `message.success()` — 直接调用 antd，应使用封装函数
- `Modal.error()` / `Modal.warning()` — 直接调用 antd，应使用封装函数

## 决策树

```
操作失败（API错误/业务阻止）→ showWarning()
操作成功                    → showSuccess()
危险操作前确认（删除/提交）  → showConfirm()
一般性提示                  → showInfo() / showWarningMessage()
```
