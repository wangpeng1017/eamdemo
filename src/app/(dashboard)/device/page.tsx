'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Space, Tag, Modal, Form, Input, Select, DatePicker, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface Device {
  id: string
  deviceNo: string
  name: string
  model: string | null
  manufacturer: string | null
  location: string | null
  status: string
  calibrationDate: string | null
  nextCalibration: string | null
  createdAt: string
}

const statusMap: Record<string, { text: string; color: string }> = {
  normal: { text: '正常', color: 'success' },
  maintenance: { text: '维护中', color: 'warning' },
  scrapped: { text: '已报废', color: 'error' },
}

export default function DevicePage() {
  const [data, setData] = useState<Device[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form] = Form.useForm()

  const fetchData = async (p = page) => {
    setLoading(true)
    const res = await fetch(`/api/device?page=${p}&pageSize=10`)
    const json = await res.json()
    setData(json.list)
    setTotal(json.total)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [page])

  const handleAdd = () => {
    setEditingId(null)
    form.resetFields()
    setModalOpen(true)
  }

  const handleEdit = (record: Device) => {
    setEditingId(record.id)
    form.setFieldsValue({
      ...record,
      calibrationDate: record.calibrationDate ? dayjs(record.calibrationDate) : null,
      nextCalibration: record.nextCalibration ? dayjs(record.nextCalibration) : null,
    })
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/device/${id}`, { method: 'DELETE' })
    message.success('删除成功')
    fetchData()
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const data = {
      ...values,
      calibrationDate: values.calibrationDate?.toISOString(),
      nextCalibration: values.nextCalibration?.toISOString(),
    }
    const url = editingId ? `/api/device/${editingId}` : '/api/device'
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

  const columns: ColumnsType<Device> = [
    { title: '设备编号', dataIndex: 'deviceNo', width: 150 },
    { title: '设备名称', dataIndex: 'name' },
    { title: '型号', dataIndex: 'model', width: 120 },
    { title: '制造商', dataIndex: 'manufacturer', width: 120 },
    { title: '存放位置', dataIndex: 'location', width: 120 },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag>
    },
    {
      title: '下次校准', dataIndex: 'nextCalibration', width: 120,
      render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD') : '-'
    },
    {
      title: '操作', width: 150,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
        </Space>
      )
    }
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>设备管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增设备</Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ current: page, total, onChange: setPage }}
      />
      <Modal
        title={editingId ? '编辑设备' : '新增设备'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="设备名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="model" label="型号">
            <Input />
          </Form.Item>
          <Form.Item name="manufacturer" label="制造商">
            <Input />
          </Form.Item>
          <Form.Item name="serialNumber" label="出厂编号">
            <Input />
          </Form.Item>
          <Form.Item name="location" label="存放位置">
            <Input />
          </Form.Item>
          <Form.Item name="calibrationDate" label="上次校准日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="nextCalibration" label="下次校准日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          {editingId && (
            <Form.Item name="status" label="状态">
              <Select options={[
                { value: 'normal', label: '正常' },
                { value: 'maintenance', label: '维护中' },
                { value: 'scrapped', label: '已报废' },
              ]} />
            </Form.Item>
          )}
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
