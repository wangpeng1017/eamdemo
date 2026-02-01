'use client'

import { useState, useEffect } from "react"
import { showSuccess, showError } from '@/lib/confirm'
import { Table, Button, Space, Tag, Modal, Form, Select, message, Card, Statistic } from "antd"
import { PlayCircleOutlined, CheckCircleOutlined, ClockCircleOutlined, SwapOutlined, EditOutlined } from "@ant-design/icons"
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

interface User {
  id: string
  name: string
}

const statusMap: Record<string, { text: string; color: string }> = {
  pending: { text: "待开始", color: "default" },
  in_progress: { text: "进行中", color: "processing" },
  pending_review: { text: "待审核", color: "warning" },
  completed: { text: "已完成", color: "success" },
}

export default function MyTasksPage() {
  const router = useRouter()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [stats, setStats] = useState<Record<string, number>>({})
  const [users, setUsers] = useState<User[]>([])
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [currentTask, setCurrentTask] = useState<Task | null>(null)
  const [transferForm] = Form.useForm()

  const fetchData = async (p = page) => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(p),
      pageSize: "10",
      ...(statusFilter && { status: statusFilter }),
    })
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
    setLoading(false)
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/user?pageSize=1000')
      const json = await res.json()
      setUsers(json.data?.list || json.list || [])
    } catch (e) {
      console.error('获取用户列表失败:', e)
    }
  }

  useEffect(() => {
    fetchData()
    fetchUsers()
  }, [page, statusFilter])

  const handleStart = async (id: string) => {
    const res = await fetch(`/api/task/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start' })
    })
    if (res.ok) {
      showSuccess("任务已开始")
      fetchData()
    } else {
      const data = await res.json()
      showError(data.error || "操作失败")
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

  const openTransferModal = (task: Task) => {
    setCurrentTask(task)
    transferForm.resetFields()
    setTransferModalOpen(true)
  }

  const handleTransfer = async () => {
    if (!currentTask) return
    const values = await transferForm.validateFields()
    const res = await fetch(`/api/task/${currentTask.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'transfer',
        assignedToId: values.assignedToId,
        transferReason: values.reason || ''
      })
    })
    if (res.ok) {
      showSuccess("任务已转交")
      setTransferModalOpen(false)
      fetchData()
    } else {
      const data = await res.json()
      showError(data.error || "转交失败")
    }
  }

  const handleDataEntry = (task: Task) => {
    router.push(`/task/data/${task.id}`)
  }

  const columns: ColumnsType<Task> = [
    { title: "任务编号", dataIndex: "taskNo", width: 130 },
    { title: "样品名称", render: (_, r) => r.sample?.name || "-", width: 150 },
    { title: "样品编号", render: (_, r) => r.sample?.sampleNo || "-", width: 120 },
    { title: "检测项目", render: (_, r) => r.entrustmentProject?.name || "-", width: 150 },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag>
    },

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
            <Button type="primary" size="small" icon={<PlayCircleOutlined />} onClick={() => handleStart(record.id)}>
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
          {/* 已完成状态：显示"查看数据"按钮 */}
          {record.status === "completed" && (
            <Button size="small" icon={<EditOutlined />} onClick={() => handleDataEntry(record)}>
              查看数据
            </Button>
          )}
          {/* 非完成状态：显示"转交"按钮 */}
          {record.status !== "completed" && record.status !== "pending_review" && (
            <Button size="small" icon={<SwapOutlined />} onClick={() => openTransferModal(record)}>
              转交
            </Button>
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

      {/* 转交任务弹窗 */}
      <Modal
        title="转交任务"
        open={transferModalOpen}
        onOk={handleTransfer}
        onCancel={() => setTransferModalOpen(false)}
        width={400}
      >
        <Form form={transferForm} layout="vertical">
          <Form.Item name="assignedToId" label="转交给" rules={[{ required: true, message: '请选择接收人' }]}>
            <Select
              showSearch
              placeholder="选择接收人"
              optionFilterProp="label"
              options={users.map(u => ({ value: u.id, label: u.name }))}
            />
          </Form.Item>
          <Form.Item name="reason" label="转交原因">
            <Select placeholder="选择或输入原因" allowClear>
              <Select.Option value="工作调整">工作调整</Select.Option>
              <Select.Option value="设备故障">设备故障</Select.Option>
              <Select.Option value="技术支援">技术支援</Select.Option>
              <Select.Option value="其他">其他</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

