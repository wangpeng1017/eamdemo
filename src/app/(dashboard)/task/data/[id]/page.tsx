'use client'

import { useState, useEffect } from "react"
import { showSuccess, showError } from '@/lib/confirm'
import { useParams, useRouter } from "next/navigation"
import { Card, Button, Form, Input, Space, Modal, Descriptions, Tag, Spin } from "antd"
import { SaveOutlined, CheckOutlined, ArrowLeftOutlined } from "@ant-design/icons"
import dynamic from 'next/dynamic'

// ⚠️ 关键修复：禁用 SSR，避免 Fortune-sheet 在服务端执行 DOM 操作
const DataSheet = dynamic(() => import('@/components/DataSheet').then(mod => ({ default: mod.default })), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 items-center justify-center">
      <Spin size="large" tip="正在加载表格编辑器..." />
    </div>
  )
})

// 工具函数直接导入（不涉及 SSR）
import { generateSheetData, extractSheetData, getDefaultData, convertDataToCelldata } from "@/components/DataSheet"

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
  metadata?: string | any
  entrustmentProject?: {
    name: string;
    testItems: string;
    testTemplateId?: string;
    entrustment?: {
      id: string;
      entrustmentNo: string;
      samples?: { id: string; name: string; sampleNo: string }[]
    }
  }
}

// 检测辅助信息
interface TestMetadata {
  temperature?: string
  humidity?: string
  reviewer?: string
}

export default function DataEntryPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = params.id as string

  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [sheetData, setSheetData] = useState<any>(null)
  const [metadata, setMetadata] = useState<TestMetadata>({})
  const [submitModalOpen, setSubmitModalOpen] = useState(false)

  // 判断是否只读模式（只有已完成状态才只读）
  const isReadOnly = task?.status === 'completed'

  // 获取任务详情
  const fetchTask = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/task/${taskId}`)
      if (!res.ok) throw new Error("获取任务失败")
      const json = await res.json()

      // 处理 API 返回的数据结构
      const taskData = json.data || json
      setTask(taskData)

      // 加载 metadata
      if (taskData.metadata) {
        try {
          const meta = typeof taskData.metadata === 'string'
            ? JSON.parse(taskData.metadata)
            : taskData.metadata
          setMetadata(meta)
        } catch (e) {
          console.error("解析 metadata 失败", e)
        }
      }

      // 优先从 sheetData 加载数据（Fortune-sheet 格式）
      if (taskData.sheetData) {
        try {
          const parsed = typeof taskData.sheetData === 'string'
            ? JSON.parse(taskData.sheetData)
            : taskData.sheetData

          if (Array.isArray(parsed) && parsed.length > 0) {
            const sheet = parsed[0]
            if (sheet.data && sheet.data.length > 0) {
              const converted = convertDataToCelldata(parsed)
              setSheetData(converted)
            } else if (sheet.celldata && sheet.celldata.length > 0) {
              setSheetData(parsed)
            } else {
              await loadTemplateOrDefault(taskData)
            }
          } else {
            await loadTemplateOrDefault(taskData)
          }
        } catch (e) {
          console.error("解析 sheetData 失败", e)
          await loadTemplateOrDefault(taskData)
        }
      }
      // 兼容旧逻辑：如果 testData 是数组且非空
      else if (taskData.testData && Array.isArray(taskData.testData) && taskData.testData.length > 0) {
        setSheetData(taskData.testData)
      } else {
        await loadTemplateOrDefault(taskData)
      }
    } catch (error) {
      console.error("获取任务失败", error)
      showError("获取任务失败")
    } finally {
      setLoading(false)
    }
  }

  // 从模板加载列结构，或使用默认表格
  const loadTemplateOrDefault = async (taskData: Task) => {
    const templateId = taskData.entrustmentProject?.testTemplateId
    if (templateId) {
      try {
        const templateRes = await fetch(`/api/test-template/${templateId}`)
        if (templateRes.ok) {
          const templateJson = await templateRes.json()
          const templateData = templateJson.data || templateJson
          if (templateData?.schema) {
            const schema = typeof templateData.schema === 'string'
              ? JSON.parse(templateData.schema)
              : templateData.schema
            if (schema?.columns?.length > 0) {
              setSheetData(getDefaultData(schema))
              return
            }
          }
        }
      } catch (e) {
        console.error("加载模板失败，使用默认表格", e)
      }
    }
    setSheetData(getDefaultData())
  }

  useEffect(() => {
    if (taskId) fetchTask()
  }, [taskId])

  // 保存数据（草稿）
  const handleSave = async () => {
    setSaving(true)
    try {
      const dataToSave = sheetData && sheetData.length > 0 ? sheetData : getDefaultData()

      const res = await fetch(`/api/task/${taskId}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetData: dataToSave,
          metadata,
          status: 'in_progress',
        }),
      })

      const responseJson = await res.json()

      if (res.ok) {
        showSuccess('数据已保存')
      } else {
        console.error("保存失败:", responseJson)
        showError('保存失败')
      }
    } catch (error) {
      console.error("保存失败", error)
      showError('保存失败')
    } finally {
      setSaving(false)
    }
  }

  // 提交完成
  const handleSubmit = async () => {
    try {
      const startData = sheetData && sheetData.length > 0 ? sheetData : getDefaultData()

      const res = await fetch(`/api/task/${taskId}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetData: startData,
          metadata,
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

  if (loading || !task) {
    return <div className="p-4 text-center">加载中...</div>
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.back()}
          >
            返回
          </Button>
          <h1 className="text-xl font-medium">
            数据录入 - {task.taskNo}
          </h1>
        </div>
        {/* 顶部操作按钮 */}
        <Space>
          {!isReadOnly && (
            <>
              <Button
                icon={<SaveOutlined />}
                loading={saving}
                onClick={handleSave}
              >
                保存草稿
              </Button>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => setSubmitModalOpen(true)}
              >
                提交
              </Button>
            </>
          )}
        </Space>
      </div>

      {/* 任务信息 */}
      <Card className="mb-4" title="任务信息">
        <Descriptions column={4} size="small">
          <Descriptions.Item label="任务编号">{task.taskNo}</Descriptions.Item>
          <Descriptions.Item label="样品编号">{task.sample?.sampleNo || "-"}</Descriptions.Item>
          <Descriptions.Item label="样品名称">
            {task.sample?.name || task.sampleName || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="设备">{task.device?.name || "-"}</Descriptions.Item>
          <Descriptions.Item label="检测项目" span={2}>
            {task.entrustmentProject?.name || task.testItems?.map((item, i) => (
              <Tag key={i}>{item}</Tag>
            )) || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={task.status === "completed" ? "success" : "processing"}>
              {task.status === "pending" ? "待开始" : task.status === "in_progress" ? "进行中" : "已完成"}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 检测条件（辅助信息） */}
      <Card className="mb-4" title="检测条件" size="small">
        <div className="flex gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-gray-600 whitespace-nowrap">温度(℃)：</span>
            <Input
              style={{ width: 120 }}
              placeholder="如 23"
              value={metadata.temperature || ''}
              onChange={e => setMetadata({ ...metadata, temperature: e.target.value })}
              disabled={isReadOnly}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 whitespace-nowrap">湿度(%RH)：</span>
            <Input
              style={{ width: 120 }}
              placeholder="如 50"
              value={metadata.humidity || ''}
              onChange={e => setMetadata({ ...metadata, humidity: e.target.value })}
              disabled={isReadOnly}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600 whitespace-nowrap">复核人：</span>
            <Input
              style={{ width: 150 }}
              placeholder="复核人姓名"
              value={metadata.reviewer || ''}
              onChange={e => setMetadata({ ...metadata, reviewer: e.target.value })}
              disabled={isReadOnly}
            />
          </div>
        </div>
      </Card>

      {/* 数据录入表格 */}
      <Card
        title="检测数据录入"
        extra={
          isReadOnly && (
            <Tag color="blue">
              {task?.status === 'pending_review' ? '待审核' : '已完成'}
            </Tag>
          )
        }
      >
        {isReadOnly && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-blue-700">
              {task?.status === 'pending_review'
                ? '📋 数据已提交，等待主管审核'
                : '✅ 任务已完成，数据为只读状态'}
            </p>
          </div>
        )}
        <DataSheet
          data={sheetData}
          onChange={setSheetData}
          readonly={isReadOnly}
          height={500}
        />
      </Card>

      {/* 提交确认弹窗 */}
      <Modal
        title="提交完成确认"
        open={submitModalOpen}
        onCancel={() => setSubmitModalOpen(false)}
        onOk={handleSubmit}
        width={500}
      >
        <div className="text-gray-700 mb-4">
          <p>确认要提交任务数据吗？</p>
          <p className="text-sm text-gray-500 mt-2">提交后任务将标记为已完成，数据将不可再修改。</p>
        </div>
      </Modal>
    </div>
  )
}
