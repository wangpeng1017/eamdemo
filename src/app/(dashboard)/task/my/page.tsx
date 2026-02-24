'use client'

import { useState, useEffect } from "react"
import { showSuccess, showError, showWarning } from '@/lib/confirm'
import { Table, Button, Space, Tag, Modal, Form, Select, message, Card, Statistic, DatePicker, App } from "antd"
import { PlayCircleOutlined, CheckCircleOutlined, ClockCircleOutlined, EditOutlined, FileTextOutlined } from "@ant-design/icons"
import type { ColumnsType } from "antd/es/table"
import dayjs from "dayjs"
import { useRouter } from "next/navigation"

interface Task {
  id: string
  taskNo: string
  sampleName: string | null
  entrustmentId: string | null
  status: string
  progress: number
  dueDate: string | null
  sample?: { sampleNo: string; name: string }
  createdAt: string
  entrustmentProject?: { name: string }
}


const statusMap: Record<string, { text: string; color: string }> = {
  pending: { text: "待开始", color: "default" },
  in_progress: { text: "进行中", color: "processing" },
  pending_review: { text: "待审核", color: "warning" },
  completed: { text: "已完成", color: "success" },
}

export default function MyTasksPage() {
  const router = useRouter()
  const { modal } = App.useApp()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [stats, setStats] = useState<Record<string, number>>({})

  // 模态框状态
  const [startModalOpen, setStartModalOpen] = useState(false)
  const [currentTask, setCurrentTask] = useState<Task | null>(null)
  const [startForm] = Form.useForm()
  const [generating, setGenerating] = useState(false)

  const fetchData = async (p = page) => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(p),
      pageSize: "10",
      ...(statusFilter && { status: statusFilter }),
    })
    try {
      const res = await fetch(`/api/task/my?${params}`)
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data.list || [])
        setTotal(json.data.total || 0)
      } else {
        setData(json.list || [])
        setTotal(json.total || 0)
      }
      setStats(json.stats || {})
    } catch (e) {
      showError('获取任务列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [page, statusFilter])



  // 打开开始任务模态框
  const openStartModal = (task: Task) => {
    setCurrentTask(task)
    startForm.resetFields()
    setStartModalOpen(true)
  }

  // 提交开始任务
  const handleStartSubmit = async () => {
    if (!currentTask) return
    try {
      const values = await startForm.validateFields()

      // 校验：完成时间必须晚于开始时间
      if (values.plannedEndDate && values.plannedStartDate &&
        values.plannedEndDate.isBefore(values.plannedStartDate)) {
        showWarning('时间校验', '预计完成时间不能早于预计开始时间，请重新选择')
        return
      }

      const res = await fetch(`/api/task/${currentTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          plannedStartDate: values.plannedStartDate,
          plannedEndDate: values.plannedEndDate,
        })
      })

      if (res.ok) {
        showSuccess("任务已开始")
        setStartModalOpen(false)
        fetchData()
      } else {
        const data = await res.json()
        showError(data.error || "操作失败")
      }
    } catch (e) {
      // validation failed
    }
  }

  const handleComplete = async (id: string) => {
    const res = await fetch(`/api/task/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete' })
    })
    if (res.ok) {
      showSuccess("任务已完成")
      fetchData()
    } else {
      const data = await res.json()
      showError(data.error || "操作失败")
    }
  }



  const handleDataEntry = (task: Task) => {
    router.push(`/task/data/${task.id}`)
  }

  // 生成报告
  const handleGenerateReport = async (task: Task) => {
    setGenerating(true)
    try {
      const res = await fetch('/api/report/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        modal.success({
          title: '已生成任务报告',
          content: (
            <div>
              <p>任务 <strong>{task.taskNo}</strong> 的报告已成功生成。</p>
              <p style={{ color: '#999', marginTop: 8 }}>报告编号：<strong>{json.data?.reportNo || '-'}</strong></p>
              <p style={{ color: '#999' }}>可前往「任务报告生成」模块查看和编辑报告内容。</p>
            </div>
          ),
          okText: '查看报告',
          onOk: () => router.push('/report/task-generate'),
          centered: true,
        })
        fetchData()
      } else {
        modal.warning({
          title: '操作提示',
          content: json.error || '报告生成失败',
          okText: '知道了',
          centered: true,
        })
      }
    } catch (error) {
      modal.warning({
        title: '操作提示',
        content: '报告生成失败，请稍后重试',
        okText: '知道了',
        centered: true,
      })
    } finally {
      setGenerating(false)
    }
  }

  const columns: ColumnsType<Task> = [
    { title: "任务编号", dataIndex: "taskNo", width: 130 },
    { title: "委托编号", dataIndex: "entrustmentNo", width: 150, render: (v: string) => v || "-" },
    { title: "样品名称", render: (_: any, r: any) => r.sample?.name || r.sampleName || "-", width: 150 },
    { title: "样品编号", render: (_, r) => r.sample?.sampleNo || "-", width: 120 },
    { title: "检测项目", render: (_, r) => r.entrustmentProject?.name || "-", width: 150 },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag>
    },
    { title: "执行人", dataIndex: "assignedTo", render: (v: any) => v?.name || "-", width: 100 },
    {
      title: "截止日期",
      dataIndex: "dueDate",
      width: 160,
      render: (d) => d ? dayjs(d).format("YYYY-MM-DD HH:mm:ss") : "-",
    },
    {
      title: "任务分配时间",
      dataIndex: "createdAt",
      width: 160,
      render: (d) => d ? dayjs(d).format("YYYY-MM-DD HH:mm:ss") : "-",
    },
    {
      title: '操作', fixed: 'right',
      render: (_, record) => (
        <Space size="small" style={{ whiteSpace: 'nowrap' }}>
          {/* 待开始状态：显示"开始"按钮 */}
          {record.status === "pending" && (
            <Button type="primary" size="small" icon={<PlayCircleOutlined />} onClick={() => openStartModal(record)}>
              开始
            </Button>
          )}
          {/* 进行中状态：显示"录入数据"按钮 */}
          {record.status === "in_progress" && (
            <Button type="primary" size="small" icon={<EditOutlined />} onClick={() => handleDataEntry(record)}>
              录入数据
            </Button>
          )}
          {/* 待审核状态：显示"查看数据"按钮 */}
          {record.status === "pending_review" && (
            <Button size="small" icon={<EditOutlined />} onClick={() => handleDataEntry(record)}>
              查看数据
            </Button>
          )}
          {/* 已完成状态：显示"查看数据"和"生成报告"按钮 */}
          {record.status === "completed" && (
            <>
              <Button size="small" icon={<EditOutlined />} onClick={() => handleDataEntry(record)}>
                查看数据
              </Button>
              <Button size="small" type="primary" icon={<FileTextOutlined />} loading={generating} onClick={() => handleGenerateReport(record)}>
                生成报告
              </Button>
            </>
          )}

        </Space>
      ),
    },
  ]

  return (
    <div className="p-4">
      <div className="grid grid-cols-4 gap-4 mb-4">
        <Card>
          <Statistic title="全部任务" value={(stats.pending || 0) + (stats.in_progress || 0) + (stats.pending_review || 0) + (stats.completed || 0)} prefix={<ClockCircleOutlined />} />
        </Card>
        <Card>
          <Statistic title="待开始" value={stats.pending || 0} valueStyle={{ color: "#cf1322" }} />
        </Card>
        <Card>
          <Statistic title="进行中" value={stats.in_progress || 0} valueStyle={{ color: "#1890ff" }} />
        </Card>
        <Card>
          <Statistic title="已完成" value={stats.completed || 0} valueStyle={{ color: "#52c41a" }} />
        </Card>
      </div>

      <div className="mb-4">
        <Select
          placeholder="状态筛选"
          allowClear
          style={{ width: 120 }}
          onChange={(v) => setStatusFilter(v)}
          value={statusFilter}
        >
          <Select.Option value="pending">待开始</Select.Option>
          <Select.Option value="in_progress">进行中</Select.Option>
          <Select.Option value="pending_review">待审核</Select.Option>
          <Select.Option value="completed">已完成</Select.Option>
        </Select>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize: 10,
          total,
          onChange: (p) => setPage(p),
        }}
      />



      {/* 需求6：开始任务弹窗 */}
      <Modal
        title="开始检测任务"
        open={startModalOpen}
        onOk={handleStartSubmit}
        onCancel={() => setStartModalOpen(false)}
        width={400}
      >
        <Form form={startForm} layout="vertical">
          <p className="mb-4 text-gray-500">确认开始任务并记录预计时间：</p>
          <Form.Item name="plannedStartDate" label="预计开始时间" rules={[{ required: true, message: '请选择开始时间' }]}>
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="plannedEndDate" label="预计完成时间" rules={[{ required: true, message: '请选择完成时间' }]}>
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
