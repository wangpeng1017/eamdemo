'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Space, Tag, Modal, Form, Input, InputNumber, DatePicker, Select, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface Receivable {
  id: string
  clientName: string | null
  amount: number
  receivedAmount: number
  status: string
  dueDate: string | null
  createdAt: string
}

const statusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待收款', color: 'default' },
  partial: { text: '部分收款', color: 'warning' },
  completed: { text: '已收款', color: 'success' },
}

export default function ReceivablePage() {
  const [data, setData] = useState<Receivable[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form] = Form.useForm()

  const fetchData = async (p = page) => {
    setLoading(true)
    const res = await fetch(`/api/finance/receivable?page=${p}&pageSize=10`)
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

  const handleEdit = (record: Receivable) => {
    setEditingId(record.id)
    form.setFieldsValue({
      ...record,
      dueDate: record.dueDate ? dayjs(record.dueDate) : null,
    })
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/finance/receivable/${id}`, { method: 'DELETE' })
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
      dueDate: values.dueDate?.toISOString(),
    }
    const url = editingId ? `/api/finance/receivable/${editingId}` : '/api/finance/receivable'
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

  const columns: ColumnsType<Receivable> = [
    { title: '客户名称', dataIndex: 'clientName' },
    { title: '应收金额', dataIndex: 'amount', width: 120, render: (v) => `¥${v}` },
    { title: '已收金额', dataIndex: 'receivedAmount', width: 120, render: (v) => `¥${v}` },
    { title: '未收金额', width: 120, render: (_, r) => `¥${Number(r.amount) - Number(r.receivedAmount)}` },
    { title: '到期日', dataIndex: 'dueDate', width: 120, render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD HH:mm:ss') : '-' },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag>
    },
    {
      title: '操作', fixed: 'right', 
      render: (_, record) => (
        <Space style={{ whiteSpace: 'nowrap' }}>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
        </Space>
      )
    }
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>应收款管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增应收</Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ current: page, total, onChange: setPage }}
      />
      <Modal
        title={editingId ? '编辑应收款' : '新增应收款'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="clientName" label="客户名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="amount" label="应收金额" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} prefix="¥" min={0} />
          </Form.Item>
          <Form.Item name="receivedAmount" label="已收金额" initialValue={0}>
            <InputNumber style={{ width: '100%' }} prefix="¥" min={0} />
          </Form.Item>
          <Form.Item name="dueDate" label="到期日">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue="pending">
            <Select options={[
              { value: 'pending', label: '待收款' },
              { value: 'partial', label: '部分收款' },
              { value: 'completed', label: '已收款' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
