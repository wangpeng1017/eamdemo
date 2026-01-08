# 委托合同和委托单功能增强 - 实现计划

> 创建时间: 2026-01-08
> 预计开发时间: 4-6 小时

---

## 功能概述

### 功能1：委托合同页面增强

**位置**: `/Users/wangpeng/Downloads/limsnext/src/app/(dashboard)/entrustment/contract/page.tsx`

**需求**:
1. 在右上角"生成合同"按钮**左侧**增加两个按钮：
   - **下载PDF**：选中一条合同，导出完整合同信息PDF（类似检测报告格式）
   - **生成委托单**：把合同信息带入，自动打开委托单新建页面并填充必要信息

2. 委托单页面显示合同编号，点击可回到对应合同

### 功能2：委托单外部链接

**位置**: `/Users/wangpeng/Downloads/limsnext/src/app/(dashboard)/entrustment/list/page.tsx`

**需求**:
1. 右上角增加"生成外部链接"按钮
2. 针对某一条委托单生成外部链接
3. 客户通过链接可填写/补充：样品信息、检测项目、特殊要求、其他需求
4. 直接保存（无需审核）
5. 需要简单验证（验证码）

---

## 实现方案

### 一、委托合同页面增强

#### 1.1 创建合同 PDF 导出工具

**新建文件**: `src/lib/exportContractPDF.ts`

```typescript
import { jsPDF } from 'jspdf'
import { message } from 'antd'
import dayjs from 'dayjs'

export interface ContractData {
  contractNo: string
  partyACompany: string | null
  partyAContact: string | null
  contractAmount: number | null
  signDate: string | null
  startDate: string | null
  endDate: string | null
  // ... 其他字段
}

export async function exportContractPDF(data: ContractData): Promise<void> {
  const doc = new jsPDF()

  // 标题
  doc.setFontSize(20)
  doc.text('检测服务合同', 105, 20, { align: 'center' })

  // 合同信息
  // 甲方信息
  // 乙方信息
  // 合同金额
  // 合同条款
  // ...

  doc.save(`合同-${data.contractNo}.pdf`)
  message.success('PDF 导出成功')
}
```

#### 1.2 修改合同页面

**修改文件**: `src/app/(dashboard)/entrustment/contract/page.tsx`

**变更点**:
1. 添加行选择状态（单选模式）
2. 添加两个按钮：下载PDF、生成委托单
3. 实现处理函数
4. 添加表格 rowSelection 配置

**按钮布局**:
```tsx
<Space>
  <Button icon={<DownloadOutlined />} disabled={selectedRowKeys.length !== 1} onClick={handleDownloadPDF}>
    下载PDF
  </Button>
  <Button icon={<FileAddOutlined />} disabled={selectedRowKeys.length !== 1} onClick={handleGenerateEntrustment}>
    生成委托单
  </Button>
  <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
    新增合同
  </Button>
</Space>
```

#### 1.3 修改委托单页面

**修改文件**: `src/app/(dashboard)/entrustment/list/page.tsx`

**变更点**:
1. 合同编号列添加点击跳转
2. 添加 URL 参数处理（接收来自合同的数据）
3. 自动填充表单并打开新建抽屉

**URL 参数示例**:
```
/entrustment/list?fromContract={"contractNo":"HT20260108001","clientName":"XX公司","contactPerson":"张三"}
```

---

### 二、委托单外部链接功能

#### 2.1 数据存储方案

**使用现有 remark 字段存储 token 信息**（无需修改 schema）

```json
{
  "externalLink": {
    "token": "abc123...",
    "expiresAt": "2026-01-15T00:00:00.000Z"
  }
}
```

#### 2.2 生成外部链接 API

**新建文件**: `src/app/api/entrustment/external-link/route.ts`

```typescript
import { randomBytes } from 'crypto'

// 生成 32 字节随机 token
const token = randomBytes(32).toString('hex')

// 7 天后过期
const expiresAt = new Date()
expiresAt.setDate(expiresAt.getDate() + 7)

// 存储到 remark 字段
await prisma.entrustment.update({
  where: { id: entrustmentId },
  data: {
    remark: JSON.stringify({
      ...JSON.parse(entrustment.remark || '{}'),
      externalLink: { token, expiresAt: expiresAt.toISOString() }
    })
  }
})
```

#### 2.3 外部链接页面

**新建文件**: `src/app/external/entrustment/[token]/page.tsx`

**功能**:
1. Token 验证
2. 显示委托单基本信息（委托单号、委托单位）
3. 表单字段：样品名称、规格型号、材质牌号、样品数量、检测项目、特殊要求、其他需求
4. 验证码验证（4位）
5. 提交后直接保存到委托单

#### 2.4 外部链接 API

**新建文件**:
- `src/app/api/external/entrustment/validate/route.ts` - 验证 token 并获取委托单信息
- `src/app/api/external/entrustment/submit/route.ts` - 提交客户填写的信息

---

## 关键文件清单

### 需要创建的文件 (5个)

| 文件 | 说明 |
|------|------|
| `src/lib/exportContractPDF.ts` | 合同 PDF 导出工具 |
| `src/app/api/entrustment/external-link/route.ts` | 生成外部链接 API |
| `src/app/api/external/entrustment/validate/route.ts` | 验证外部链接 API |
| `src/app/api/external/entrustment/submit/route.ts` | 提交外部数据 API |
| `src/app/external/entrustment/[token]/page.tsx` | 外部链接页面 |

### 需要修改的文件 (2个)

| 文件 | 修改内容 |
|------|----------|
| `src/app/(dashboard)/entrustment/contract/page.tsx` | 添加行选择、按钮、处理函数 |
| `src/app/(dashboard)/entrustment/list/page.tsx` | 外部链接按钮、合同跳转、URL参数 |

---

## 实施步骤

### 阶段1：合同页面 PDF 导出 (1-2小时)

1. ✅ 创建 `exportContractPDF.ts`
2. ✅ 修改合同页面添加按钮和逻辑
3. ✅ 测试 PDF 导出

### 阶段2：合同生成委托单 (30分钟)

1. ✅ 实现跳转逻辑
2. ✅ 修改委托单页面处理 URL 参数
3. ✅ 测试自动填充

### 阶段3：外部链接功能 (2-3小时)

1. ✅ 创建生成外部链接 API
2. ✅ 修改委托单页面添加按钮
3. ✅ 创建外部链接页面
4. ✅ 创建验证和提交 API
5. ✅ 测试完整流程

### 阶段4：测试与优化 (1小时)

1. ✅ 端到端测试
2. ✅ 错误处理
3. ✅ 用户体验优化

---

## 技术要点

### 安全性
- **Token**: 32字节随机字符串 (64位十六进制)
- **过期时间**: 7天
- **验证码**: 4位前端生成验证码

### 数据一致性
- 客户提交直接更新委托单（无需审核）
- 外部数据保存到 remark 字段的 externalData

### 用户体验
- 合同页面单选模式（radio）
- 一键复制链接
- 清晰的状态提示

---

## 可选优化

1. **PDF 中文字体**: 当前 jsPDF 不支持中文，需要额外配置
2. **访问日志**: 记录外部链接访问和提交
3. **邮件通知**: 客户提交后通知内部人员
4. **多次提交**: 允许客户多次补充信息
