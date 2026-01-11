'use client'

import { useState, useEffect } from "react"
import { Table, Button, Space, Tag, Modal, Form, Input, DatePicker, Select, message, Card, Statistic } from "antd"
import { PlayCircleOutlined, CheckCircleOutlined, ClockCircleOutlined } from "@ant-design/icons"
import type { ColumnsType } from "antd/es/table"
import dayjs from "dayjs"

interface Task {
  id: string
  taskNo: string
  sampleName: string | null
  status: string
  progress: number
  dueDate: string | null
  sample?: { sampleNo: string; name: string }
}

const statusMap: Record<string, { text: string; color: string }> = {
  pending: { text: "待开始", color: "default" },
  in_progress: { text: "进行中", color: "processing" },
  completed: { text: "已完成", color: "success" },
}

export default function MyTasksPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [stats, setStats] = useState<Record<string, number>>({})

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
      if (json.success && json.data) {
      setData(json.data.list || [])
      setTotal(json.data.total || 0)
    } else {
      setData(json.list || [])
      setTotal(json.total || 0)
    }
    }
    setStats(json.stats || {})
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [page, statusFilter])

  const handleStart = async (id: string) => {
    // TODO: 实现开始任务 API
    message.success("任务已开始")
    fetchData()
  }

  const handleComplete = async (id: string) => {
    // TODO: 实现完成任务 API
    message.success("任务已完成")
    fetchData()
  }

  const columns: ColumnsType<Task> = [
    { title: "任务编号", dataIndex: "taskNo", width: 130 },
    { title: "样品名称", dataIndex: "sampleName", width: 150 },
    { title: "样品编号", render: (_, r) => r.sample?.sampleNo || "-", width: 120 },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag>
    },
    {
      title: "进度",
      dataIndex: "progress",
      width: 120,
      render: (v: number) => (
        <div className="flex items-center gap-2">
          <div className="w-20 bg-gray-200 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${v}%` }}></div>
          </div>
          <span className="text-xs">{v}%</span>
        </div>
      ),
    },
    {
      title: "截止日期",
      dataIndex: "dueDate",
      width: 120,
      render: (d) => d ? dayjs(d).format("YYYY-MM-DD HH:mm:ss") : "-",
    },
    {
      title: "操作",
      width: 200,
      render: (_, record) => (
        <Space size="small">
          {record.status === "pending" && (
            <Button type="primary" size="small" icon={<PlayCircleOutlined />} onClick={() => handleStart(record.id)}>
              开始
            </Button>
          )}
          {record.status === "in_progress" && (
            <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={() => handleComplete(record.id)}>
              完成
            </Button>
          )}
          <Button size="small">录入数据</Button>
        </Space>
      ),
    },
  ]

  return (
    <div className="p-4">
      <div className="grid grid-cols-4 gap-4 mb-4">
        <Card>
          <Statistic title="全部任务" value={stats.pending ? stats.pending + stats.in_progress + stats.completed : 0} prefix={<ClockCircleOutlined />} />
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
    </div>
  )
}
