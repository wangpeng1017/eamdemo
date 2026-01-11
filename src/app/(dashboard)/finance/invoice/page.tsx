'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Space, Tag, Modal, Form, Input, InputNumber, DatePicker, Select, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface Invoice {
  id: string
  invoiceNo: string
  amount: number
  type: string | null
  status: string
  issuedDate: string | null
  createdAt: string
}

const statusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待开票', color: 'default' },
  issued: { text: '已开票', color: 'success' },
}

export default function InvoicePage() {
  const [data, setData] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form] = Form.useForm()

  const fetchData = async (p = page) => {
    setLoading(true)
    const res = await fetch(`/api/finance/invoice?page=${p}&pageSize=10`)
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

  useEffect(() => { fetchData() }, [page])

  const handleAdd = () => {
    setEditingId(null)
    form.resetFields()
    setModalOpen(true)
  }

  const handleEdit = (record: Invoice) => {
    setEditingId(record.id)
    form.setFieldsValue({
      ...record,
      issuedDate: record.issuedDate ? dayjs(record.issuedDate) : null,
    })
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/finance/invoice/${id}`, { method: 'DELETE' })
    message.success('删除成功')
    fetchData()
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const data = {
      ...values,
      issuedDate: values.issuedDate?.toISOString(),
    }
    const url = editingId ? `/api/finance/invoice/${editingId}` : '/api/finance/invoice'
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

  const columns: ColumnsType<Invoice> = [
    { title: '发票号', dataIndex: 'invoiceNo', width: 150 },
    { title: '金额', dataIndex: 'amount', width: 120, render: (v) => `¥${v}` },
    { title: '发票类型', dataIndex: 'type', width: 120 },
    { title: '开票日期', dataIndex: 'issuedDate', width: 120, render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD HH:mm:ss') : '-' },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag>
    },
    {
      title: '创建时间', dataIndex: 'createdAt', width: 180,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm')
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
        <h2 style={{ margin: 0 }}>发票管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增发票</Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ current: page, total, onChange: setPage }}
      />
      <Modal
        title={editingId ? '编辑发票' : '新增发票'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="amount" label="金额" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} prefix="¥" min={0} />
          </Form.Item>
          <Form.Item name="type" label="发票类型">
            <Select options={[
              { value: '增值税普通发票', label: '增值税普通发票' },
              { value: '增值税专用发票', label: '增值税专用发票' },
            ]} />
          </Form.Item>
          <Form.Item name="issuedDate" label="开票日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue="pending">
            <Select options={[
              { value: 'pending', label: '待开票' },
              { value: 'issued', label: '已开票' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
