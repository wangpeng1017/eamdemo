# 代码审查任务

## 审查范围
请审查以下三个文件/模型：

### 1. 前端数据录入页面
`src/app/(dashboard)/task/data/[id]/page.tsx` - 任务数据录入页面组件

### 2. 报告生成API
`src/app/api/report/generate/route.ts` - 报告生成API路由

### 3. 数据库模型
`prisma/schema.prisma` 中的 TestReport 和 FinanceInvoice 模型

## 审查重点

### 安全问题
- SQL注入风险
- XSS漏洞
- 用户输入验证缺失
- 敏感数据泄露
- 权限检查缺失

### 数据验证和边界条件
- 空值处理
- 类型检查
- 数组边界
- 字符串长度限制
- 数值范围验证

### 错误处理
- try-catch完整性
- 错误消息安全性
- 回滚机制
- 事务一致性

### 并发问题
- 竞态条件
- 报告编号生成
- 数据库事务隔离

### 性能问题
- N+1查询
- 内存泄漏
- 不必要的重渲染
- 大数据量处理

### 代码质量
- console.log调试代码残留
- 魔法数字
- 重复代码
- 命名规范

## 代码内容

### 文件1: src/app/(dashboard)/task/data/[id]/page.tsx
```tsx
'use client'

import { useState, useEffect } from "react"
import { showSuccess, showError } from '@/lib/confirm'
import { useParams, useRouter } from "next/navigation"
import { Card, Button, Form, Select, Input, message, Space, Modal, Descriptions, Tag } from "antd"
import { SaveOutlined, CheckOutlined, ArrowLeftOutlined, FileTextOutlined } from "@ant-design/icons"
import DataSheet, { generateSheetData, extractSheetData, getDefaultData, convertDataToCelldata } from "@/components/DataSheet"

interface Task {
  id: string
  taskNo: string
  sampleName: string | null
  sample?: { sampleNo: string; name: string }
  device?: { deviceNo: string; name: string }
  testItems: string[]
  status: string
  testData?: any
  sheetData?: string | any
  entrustmentProject?: {
    name: string;
    testItems: string;
    entrustment?: {
      id: string;
      entrustmentNo: string;
      sampleName: string;
      samples?: { id: string; name: string; sampleNo: string }[]
    }
  }
}

// ... 组件代码
}
```

### 文件2: src/app/api/report/generate/route.ts
```typescript
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// 生成报告编号
async function generateReportNo(): Promise<string> {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')

  const lastReport = await prisma.testReport.findFirst({
    where: {
      reportNo: {
        startsWith: `RPT-${dateStr}`
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  let seq = 1
  if (lastReport) {
    const lastSeq = parseInt(lastReport.reportNo.split('-')[2])
    seq = lastSeq + 1
  }

  return `RPT-${dateStr}-${seq.toString().padStart(3, '0')}`
}

// 生成检测报告
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const { taskId, templateId, precautions, conclusion, testData } = await request.json()

  if (!taskId) {
    return NextResponse.json({ error: '缺少任务ID' }, { status: 400 })
  }

  // 获取任务详情
  const task = await prisma.testTask.findUnique({
    where: { id: taskId },
    include: {
      sample: true,
      testData: true,
      assignedTo: { select: { name: true } },
    },
  })

  if (!task) {
    return NextResponse.json({ error: '任务不存在' }, { status: 404 })
  }

  if (task.status !== 'completed') {
    return NextResponse.json({ error: '只有已完成的任务才能生成报告' }, { status: 400 })
  }

  // 获取委托单信息
  let entrustment = null
  if (task.entrustmentId) {
    entrustment = await prisma.entrustment.findUnique({
      where: { id: task.entrustmentId },
      include: { client: true }
    })
  }

  // 生成报告编号
  const reportNo = await generateReportNo()

  // 确定最终数据
  const finalConclusion = conclusion !== undefined ? conclusion : ((task as any).conclusion || null)
  const finalTestData = testData !== undefined ? JSON.stringify(testData) : JSON.stringify(task.testData)

  // 创建报告记录
  const report = await prisma.testReport.create({
    data: {
      reportNo,
      taskId: task.id,
      entrustmentId: task.entrustmentId,
      clientName: entrustment?.client?.name,
      sampleNo: task.sample?.sampleNo,
      sampleName: task.sampleName,
      specification: task.sample?.specification,
      sampleQuantity: task.sample?.quantity,
      receivedDate: task.sample?.receiptDate,
      testParameters: task.parameters,
      testResults: finalTestData,
      overallConclusion: finalConclusion,
      precautions: precautions || null,
      tester: task.assignedTo?.name,
      status: 'draft',
    }
  })

  return NextResponse.json({
    success: true,
    data: report,
    message: '报告生成成功'
  })
}
```

### 文件3: Prisma Schema (TestReport 和 FinanceInvoice)

```prisma
model TestReport {
  id       String    @id @default(cuid())
  reportNo String    @unique @db.VarChar(50) // RPT-YYYYMMDD-XXX

  // 统一审批字段
  approvalStatus   String?   @default("pending") // pending/approved/rejected/cancelled
  approvalStep     Int?      @default(0)
  approvalInstanceId String?  @unique
  approvalInstance ApprovalInstance? @relation(fields: [approvalInstanceId], references: [id])

  // 基本信息
  entrustmentId String? @db.VarChar(50)
  projectName   String? @db.VarChar(200) // 检测项目
  clientName    String? @db.VarChar(200)

  // 样品信息
  sampleNo       String?   @db.VarChar(50)
  sampleName     String?   @db.VarChar(200)
  specification  String?   @db.VarChar(200)
  sampleQuantity String?   @db.VarChar(50)
  receivedDate   DateTime?

  // 检测信息
  testParameters    String? @db.Text // JSON 检测参数列表
  testResults       String? @db.LongText // JSON 结果数据
  standardName      String? @db.VarChar(200) // 检测标准
  overallConclusion String? @db.Text // 总体结论

  // 人员
  tester   String? @db.VarChar(50) // 检测人
  reviewer String? @db.VarChar(50) // 审核人
  approver String? @db.VarChar(50) // 批准人

  // 客户报告关联
  isClientReport Boolean @default(false)
  clientReportId String? @db.VarChar(50)
  clientReport   ClientReport? @relation(fields: [clientReportId], references: [id])

  precautions    String?   @db.Text // 检测注意事项

  // 富文本编辑相关
  richContent    String?   @db.Text      // 富文本内容
  lastEditedAt   DateTime?                // 最后编辑时间
  lastEditedBy   String?   @db.VarChar(50) // 最后编辑人

  status       String    @default("draft") // draft/reviewing/approved/issued
  approvalFlow String?   @db.Text // JSON 审批流程
  issuedDate   DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  approvals TestReportApproval[]

  @@map("biz_test_report")
}

model FinanceInvoice {
  id           String             @id @default(cuid())
  invoiceNo    String             @unique @db.VarChar(50) // INV-YYYYMMDD-XXX
  receivableId String?
  receivable   FinanceReceivable? @relation(fields: [receivableId], references: [id])
  clientId     String?
  client       Client?            @relation(fields: [clientId], references: [id])

  // 关联委托单
  entrustmentId String?           @db.VarChar(50)
  entrustment   Entrustment?       @relation(fields: [entrustmentId], references: [id])

  // 购买方信息
  clientName        String  @db.VarChar(200)
  clientTaxNo       String? @db.VarChar(50)
  clientAddress     String? @db.VarChar(500)
  clientPhone       String? @db.VarChar(20)
  clientBank        String? @db.VarChar(200)
  clientBankAccount String? @db.VarChar(50)

  invoiceType   String?   @db.VarChar(50) // 增值税普通发票/增值税专用发票
  invoiceAmount Decimal   @db.Decimal(12, 2) // 不含税金额
  taxRate       Decimal   @default(0.06) @db.Decimal(5, 4) // 税率
  taxAmount     Decimal   @db.Decimal(12, 2) // 税额
  totalAmount   Decimal   @db.Decimal(12, 2) // 价税合计
  status        String    @default("pending") // pending/issued
  issuedDate    DateTime? // 开票日期
  paymentDate   DateTime? // 回款日期
  remark        String?   @db.Text
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@map("fin_invoice")
}
```

## 输出要求

请按照以下格式输出审查结果：

### 1. Bug列表（按严重程度分类）

#### 严重 (CRITICAL)
- 必须立即修复的安全漏洞或可能导致数据丢失的bug

#### 中等 (HIGH)
- 应该尽快修复的bug

#### 轻微 (MEDIUM/LOW)
- 建议修复的问题

### 2. 每个Bug的格式
```
### [严重程度] Bug标题
**位置**: 文件路径:行号
**问题**: 详细描述
**影响**: 可能造成的后果
**修复建议**: 具体修复方案
**代码示例**: 修复前后对比（如有）
```

### 3. 代码质量评分
- 安全性: x/10
- 错误处理: x/10
- 代码规范: x/10
- 性能优化: x/10
- 总分: x/10

### 4. 改进建议
列出3-5条最重要的改进建议，按优先级排序。

请开始详细审查。
