'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Select, DatePicker, message, Space, Tag, Card } from 'antd'
import { PlusOutlined, EditOutlined, ToolOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface Maintenance {
  id: string
  device: { deviceNo: string; name: string }
  maintenanceType: string
  maintenanceDate: string
  maintainer: string
  cost: number | null
  status: string
  description: string | null
  nextDate: string | null
}

const typeMap: Record<string, string> = {
  routine: '例行保养',
  calibration: '校准',
  repair: '故障维修',
  upgrade: '升级改造',
}

const statusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待处理', color: 'default' },
  in_progress: { text: '进行中', color: 'processing' },
  completed: { text: '已完成', color: 'success' },
}

export default function DeviceMaintenancePage() {
  const [data, setData] = useState<Maintenance[]>([])
  const [devices, setDevices] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string | undefined>()
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [form] = Form.useForm()

  const fetchData = async (p = page) => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(p),
      pageSize: '10',
      ...(typeFilter && { type: typeFilter }),
      ...(statusFilter && { status: statusFilter }),
    })
    try {
      const res = await fetch('/api/device/maintenance?' + params)
      const json = await res.json()
      if (json.success && json.data) {
      setData(json.data.list || [])
      setTotal(json.data.total || 0)
    } else {
      setData(json.list || [])
      setTotal(json.total || 0)
    }
    } catch (error) {
      message.error('获取数据失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchDevices = async () => {
    try {
      const res = await fetch('/api/device/list')
      const json = await res.json()
      setDevices(json.list || [])
    } catch (error) {
      console.error('获取设备列表失败', error)
    }
  }

  useEffect(() => { fetchData() }, [page, typeFilter, statusFilter])
  useEffect(() => { fetchDevices() }, [])

  const handleAdd = () => {
    form.resetFields()
    form.setFieldValue('maintenanceDate', dayjs())
    form.setFieldValue('status', 'pending')
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    try {
      const res = await fetch('/api/device/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          maintenanceDate: values.maintenanceDate.toISOString(),
          nextDate: values.nextDate?.toISOString(),
        }),
      })
      if (res.ok) {
        message.success('添加成功')
        setModalOpen(false)
        fetchData()
      } else {
        message.error('添加失败')
      }
    } catch (error) {
      message.error('添加失败')
    }
  }

  const columns: ColumnsType<Maintenance> = [
    { title: '设备编号', render: (_, r) => r.device?.deviceNo, width: 120 },
    { title: '设备名称', render: (_, r) => r.device?.name, width: 150 },
    {
      title: '维护类型',
      dataIndex: 'maintenanceType',
      width: 100,
      render: (t) => <Tag>{typeMap[t] || t}</Tag>,
    },
    {
      title: '维护日期',
      dataIndex: 'maintenanceDate',
      width: 120,
      render: (d) => dayjs(d).format('YYYY-MM-DD'),
    },
    { title: '维护人', dataIndex: 'maintainer', width: 100 },
    { title: '费用', dataIndex: 'cost', width: 100, render: (v) => v ? `¥${v}` : '-' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag>,
    },
    { title: '描述', dataIndex: 'description', width: 200, ellipsis: true },
  ]

  return (
    <div className="p-4">
      <div className="grid grid-cols-4 gap-4 mb-4">
        <Card>
          <div className="text-2xl font-bold">{data.length}</div>
          <div className="text-gray-500">维护记录总数</div>
        </Card>
        <Card>
          <div className="text-2xl font-bold text-orange-600">
            {data.filter((d) => d.status === 'pending').length}
          </div>
          <div className="text-gray-500">待处理</div>
        </Card>
        <Card>
          <div className="text-2xl font-bold text-blue-600">
            {data.filter((d) => d.maintenanceType === 'calibration').length}
          </div>
          <div className="text-gray-500">校准记录</div>
        </Card>
        <Card>
          <div className="text-2xl font-bold text-red-600">
            {data.filter((d) => d.maintenanceType === 'repair').length}
          </div>
          <div className="text-gray-500">维修记录</div>
        </Card>
      </div>

      <div className="mb-4 flex gap-4">
        <Select
          placeholder="类型筛选"
          allowClear
          style={{ width: 120 }}
          value={typeFilter}
          onChange={(v) => setTypeFilter(v)}
        >
          <Select.Option value="routine">例行保养</Select.Option>
          <Select.Option value="calibration">校准</Select.Option>
          <Select.Option value="repair">故障维修</Select.Option>
          <Select.Option value="upgrade">升级改造</Select.Option>
        </Select>
        <Select
          placeholder="状态筛选"
          allowClear
          style={{ width: 100 }}
          value={statusFilter}
          onChange={(v) => setStatusFilter(v)}
        >
          <Select.Option value="pending">待处理</Select.Option>
          <Select.Option value="in_progress">进行中</Select.Option>
          <Select.Option value="completed">已完成</Select.Option>
        </Select>
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加记录
        </Button>
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
        title="添加维护记录"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="设备" name="deviceId" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="请选择设备"
              optionFilterProp="children"
              options={devices.map((d) => ({
                value: d.id,
                label: `${d.deviceNo} - ${d.name}`,
              }))}
            />
          </Form.Item>
          <Form.Item label="维护类型" name="maintenanceType" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="routine">例行保养</Select.Option>
              <Select.Option value="calibration">校准</Select.Option>
              <Select.Option value="repair">故障维修</Select.Option>
              <Select.Option value="upgrade">升级改造</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="维护日期" name="maintenanceDate" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="维护人" name="maintainer" rules={[{ required: true }]}>
            <Input placeholder="请输入维护人姓名" />
          </Form.Item>
          <Form.Item label="费用" name="cost">
            <Input type="number" placeholder="请输入费用（元）" />
          </Form.Item>
          <Form.Item label="状态" name="status" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="pending">待处理</Select.Option>
              <Select.Option value="in_progress">进行中</Select.Option>
              <Select.Option value="completed">已完成</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} placeholder="请输入维护描述" />
          </Form.Item>
          <Form.Item label="下次维护日期" name="nextDate">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
