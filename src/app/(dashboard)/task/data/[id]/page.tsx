'use client'

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, Button, Form, Select, Input, message, Space, Modal, Descriptions, Tag } from "antd"
import { SaveOutlined, CheckOutlined, ArrowLeftOutlined } from "@ant-design/icons"
import DataSheet, { generateSheetData, extractSheetData, getDefaultData } from "@/components/DataSheet"

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
  const [sheetData, setSheetData] = useState<any>(null)
  const [submitModalOpen, setSubmitModalOpen] = useState(false)
  const [form] = Form.useForm()

  // 判断是否只读模式（只有已完成状态才只读）
  const isReadOnly = task?.status === 'completed'

  // 获取任务详情
  const fetchTask = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/task/${taskId}`)
      if (!res.ok) throw new Error("获取任务失败")
      const json = await res.json()

      // 处理 API 返回的数据结构：{success: true, data: {...}} 或直接返回数据
      const taskData = json.data || json
      setTask(taskData)

      console.log("[DataEntry] taskData.sheetData raw:", taskData.sheetData)

      // 优先从 sheetData 加载数据（Fortune-sheet 格式）
      if (taskData.sheetData) {
        try {
          // 如果已经是对象（API可能已经解析?），直接用
          const parsed = typeof taskData.sheetData === 'string'
            ? JSON.parse(taskData.sheetData)
            : taskData.sheetData

          console.log("[DataEntry] parsed sheetData:", parsed)

          if (Array.isArray(parsed) && parsed.length > 0) {
            setSheetData(parsed)
          } else {
            console.log("[DataEntry] parsed sheetData is empty or not array, init default")
            setSheetData(getDefaultData())
          }
        } catch (e) {
          console.error("解析 sheetData 失败", e)
          setSheetData(getDefaultData())
        }
      }
      // 兼容旧逻辑：如果 testData 是数组且非空
      else if (taskData.testData && Array.isArray(taskData.testData) && taskData.testData.length > 0) {
        console.log("[DataEntry] Using legacy testData")
        setSheetData(taskData.testData)
      } else {
        console.log("[DataEntry] No valid sheetData or testData found, initializing default")
        setSheetData(getDefaultData())
      }
    } catch (error) {
      console.error(error)
      message.error("获取任务失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (taskId) fetchTask()
  }, [taskId])

  // 保存数据（草稿）
  const handleSave = async () => {
    setSaving(true)
    try {
      // 确保不保存空数据，如果为空则保存默认结构
      const startData = sheetData && sheetData.length > 0 ? sheetData : getDefaultData()

      const res = await fetch(`/api/task/${taskId}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetData: startData,
          status: 'in_progress',
        }),
      })
      if (res.ok) {
        message.success({
          content: '✅ 数据已保存',
          duration: 2,
          key: 'save-draft'
        })
      } else {
        message.error({ content: '保存失败', key: 'save-draft' })
      }
    } catch (error) {
      message.error({ content: '保存失败', key: 'save-draft' })
    } finally {
      setSaving(false)
    }
  }

  // 提交完成
  const handleSubmit = async () => {
    try {
      await form.validateFields()
      const values = form.getFieldsValue()

      // 确保不提交空数据
      const startData = sheetData && sheetData.length > 0 ? sheetData : getDefaultData()

      const res = await fetch(`/api/task/${taskId}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetData: startData,
          action: 'submit',
          summary: values.summary,
          conclusion: values.conclusion,
        }),
      })

      if (res.ok) {
        message.success("提交成功")
        setSubmitModalOpen(false)
        router.push("/task/my")
      } else {
        message.error("提交失败")
      }
    } catch (error) {
      message.error("请填写完整信息")
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
            {/* 优先取 entrustment.sampleName (委托单通用样品名)，其次取 task.sample.name (具体样品名) */}
            {task.entrustmentProject?.entrustment?.sampleName || task.sample?.name || task.sampleName || "-"}
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
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="检测摘要"
            name="summary"
            rules={[{ required: true, message: "请输入检测摘要" }]}
          >
            <Input.TextArea rows={3} placeholder="请简要描述本次检测情况" />
          </Form.Item>
          <Form.Item
            label="检测结论"
            name="conclusion"
            rules={[{ required: true, message: "请输入检测结论" }]}
          >
            <Select placeholder="请选择检测结论">
              <Select.Option value="qualified">合格</Select.Option>
              <Select.Option value="unqualified">不合格</Select.Option>
              <Select.Option value="conditional">条件合格</Select.Option>
            </Select>
          </Form.Item>
        </Form>
        <div className="text-gray-500 text-sm">
          提交后任务将标记为已完成，无法再修改数据。
        </div>
      </Modal>
    </div>
  )
}
