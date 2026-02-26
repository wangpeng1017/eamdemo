'use client'

import { useState, useEffect, useCallback } from "react"
import { showSuccess, showError } from '@/lib/confirm'
import { Table, Button, Space, Tag, Modal, Form, Select, Card, Statistic, DatePicker, Input, App } from "antd"
import { InboxOutlined, PlayCircleOutlined, ClockCircleOutlined, EditOutlined, FileTextOutlined } from "@ant-design/icons"
import type { ColumnsType } from "antd/es/table"
import dayjs from "dayjs"
import { useRouter } from "next/navigation"

interface Task {
  id: string
  taskNo: string
  sampleName: string | null
  entrustmentId: string | null
  entrustmentNo: string | null
  status: string
  progress: number
  dueDate: string | null
  sample?: { sampleNo: string; name: string }
  createdAt: string
  entrustmentProject?: {
    name: string
    subcontractor?: string | null
    subcontractAssignee?: string | null
  }
  assignedTo?: { id: string; name: string } | null
}

interface UserOption {
  id: string
  name: string
  department?: string
}

const statusMap: Record<string, { text: string; color: string }> = {
  pending: { text: "待接收样品", color: "default" },
  sample_received: { text: "已接收样品", color: "cyan" },
  in_progress: { text: "进行中", color: "processing" },
  pending_review: { text: "待审核", color: "warning" },
  completed: { text: "已完成", color: "success" },
}

export default function OutsourceAllPage() {
  const router = useRouter()
  const { modal } = App.useApp()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [keyword, setKeyword] = useState("")
  const [stats, setStats] = useState<Record<string, number>>({})
  const [users, setUsers] = useState<UserOption[]>([])
  const [generating, setGenerating] = useState(false)

  // 分配弹窗状态（与 task/all 一致）
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [assignLoading, setAssignLoading] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [assignForm] = Form.useForm()


  const [currentTask, setCurrentTask] = useState<Task | null>(null)  // 接收样品
  const handleReceiveSample = async (task: Task) => {
    try {
      const res = await fetch(`/api/task/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'receiveSample' })
      })
      if (res.ok) {
        showSuccess("样品已接收")
        fetchData()
      } else {
        const data = await res.json()
        showError(data.error || "操作失败")
      }
    } catch {
      showError("操作失败")
    }
  }

  // 开始任务弹窗
  const [startModalOpen, setStartModalOpen] = useState(false)
  const [startForm] = Form.useForm()

  // 加载用户列表（按部门分组，与 task/all 一致）
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
      ...(keyword && { keyword }),
    })
    try {
      const res = await fetch(`/api/task/outsource?${params}`)
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data.list || [])
        setTotal(json.data.total || 0)
        setStats(json.data.stats || {})
      } else {
        setData(json.list || [])
        setTotal(json.total || 0)
        setStats(json.stats || {})
      }
    } catch {
      showError('获取任务列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [page, statusFilter])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleSearch = () => {
    setPage(1)
    fetchData(1)
  }

  // === 分配/重新分配（与 task/all 一致）===
  const handleAssign = (record: Task) => {
    setSelectedTask(record)
    assignForm.setFieldsValue({
      assignedToId: record.assignedTo?.id,
      dueDate: record.dueDate ? dayjs(record.dueDate) : null,
      remark: '',
    })
    setAssignModalOpen(true)
  }

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

  // === 开始任务 ===
  const openStartModal = (task: Task) => {
    setCurrentTask(task)
    startForm.resetFields()
    setStartModalOpen(true)
  }

  const handleStartSubmit = async () => {
    if (!currentTask) return
    try {
      const values = await startForm.validateFields()
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
    } catch {
      // validation failed
    }
  }


  // === 数据录入 ===
  const handleDataEntry = (task: Task) => {
    router.push(`/task/data/${task.id}`)
  }

  // === 生成报告 ===
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
        showSuccess('报告生成成功')
        router.push('/report/task-generate')
      } else {
        modal.warning({
          title: '操作提示',
          content: json.error || '报告生成失败',
          okText: '知道了',
          centered: true,
        })
      }
    } catch {
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

  // 按部门分组用户（与 task/all 一致）
  const usersByDepartment = users.reduce((acc, user) => {
    const dept = user.department || '未分配部门'
    if (!acc[dept]) acc[dept] = []
    acc[dept].push(user)
    return acc
  }, {} as Record<string, UserOption[]>)

  const columns: ColumnsType<Task> = [
    { title: "任务编号", dataIndex: "taskNo", width: 130 },
    {
      title: "委托编号",
      dataIndex: "entrustmentNo",
      width: 140,
      render: (v: string) => v || "-",
    },
    { title: "样品名称", render: (_: any, r: any) => r.sample?.name || r.sampleName || "-", width: 150 },
    { title: "样品编号", render: (_: any, r: any) => r.sample?.sampleNo || "-", width: 120 },
    { title: "检测项目", render: (_, r) => r.entrustmentProject?.name || "-", width: 150 },
    {
      title: "外包供应商",
      render: (_, r) => r.entrustmentProject?.subcontractor || "-",
      width: 130,
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag>
    },
    { title: "执行人", render: (_: any, r: any) => r.assignedTo?.name || "-", width: 100 },
    {
      title: "截止日期",
      dataIndex: "dueDate",
      width: 150,
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
          {/* 分包/重新分包 */}
          <Button type="link" size="small" onClick={() => handleAssign(record)} disabled={record.status === "completed"}>
            {record.assignedTo ? '重新分包' : '分包'}
          </Button>
          {/* 待接收样品状态：显示"接收样品"按钮 */}
          {record.status === "pending" && (
            <Button type="link" size="small" icon={<InboxOutlined />} onClick={() => handleReceiveSample(record)}>
              接收样品
            </Button>
          )}
          {/* 已接收样品状态：显示"开始"按钮 */}
          {record.status === "sample_received" && (
            <Button type="link" size="small" onClick={() => openStartModal(record)}>
              开始
            </Button>
          )}
          {/* 进行中状态：显示"录入数据"按钮 */}
          {record.status === "in_progress" && (
            <Button type="link" size="small" onClick={() => handleDataEntry(record)}>
              录入数据
            </Button>
          )}
          {/* 待审核/已完成状态：显示"查看数据"按钮 */}
          {(record.status === "pending_review" || record.status === "completed") && (
            <Button type="link" size="small" onClick={() => handleDataEntry(record)}>
              查看数据
            </Button>
          )}
          {/* 已完成状态：显示"生成报告"按钮 */}
          {record.status === "completed" && (
            <Button type="link" size="small" loading={generating} onClick={() => handleGenerateReport(record)}>
              生成报告
            </Button>
          )}

        </Space>
      ),
    },
  ]

  return (
    <div className="p-4">
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>全部外包</h2>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        <Card>
          <Statistic title="全部任务" value={(stats.pending || 0) + (stats.in_progress || 0) + (stats.pending_review || 0) + (stats.completed || 0)} prefix={<ClockCircleOutlined />} />
        </Card>
        <Card>
          <Statistic title="待接收" value={stats.pending || 0} valueStyle={{ color: "#cf1322" }} />
        </Card>
        <Card>
          <Statistic title="进行中" value={stats.in_progress || 0} valueStyle={{ color: "#1890ff" }} />
        </Card>
        <Card>
          <Statistic title="已完成" value={stats.completed || 0} valueStyle={{ color: "#52c41a" }} />
        </Card>
      </div>

      <div className="mb-4 flex gap-2">
        <Input.Search
          placeholder="搜索任务编号/样品名称"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onSearch={handleSearch}
          style={{ width: 240 }}
          allowClear
        />
        <Select
          placeholder="状态筛选"
          allowClear
          style={{ width: 120 }}
          onChange={(v) => setStatusFilter(v)}
          value={statusFilter}
        >
          <Select.Option value="pending">待接收样品</Select.Option>
          <Select.Option value="sample_received">已接收样品</Select.Option>
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
        scroll={{ x: 1500 }}
        pagination={{
          current: page,
          pageSize: 10,
          total,
          onChange: (p) => setPage(p),
        }}
      />

      {/* 分配任务弹窗（与 task/all 完全一致） */}
      <Modal
        title="分包任务"
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



      {/* 开始任务弹窗 */}
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
