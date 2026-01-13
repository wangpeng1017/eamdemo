'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Space, Modal, Form, Input, Select, DatePicker, InputNumber, message, Tag, Popconfirm, Row, Col } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { StatusTag } from '@/components/StatusTag'
import UserSelect from '@/components/UserSelect'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface MaintenancePlanItem {
  id?: string
  itemName: string
  description?: string
}

interface MaintenancePlan {
  id: string
  deviceId: string | null
  deviceName: string | null
  planName: string
  planType: string
  interval: number | null
  nextDate: string | null
  responsiblePerson: string | null
  maintenanceItems: string | null
  status: string
  createdAt: string
}

const PLAN_TYPE_OPTIONS = [
  { value: 'daily', label: '每日' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
  { value: 'quarterly', label: '每季度' },
  { value: 'annual', label: '每年' },
]

const STATUS_OPTIONS = [
  { value: 'active', label: '启用' },
  { value: 'inactive', label: '停用' },
]

const PLAN_TYPE_MAP: Record<string, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
  quarterly: 90,
  annual: 365,
}

export default function MaintenancePlanPage() {
  const [data, setData] = useState<MaintenancePlan[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [devices, setDevices] = useState<any[]>([])
  const [items, setItems] = useState<MaintenancePlanItem[]>([])
  const [form] = Form.useForm()

  const fetchData = async (p = page) => {
    setLoading(true)
    const res = await fetch(`/api/device/maintenance-plan?page=${p}&pageSize=10`)
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
    setLoading(false)
  }

  const fetchDevices = async () => {
    const res = await fetch('/api/device?pageSize=1000')
    const json = await res.json()
    setDevices(json.list || [])
  }

  useEffect(() => { fetchData() }, [page])
  useEffect(() => { fetchDevices() }, [])

  const handleAdd = () => {
    setEditingId(null)
    setItems([{ itemName: '', description: '' }])
    form.resetFields()
    form.setFieldsValue({
      planType: 'monthly',
      interval: 30,
      status: 'active',
      nextDate: dayjs().add(1, 'month'),
    })
    setModalOpen(true)
  }

  const handleEdit = (record: MaintenancePlan) => {
    setEditingId(record.id)
    const maintenanceItems = record.maintenanceItems ? JSON.parse(record.maintenanceItems) : []
    setItems(maintenanceItems)
    form.setFieldsValue({
      ...record,
      nextDate: record.nextDate ? dayjs(record.nextDate) : null,
    })
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/device/maintenance-plan/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (res.ok && json.success) {
      message.success('删除成功')
      fetchData()
    } else {
      message.error(json.error?.message || '删除失败')
    }
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const data = {
      ...values,
      nextDate: values.nextDate?.toISOString(),
      maintenanceItems: JSON.stringify(items.filter(i => i.itemName)),
    }
    const url = editingId ? `/api/device/maintenance-plan/${editingId}` : '/api/device/maintenance-plan'
    const method = editingId ? 'PUT' : 'POST'
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    message.success(editingId ? '更新成功' : '创建成功')
    setModalOpen(false)
    fetchData()
  }

  const handleComplete = async (id: string) => {
    // 完成保养后，计算下一次保养日期
    const plan = data.find(d => d.id === id)
    if (!plan) return

    const interval = PLAN_TYPE_MAP[plan.planType] || plan.interval || 30
    const nextDate = dayjs(plan.nextDate).add(interval, 'day')

    await fetch(`/api/device/maintenance-plan/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nextDate: nextDate.toISOString() })
    })
    message.success('保养完成，已更新下一次保养日期')
    fetchData()
  }

  // 保养项目表格列
  const itemColumns: ColumnsType<MaintenancePlanItem> = [
    {
      title: '保养项目',
      dataIndex: 'itemName',
      width: 150,
      render: (value, record, index) => (
        <Input
          value={value}
          onChange={(e) => {
            const newItems = [...items]
            newItems[index].itemName = e.target.value
            setItems(newItems)
          }}
          placeholder="请输入保养项目"
        />
      ),
    },
    {
      title: '说明',
      dataIndex: 'description',
      width: 200,
      render: (value, record, index) => (
        <Input
          value={value}
          onChange={(e) => {
            const newItems = [...items]
            newItems[index].description = e.target.value
            setItems(newItems)
          }}
          placeholder="说明"
        />
      ),
    },
    {
      title: '操作',
      width: 60,
      render: (_, record, index) => (
        <Button
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => setItems(items.filter((_, i) => i !== index))}
        />
      ),
    },
  ]

  const columns: ColumnsType<MaintenancePlan> = [
    { title: '计划名称', dataIndex: 'planName', width: 150 },
    {
      title: '设备名称',
      dataIndex: 'deviceName',
      width: 120,
      render: (v) => v || '-',
    },
    {
      title: '周期类型',
      dataIndex: 'planType',
      width: 100,
      render: (t: string) => {
        const opt = PLAN_TYPE_OPTIONS.find(o => o.value === t)
        return opt ? <Tag>{opt.label}</Tag> : '-'
      },
    },
    {
      title: '间隔天数',
      dataIndex: 'interval',
      width: 80,
      render: (v) => v ? `${v}天` : '-',
    },
    {
      title: '下次保养日期',
      dataIndex: 'nextDate',
      width: 120,
      render: (t: string) => {
        if (!t) return '-'
        const date = dayjs(t)
        const isOverdue = date.isBefore(dayjs(), 'day')
        return isOverdue ? (
          <Tag color="error" icon={<ClockCircleOutlined />}>{date.format('YYYY-MM-DD HH:mm:ss')}</Tag>
        ) : (
          <Tag color="blue">{date.format('YYYY-MM-DD HH:mm:ss')}</Tag>
        )
      },
    },
    {
      title: '负责人',
      dataIndex: 'responsiblePerson',
      width: 100,
      render: (v) => v || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (s: string) => <StatusTag type="boolean" status={s === 'active' ? 'true' : 'false'} />,
    },
    {
      title: '操作',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            type="primary"
            icon={<CheckOutlined />}
            onClick={() => handleComplete(record.id)}
          >
            完成
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="确认删除" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>保养计划</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增计划</Button>
      </div>

      {/* 筛选条件 */}
      <div style={{ background: '#f5f5f5', padding: 16, marginBottom: 16, borderRadius: 4 }}>
        <Form layout="inline">
          <Form.Item label="状态">
            <Select
              placeholder="全部"
              allowClear
              style={{ width: 120 }}
              options={STATUS_OPTIONS}
              onChange={(val) => {
                // TODO: 实现筛选
              }}
            />
          </Form.Item>
          <Form.Item label="周期类型">
            <Select
              placeholder="全部"
              allowClear
              style={{ width: 120 }}
              options={PLAN_TYPE_OPTIONS}
              onChange={(val) => {
                // TODO: 实现筛选
              }}
            />
          </Form.Item>
        </Form>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        scroll={{ x: 1000 }}
        pagination={{ current: page, total, pageSize: 10, onChange: setPage, showSizeChanger: false }}
      />

      {/* 新增/编辑模态框 */}
      <Modal
        title={editingId ? '编辑保养计划' : '新增保养计划'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={800}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="deviceId" label="关联设备" rules={[{ required: true, message: '请选择设备' }]}>
                <Select
                  placeholder="请选择设备"
                  showSearch
                  optionFilterProp="children"
                  onChange={(val) => {
                    const device = devices.find(d => d.id === val)
                    form.setFieldsValue({ deviceName: device?.name })
                  }}
                >
                  {devices.map(d => (
                    <Select.Option key={d.id} value={d.id}>{d.name} ({d.deviceNo})</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="deviceName" label="设备名称" hidden>
                <Input />
              </Form.Item>
              <Form.Item name="planName" label="计划名称" rules={[{ required: true, message: '请输入计划名称' }]}>
                <Input placeholder="如：万能试验机月度保养" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="planType" label="周期类型" rules={[{ required: true }]}>
                <Select
                  options={PLAN_TYPE_OPTIONS}
                  onChange={(val) => {
                    form.setFieldsValue({ interval: PLAN_TYPE_MAP[val] })
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="interval" label="间隔天数" rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="nextDate" label="下次保养日期" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="responsiblePerson" label="负责人" rules={[{ required: true }]}>
                <UserSelect placeholder="请选择负责人" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="状态" rules={[{ required: true }]}>
                <Select options={STATUS_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="保养项目">
            <Table
              columns={itemColumns}
              dataSource={items}
              rowKey={(record, index) => record.id || `item-${index}`}
              pagination={false}
              size="small"
              footer={() => (
                <Button
                  type="dashed"
                  onClick={() => setItems([...items, { itemName: '', description: '' }])}
                  block
                  icon={<PlusOutlined />}
                >
                  添加保养项目
                </Button>
              )}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
