'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Space, Tag, Modal, Form, Input, InputNumber, DatePicker, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface Entrustment {
  id: string
  entrustmentNo: string
  clientName: string | null
  contactPerson: string | null
  sampleName: string | null
  sampleCount: number | null
  status: string
  expectedDate: string | null
  createdAt: string
}

const statusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待受理', color: 'default' },
  accepted: { text: '已受理', color: 'processing' },
  testing: { text: '检测中', color: 'warning' },
  completed: { text: '已完成', color: 'success' },
}

export default function EntrustmentListPage() {
  const [data, setData] = useState<Entrustment[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form] = Form.useForm()

  const fetchData = async (p = page) => {
    setLoading(true)
    const res = await fetch(`/api/entrustment?page=${p}&pageSize=10`)
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

  const handleEdit = (record: Entrustment) => {
    setEditingId(record.id)
    form.setFieldsValue({
      ...record,
      expectedDate: record.expectedDate ? dayjs(record.expectedDate) : null
    })
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/entrustment/${id}`, { method: 'DELETE' })
    message.success('删除成功')
    fetchData()
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const data = {
      ...values,
      expectedDate: values.expectedDate?.toISOString()
    }
    const url = editingId ? `/api/entrustment/${editingId}` : '/api/entrustment'
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

  const columns: ColumnsType<Entrustment> = [
    { title: '委托单号', dataIndex: 'entrustmentNo', width: 150 },
    { title: '客户名称', dataIndex: 'clientName' },
    { title: '联系人', dataIndex: 'contactPerson', width: 100 },
    { title: '样品名称', dataIndex: 'sampleName' },
    { title: '样品数量', dataIndex: 'sampleCount', width: 80 },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag>
    },
    {
      title: '期望完成', dataIndex: 'expectedDate', width: 120,
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
        <h2 style={{ margin: 0 }}>委托单管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增委托</Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ current: page, total, onChange: setPage }}
      />
      <Modal
        title={editingId ? '编辑委托' : '新增委托'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="clientName" label="客户名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="contactPerson" label="联系人">
            <Input />
          </Form.Item>
          <Form.Item name="contactPhone" label="联系电话">
            <Input />
          </Form.Item>
          <Form.Item name="sampleName" label="样品名称">
            <Input />
          </Form.Item>
          <Form.Item name="sampleCount" label="样品数量">
            <InputNumber style={{ width: '100%' }} min={1} />
          </Form.Item>
          <Form.Item name="expectedDate" label="期望完成日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="requirements" label="检测要求">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
