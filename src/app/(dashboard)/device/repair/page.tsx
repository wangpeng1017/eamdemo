'use client'

import { useState, useEffect } from 'react'
import { showSuccess, showError } from '@/lib/confirm'
import {
  Table, Button, Space, Tag, Modal, Form, Input, Select, DatePicker,
  InputNumber, message, Card, Row, Col, Statistic, Popconfirm, Descriptions
} from 'antd'
import { PlusOutlined, DeleteOutlined, EyeOutlined, EditOutlined, PlayCircleOutlined, CheckCircleOutlined } from '@ant-design/icons'
import UserSelect from '@/components/UserSelect'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface DeviceRepair {
  id: string
  repairNo: string
  deviceId: string
  faultDate: string
  faultDesc: string
  repairType: string | null
  repairCost: number | null
  repairBy: string | null
  status: string
  completedDate: string | null
  remark: string | null
  createdAt: string
  device: {
    id: string
    code: string
    name: string
    model: string | null
    location: string | null
  }
}

interface Device {
  id: string
  code: string
  name: string
  model: string | null
  status: string
}

const statusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待维修', color: 'warning' },
  in_progress: { text: '维修中', color: 'processing' },
  completed: { text: '已完成', color: 'success' },
}

const repairTypeOptions = [
  { value: '内部维修', label: '内部维修' },
  { value: '外部送修', label: '外部送修' },
  { value: '厂家维修', label: '厂家维修' },
  { value: '更换配件', label: '更换配件' },
  { value: '其他', label: '其他' },
]

export default function DeviceRepairPage() {
  const [data, setData] = useState<DeviceRepair[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [stats, setStats] = useState<Record<string, number>>({})
  const [totalCost, setTotalCost] = useState(0)

  const [modalOpen, setModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [currentRepair, setCurrentRepair] = useState<DeviceRepair | null>(null)
  const [devices, setDevices] = useState<Device[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('')

  const [form] = Form.useForm()
  const [editForm] = Form.useForm()

  const fetchData = async (p = page, status = statusFilter) => {
    setLoading(true)
    let url = `/api/device/repair?page=${p}&pageSize=10`
    if (status) url += `&status=${status}`

    const res = await fetch(url)
    const json = await res.json()
    if (json.success) {
      setData(json.data.list)
      setTotal(json.data.total)
      setStats(json.data.stats || {})
      setTotalCost(json.data.totalCost || 0)
    }
    setLoading(false)
  }

  const fetchDevices = async () => {
    const res = await fetch('/api/device?pageSize=200')
    const json = await res.json()
    if (json.success) {
      setDevices(json.data.list || [])
    }
  }

  useEffect(() => {
    fetchData()
    fetchDevices()
  }, [page, statusFilter])

  const handleAdd = () => {
    form.resetFields()
    setModalOpen(true)
  }

  const handleView = (record: DeviceRepair) => {
    setCurrentRepair(record)
    setDetailOpen(true)
  }

  const handleEdit = (record: DeviceRepair) => {
    setCurrentRepair(record)
    editForm.setFieldsValue({
      faultDesc: record.faultDesc,
      repairType: record.repairType,
      repairCost: record.repairCost,
      repairBy: record.repairBy,
      remark: record.remark,
    })
    setEditModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/device/repair/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (json.success) {
      showSuccess('删除成功')
      fetchData()
    } else {
      showError(json.error?.message || '删除失败')
    }
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const res = await fetch('/api/device/repair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...values,
        faultDate: values.faultDate?.format('YYYY-MM-DD HH:mm:ss'),
      }),
    })
    const json = await res.json()

    if (json.success) {
      showSuccess('维修登记成功')
      setModalOpen(false)
      fetchData()
    } else {
      showError(json.error?.message || '操作失败')
    }
  }

  const handleEditSubmit = async () => {
    if (!currentRepair) return
    const values = await editForm.validateFields()
    const res = await fetch(`/api/device/repair/${currentRepair.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    const json = await res.json()

    if (json.success) {
      showSuccess('更新成功')
      setEditModalOpen(false)
      fetchData()
    } else {
      showError(json.error?.message || '更新失败')
    }
  }

  const handleAction = async (id: string, action: string, extraData?: Record<string, unknown>) => {
    const res = await fetch(`/api/device/repair/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extraData }),
    })
    const json = await res.json()

    if (json.success) {
      showSuccess('操作成功')
      fetchData()
    } else {
      showError(json.error?.message || '操作失败')
    }
  }

  const columns: ColumnsType<DeviceRepair> = [
    { title: '维修单号', dataIndex: 'repairNo', width: 140 },
    { title: '设备编号', dataIndex: ['device', 'code'], width: 140 },
    { title: '设备名称', dataIndex: ['device', 'name'], ellipsis: true },
    {
      title: '故障日期', dataIndex: 'faultDate', width: 110,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm:ss'),
    },
    { title: '故障描述', dataIndex: 'faultDesc', ellipsis: true },
    { title: '维修类型', dataIndex: 'repairType', width: 100 },
    { title: '维修人', dataIndex: 'repairBy', width: 80 },
    {
      title: '维修费用', dataIndex: 'repairCost', width: 100,
      render: (v: number | null) => v ? `¥${Number(v).toLocaleString()}` : '-',
    },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag>,
    },
    {
      title: '操作', fixed: 'right',
      render: (_, record) => (
        <Space style={{ whiteSpace: 'nowrap' }}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record)} />
          {record.status === 'pending' && (
            <>
              <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
              <Button
                size="small"
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={() => handleAction(record.id, 'start')}
              >
                开始
              </Button>
            </>
          )}
          {record.status === 'in_progress' && (
            <Button
              size="small"
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => handleAction(record.id, 'complete')}
            >
              完成
            </Button>
          )}
          {record.status === 'pending' && (
            <Popconfirm title="确认删除?" onConfirm={() => handleDelete(record.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="待维修" value={stats.pending || 0} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="维修中" value={stats.in_progress || 0} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="已完成" value={stats.completed || 0} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="维修总费用" value={totalCost} precision={2} prefix="¥" />
          </Card>
        </Col>
      </Row>

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space style={{ whiteSpace: 'nowrap' }}>
          <Select
            placeholder="状态筛选"
            allowClear
            style={{ width: 120 }}
            value={statusFilter || undefined}
            onChange={(v) => { setStatusFilter(v || ''); setPage(1) }}
            options={[
              { value: 'pending', label: '待维修' },
              { value: 'in_progress', label: '维修中' },
              { value: 'completed', label: '已完成' },
            ]}
          />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          登记维修
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ current: page, total, onChange: setPage }}
        scroll={{ x: 1300 }}
      />

      {/* 新增维修弹窗 */}
      <Modal
        title="登记设备维修"
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="deviceId" label="选择设备" rules={[{ required: true }]}>
            <Select
              placeholder="选择需要维修的设备"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={devices.map(d => ({
                value: d.id,
                label: `${d.code} - ${d.name}${d.model ? ` (${d.model})` : ''}`,
              }))}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="faultDate" label="故障日期">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="repairType" label="维修类型">
                <Select options={repairTypeOptions} placeholder="选择维修类型" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="faultDesc" label="故障描述" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="描述设备故障情况" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="repairBy" label="维修人">
                <UserSelect placeholder="选择维修负责人" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="repairCost" label="预估费用">
                <InputNumber style={{ width: '100%' }} min={0} precision={2} prefix="¥" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑弹窗 */}
      <Modal
        title="编辑维修信息"
        open={editModalOpen}
        onOk={handleEditSubmit}
        onCancel={() => setEditModalOpen(false)}
        width={600}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="faultDesc" label="故障描述" rules={[{ required: true }]}>
            <Input.TextArea rows={3} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="repairType" label="维修类型">
                <Select options={repairTypeOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="repairCost" label="维修费用">
                <InputNumber style={{ width: '100%' }} min={0} precision={2} prefix="¥" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="repairBy" label="维修人">
            <UserSelect placeholder="选择维修人" />
          </Form.Item>

          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title="维修详情"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={600}
      >
        {currentRepair && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="维修单号">{currentRepair.repairNo}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusMap[currentRepair.status]?.color}>
                {statusMap[currentRepair.status]?.text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="设备编号">{currentRepair.device.code}</Descriptions.Item>
            <Descriptions.Item label="设备名称">{currentRepair.device.name}</Descriptions.Item>
            <Descriptions.Item label="故障日期">
              {dayjs(currentRepair.faultDate).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="维修类型">{currentRepair.repairType || '-'}</Descriptions.Item>
            <Descriptions.Item label="故障描述" span={2}>{currentRepair.faultDesc}</Descriptions.Item>
            <Descriptions.Item label="维修人">{currentRepair.repairBy || '-'}</Descriptions.Item>
            <Descriptions.Item label="维修费用">
              {currentRepair.repairCost ? `¥${Number(currentRepair.repairCost).toLocaleString()}` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="完成日期">
              {currentRepair.completedDate ? dayjs(currentRepair.completedDate).format('YYYY-MM-DD HH:mm:ss') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="登记时间">
              {dayjs(currentRepair.createdAt).format('YYYY-MM-DD HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="备注" span={2}>{currentRepair.remark || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}
