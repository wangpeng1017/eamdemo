'use client'

import { useState, useEffect, useCallback } from "react"
import { showSuccess, showError } from '@/lib/confirm'
import { Table, Button, Space, Tag, Modal, Form, Select, DatePicker, Input } from "antd"
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
  createdAt: string
  entrustmentProject?: { name: string }
}

interface UserOption {
  id: string
  name: string
  department?: string
}

const statusMap: Record<string, { text: string; color: string }> = {
  pending: { text: "待开始", color: "default" },
  in_progress: { text: "进行中", color: "processing" },
  pending_review: { text: "待审核", color: "warning" },
  completed: { text: "已完成", color: "success" },
  transferred: { text: "已转交", color: "cyan" },
}

export default function AllTasksPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [assignLoading, setAssignLoading] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [users, setUsers] = useState<UserOption[]>([])
  const [assignForm] = Form.useForm()

  // 加载组织架构用户列表
  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/user?pageSize=200')
      const json = await res.json()
      const list = json.data?.list || json.list || []
      setUsers(list.map((u: any) => ({
        id: u.id,
        name: u.name,
        department: u.department?.name || '未分配部门',
      })))
    } catch {
      // 用户列表加载失败不影响主功能
    }
  }, [])

  const fetchData = async (p = page) => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(p),
      pageSize: "10",
      ...(statusFilter && { status: statusFilter }),
    })
    const res = await fetch(`/api/task/all?${params}`)
    const json = await res.json()
    if (json.success && json.data) {
      setData(json.data.list || [])
      setTotal(json.data.total || 0)
    } else {
      setData(json.list || [])
      setTotal(json.total || 0)
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [page, statusFilter])
  useEffect(() => { loadUsers() }, [loadUsers])

  const handleAssign = (record: Task) => {
    setSelectedTask(record)
    assignForm.setFieldsValue({
      assignedToId: record.assignedTo?.id,
      dueDate: record.dueDate ? dayjs(record.dueDate) : null,
      remark: '',
    })
    setAssignModalOpen(true)
  }

  // 调用任务分配 API
  const handleAssignSubmit = async () => {
    const values = await assignForm.validateFields()
    if (!selectedTask) return

    setAssignLoading(true)
    try {
      const res = await fetch(`/api/task/${selectedTask.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign',
          assignedToId: values.assignedToId,
          dueDate: values.dueDate ? values.dueDate.toISOString() : undefined,
          remark: values.remark,
        }),
      })
      const json = await res.json()
      if (json.success !== false) {
        showSuccess('任务分配成功')
        setAssignModalOpen(false)
        fetchData()
      } else {
        showError(json.message || '分配失败')
      }
    } catch {
      showError('网络错误，请重试')
    } finally {
      setAssignLoading(false)
    }
  }

  // 按部门分组用户
  const usersByDepartment = users.reduce((acc, user) => {
    const dept = user.department || '未分配部门'
    if (!acc[dept]) acc[dept] = []
    acc[dept].push(user)
    return acc
  }, {} as Record<string, UserOption[]>)

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
    { title: "执行人", dataIndex: "assignedTo", render: (v) => v?.name || "-", width: 100 },
    {
      title: "截止日期",
      dataIndex: "dueDate",
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
          <Button type="link" size="small" onClick={() => handleAssign(record)} disabled={record.status === "completed"}>
            分配
          </Button>
          {record.status === "in_progress" && (
            <Button type="link" size="small" onClick={() => window.location.href = `/task/data/${record.id}`}>
              录入数据
            </Button>
          )}
          {record.status === "completed" && (
            <Button type="link" size="small" onClick={() => window.location.href = `/task/data/${record.id}`}>
              查看数据
            </Button>
          )}
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

      <Modal
        title="任务分配"
        open={assignModalOpen}
        onCancel={() => setAssignModalOpen(false)}
        onOk={handleAssignSubmit}
        confirmLoading={assignLoading}
      >
        <Form form={assignForm} layout="vertical">
          <Form.Item label="分配给" name="assignedToId" rules={[{ required: true, message: '请选择执行人' }]}>
            <Select
              showSearch
              placeholder="搜索或选择执行人"
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {Object.entries(usersByDepartment).map(([dept, deptUsers]) => (
                <Select.OptGroup key={dept} label={dept}>
                  {deptUsers.map(u => (
                    <Select.Option key={u.id} value={u.id} label={u.name}>
                      {u.name}
                    </Select.Option>
                  ))}
                </Select.OptGroup>
              ))}
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
