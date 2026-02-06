# 代码审查任务 - 完整版

## 审查文件1: src/app/(dashboard)/task/data/[id]/page.tsx

完整代码：
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

interface TestRecord {
  id: string
  testItem: string
  testMethod: string
  requirement: string
  actualValue: string
  result: string
  remark: string
}

export default function DataEntryPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = params.id as string

  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [sheetData, setSheetData] = useState<any>(null)
  const [submitModalOpen, setSubmitModalOpen] = useState(false)
  const [form] = Form.useForm()

  const isReadOnly = task?.status === 'completed'

  const fetchTask = async () => {
    setLoading(true)
    console.log("[DataEntry Fetch] Starting fetch for taskId:", taskId)
    try {
      const res = await fetch(`/api/task/${taskId}`)
      console.log("[DataEntry Fetch] Response status:", res.status)
      if (!res.ok) throw new Error("获取任务失败")
      const json = await res.json()

      const taskData = json.data || json
      setTask(taskData)

      console.log("[DataEntry Fetch] taskData.sheetData raw type:", typeof taskData.sheetData)
      console.log("[DataEntry Fetch] taskData.sheetData raw length:", taskData.sheetData?.length)

      if (taskData.sheetData) {
        try {
          const parsed = typeof taskData.sheetData === 'string'
            ? JSON.parse(taskData.sheetData)
            : taskData.sheetData

          console.log("[DataEntry Fetch] parsed sheetData isArray:", Array.isArray(parsed))
          console.log("[DataEntry Fetch] parsed sheetData length:", parsed?.length)

          if (Array.isArray(parsed) && parsed.length > 0) {
            const sheet = parsed[0]
            console.log("[DataEntry Fetch] sheet.celldata:", sheet.celldata?.length)
            console.log("[DataEntry Fetch] sheet.data:", sheet.data?.length)

            if (sheet.data && sheet.data.length > 0) {
              console.log("[DataEntry Fetch] Using data format (edited format), converting to celldata")
              const converted = convertDataToCelldata(parsed)
              setSheetData(converted)
            } else if (sheet.celldata && sheet.celldata.length > 0) {
              console.log("[DataEntry Fetch] Using celldata format (initial format)")
              setSheetData(parsed)
            } else {
              console.log("[DataEntry Fetch] No valid data in sheet, using default")
              setSheetData(getDefaultData())
            }
          } else {
            console.log("[DataEntry Fetch] parsed sheetData is empty or not array, init default")
            setSheetData(getDefaultData())
          }
        } catch (e) {
          console.error("[DataEntry Fetch] 解析 sheetData 失败", e)
          setSheetData(getDefaultData())
        }
      }
      else if (taskData.testData && Array.isArray(taskData.testData) && taskData.testData.length > 0) {
        console.log("[DataEntry Fetch] Using legacy testData")
        setSheetData(taskData.testData)
      } else {
        console.log("[DataEntry Fetch] No valid sheetData or testData found, initializing default")
        setSheetData(getDefaultData())
      }
    } catch (error) {
      console.error("[DataEntry Fetch] Error:", error)
      showError("获取任务失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (taskId) fetchTask()
  }, [taskId])

  const handleSave = async () => {
    setSaving(true)
    try {
      console.log("[DataEntry Save] Current sheetData state:", sheetData)
      console.log("[DataEntry Save] sheetData type:", typeof sheetData)
      console.log("[DataEntry Save] sheetData length:", sheetData?.length)
      if (sheetData && sheetData[0]) {
        console.log("[DataEntry Save] sheetData[0].celldata:", sheetData[0].celldata)
        console.log("[DataEntry Save] sheetData[0].celldata length:", sheetData[0].celldata?.length)
      }

      const dataToSave = sheetData && sheetData.length > 0 ? sheetData : getDefaultData()
      console.log("[DataEntry Save] dataToSave:", JSON.stringify(dataToSave).substring(0, 500))

      const res = await fetch(`/api/task/${taskId}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetData: dataToSave,
          status: 'in_progress',
        }),
      })

      const responseJson = await res.json()
      console.log("[DataEntry Save] Response:", responseJson)

      if (res.ok) {
        showSuccess({
          content: '✅ 数据已保存',
          duration: 2,
          key: 'save-draft'
        })
      } else {
        console.error("[DataEntry Save] Save failed:", responseJson)
        showError({ content: '保存失败', key: 'save-draft' })
      }
    } catch (error) {
      console.error("[DataEntry Save] Error:", error)
      showError({ content: '保存失败', key: 'save-draft' })
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    try {
      const startData = sheetData && sheetData.length > 0 ? sheetData : getDefaultData()

      const res = await fetch(`/api/task/${taskId}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetData: startData,
          action: 'submit',
        }),
      })

      if (res.ok) {
        showSuccess("✅ 提交成功！任务已完成")
        setSubmitModalOpen(false)
        router.push("/task/my")
      } else {
        showError("提交失败")
      }
    } catch (error) {
      showError("提交失败")
    }
  }

  const handleGenerateReport = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/report/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
        }),
      })

      const json = await res.json()

      if (res.ok && json.success) {
        showSuccess('报告生成成功')
        setTimeout(() => {
          window.open(`/test/report/${json.data.id}`, '_blank')
        }, 500)
      } else {
        showError(json.error || '报告生成失败')
      }
    } catch (error) {
      console.error('生成报告失败:', error)
      showError('报告生成失败')
    } finally {
      setGenerating(false)
    }
  }

  if (loading || !task) {
    return <div className="p-4 text-center">加载中...</div>
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* JSX渲染代码省略 */}
    </div>
  )
}
```

## 审查文件2: src/app/api/report/generate/route.ts

完整代码：
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

## 审查文件3: Prisma Schema 相关模型

TestReport 模型:
- reportNo: String @unique @db.VarChar(50) // RPT-YYYYMMDD-XXX
- testResults: String? @db.LongText // JSON 结果数据
- testParameters: String? @db.Text // JSON 检测参数列表

FinanceInvoice 模型:
- invoiceNo: String @unique @db.VarChar(50) // INV-YYYYMMDD-XXX
- totalAmount: Decimal @db.Decimal(12, 2) // 价税合计

## 审查要求

请仔细审查以上代码，找出以下问题：

1. **安全问题**
   - SQL注入
   - XSS
   - 输入验证缺失
   - 权限问题

2. **Bug和潜在问题**
   - 空值处理
   - 边界条件
   - 错误处理不完整

3. **并发和事务问题**
   - 报告编号生成的竞态条件
   - 数据一致性问题

4. **性能问题**
   - N+1查询
   - 内存泄漏
   - 不必要的操作

5. **代码质量问题**
   - console.log残留
   - 魔法值
   - 重复代码

请输出完整的审查报告，格式要求：
- 按严重程度分类（严重/中等/轻微）
- 每个问题包含：位置、问题描述、影响、修复建议
- 代码质量评分（1-10分）
- 改进建议优先级列表
