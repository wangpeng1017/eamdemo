'use client'

import { useState, useEffect } from "react"
import { Table, Button, Space, Tag, Modal, Form, Select, DatePicker, Input, message } from "antd"
import type { ColumnsType } from "antd/es/table"
import dayjs from "dayjs"

interface Task {
  id: string
  taskNo: string
  sampleName: string | null
  status: string
  assignedTo: { id: string; name: string } | null
  dueDate: string | null
  progress: number
  sample?: { sampleNo: string; name: string }
}

const statusMap: Record<string, { text: string; color: string }> = {
  pending: { text: "待开始", color: "default" },
  in_progress: { text: "进行中", color: "processing" },
  completed: { text: "已完成", color: "success" },
  transferred: { text: "已转交", color: "warning" },
}

export default function AllTasksPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [assignForm] = Form.useForm()

  const fetchData = async (p = page) => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(p),
      pageSize: "10",
      ...(statusFilter && { status: statusFilter }),
    })
    const res = await fetch(`/api/task/all?${params}`)
    const json = await res.json()
    setData(json.list)
    setTotal(json.total)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [page, statusFilter])

  const handleAssign = (record: Task) => {
    setSelectedTask(record)
    assignForm.setFieldsValue({
      assignedToId: record.assignedTo?.id,
      dueDate: record.dueDate ? dayjs(record.dueDate) : null,
    })
    setAssignModalOpen(true)
  }

  const handleAssignSubmit = async () => {
    const values = await assignForm.validateFields()
    // TODO: 实现任务分配 API
    message.success("任务分配成功")
    setAssignModalOpen(false)
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
    { title: "执行人", dataIndex: "assignedTo", render: (v) => v?.name || "-", width: 100 },
    {
      title: "截止日期",
      dataIndex: "dueDate",
      width: 120,
      render: (d) => d ? dayjs(d).format("YYYY-MM-DD") : "-",
    },
    {
      title: "进度",
      dataIndex: "progress",
      width: 100,
      render: (v: number) => `${v}%`,
    },
    {
      title: "操作",
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => handleAssign(record)} disabled={record.status === "completed"}>
            分配
          </Button>
          <Button type="link" size="small">
            详情
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div className="p-4">
      <div className="mb-4 flex justify-between">
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

      <Modal title="任务分配" open={assignModalOpen} onCancel={() => setAssignModalOpen(false)} onOk={handleAssignSubmit}>
        <Form form={assignForm} layout="vertical">
          <Form.Item label="分配给" name="assignedToId" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="user1">张三</Select.Option>
              <Select.Option value="user2">李四</Select.Option>
              <Select.Option value="user3">王五</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="截止日期" name="dueDate">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
