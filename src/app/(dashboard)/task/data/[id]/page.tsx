'use client'

import { useGoBack } from '@/hooks/useGoBack'
import { useState, useEffect } from "react"
import { showSuccess, showError } from '@/lib/confirm'
import { useParams, useRouter } from "next/navigation"
import { Card, Button, Form, Input, Space, Modal, Descriptions, Tag, Spin, Upload, Image, App } from "antd"
import { SaveOutlined, CheckOutlined, ArrowLeftOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons"
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
  samplePhotos?: string[]
}

export default function DataEntryPage() {
  const params = useParams()
  const router = useRouter()
  const goBack = useGoBack('/task/my')
  const { message } = App.useApp()
  const taskId = params.id as string

  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [sheetData, setSheetData] = useState<any>(null)
  const [metadata, setMetadata] = useState<TestMetadata>({})
  const [submitModalOpen, setSubmitModalOpen] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)

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
      if (taskData.sheetData && taskData.sheetData.length > 2) {
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
              await loadFromTestDataOrDefault(taskData)
            }
          } else {
            await loadFromTestDataOrDefault(taskData)
          }
        } catch (e) {
          console.error("解析 sheetData 失败", e)
          await loadFromTestDataOrDefault(taskData)
        }
      }
      // 从 TestData 表重建（兜底方案）
      else {
        await loadFromTestDataOrDefault(taskData)
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
    // 优先用 testTemplateId
    let templateId = taskData.entrustmentProject?.testTemplateId

    // 如果没有 templateId，按项目名称搜索匹配的模板
    if (!templateId && taskData.entrustmentProject?.name) {
      try {
        const searchRes = await fetch(`/api/test-template?keyword=${encodeURIComponent(taskData.entrustmentProject.name)}&pageSize=1`)
        if (searchRes.ok) {
          const searchJson = await searchRes.json()
          const list = searchJson.data?.list || searchJson.list || []
          if (list.length > 0) {
            templateId = list[0].id
          }
        }
      } catch (e) {
        // 搜索失败不影响后续逻辑
      }
    }

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

  // 从 TestData 表重建表格，或使用模板/默认表格
  const loadFromTestDataOrDefault = async (taskData: Task) => {
    // 如果有 testData 记录，从中重建表格
    if (taskData.testData && Array.isArray(taskData.testData) && taskData.testData.length > 0) {
      const celldata: any[] = []
      // 表头
      const headers = ['检测项目', '检测方法', '技术要求', '实测值', '单项判定', '备注']
      headers.forEach((h, c) => {
        celldata.push({ r: 0, c, v: { v: h, ct: { fa: "General", t: "g" }, bl: 1 } })
      })
      // 数据行
      taskData.testData.forEach((item: any, idx: number) => {
        const r = idx + 1
        const vals = [
          item.parameter || '',
          item.method || '',
          item.standard || '',
          item.value || '',
          item.result || '',
          item.remark || '',
        ]
        vals.forEach((v, c) => {
          if (v) {
            celldata.push({ r, c, v: { v, ct: { fa: "General", t: "g" } } })
          }
        })
      })

      setSheetData([{
        name: "检测数据",
        celldata,
        row: Math.max(taskData.testData.length + 5, 20),
        column: 8,
        config: {},
        index: "0",
        status: 1,
      }])
      return
    }

    // 否则尝试从模板或默认数据加载
    await loadTemplateOrDefault(taskData)
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
        message.success({ content: '保存成功', duration: 3 })
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
            onClick={() => goBack()}
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

          <Descriptions.Item label="检测项目" span={2}>
            {task.entrustmentProject?.name || task.testItems?.map((item, i) => (
              <Tag key={i}>{item}</Tag>
            )) || "-"}
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={task.status === "completed" ? "success" : "processing"}>
              {task.status === "pending" ? "待接收样品" : task.status === "sample_received" ? "已接收样品" : task.status === "in_progress" ? "进行中" : "已完成"}
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

        </div>
      </Card>

      {/* 样品照片 */}
      <Card className="mb-4" title="样品照片" size="small">
        <div className="flex flex-wrap gap-4">
          {(metadata.samplePhotos || []).map((url, i) => (
            <div key={i} className="relative group">
              <Image
                src={url}
                alt={`样品照片 ${i + 1}`}
                width={120}
                height={120}
                style={{ objectFit: 'cover', borderRadius: 4, border: '1px solid #d9d9d9' }}
              />
              {!isReadOnly && (
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => {
                    const photos = [...(metadata.samplePhotos || [])]
                    photos.splice(i, 1)
                    setMetadata({ ...metadata, samplePhotos: photos })
                  }}
                />
              )}
            </div>
          ))}
          {!isReadOnly && (metadata.samplePhotos || []).length < 5 && (
            <Upload
              name="file"
              action="/api/upload"
              accept=".png,.jpg,.jpeg"
              showUploadList={false}
              onChange={(info) => {
                if (info.file.status === 'uploading') setPhotoUploading(true)
                if (info.file.status === 'done') {
                  setPhotoUploading(false)
                  const url = info.file.response?.url || info.file.response?.data?.url
                  if (url) {
                    const photos = [...(metadata.samplePhotos || []), url]
                    setMetadata({ ...metadata, samplePhotos: photos })
                    showSuccess('照片上传成功')
                  }
                } else if (info.file.status === 'error') {
                  setPhotoUploading(false)
                  showError('照片上传失败')
                }
              }}
            >
              <div style={{
                width: 120, height: 120, border: '1px dashed #d9d9d9', borderRadius: 4,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#999'
              }}>
                {photoUploading ? <Spin size="small" /> : <PlusOutlined />}
                <span style={{ fontSize: 12, marginTop: 4 }}>上传照片</span>
              </div>
            </Upload>
          )}
        </div>
        <p style={{ color: '#999', fontSize: 12, marginTop: 8 }}>最多上传 5 张，支持 PNG/JPG 格式。照片将用于客户报告中的「样品照片」区域。</p>
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
