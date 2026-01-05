'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Space, Tag, Modal, Form, Input, InputNumber, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

interface Quotation {
  id: string
  quotationNo: string
  clientName: string | null
  contactPerson: string | null
  totalAmount: number | null
  finalAmount: number | null
  status: string
  createdAt: string
}

const statusMap: Record<string, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'default' },
  sent: { text: '已发送', color: 'processing' },
  accepted: { text: '已接受', color: 'success' },
  rejected: { text: '已拒绝', color: 'error' },
}

export default function QuotationPage() {
  const [data, setData] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form] = Form.useForm()

  const fetchData = async (p = page) => {
    setLoading(true)
    const res = await fetch(`/api/quotation?page=${p}&pageSize=10`)
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

  const handleEdit = (record: Quotation) => {
    setEditingId(record.id)
    form.setFieldsValue(record)
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/quotation/${id}`, { method: 'DELETE' })
    message.success('删除成功')
    fetchData()
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const url = editingId ? `/api/quotation/${editingId}` : '/api/quotation'
    const method = editingId ? 'PUT' : 'POST'
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values)
    })
    message.success(editingId ? '更新成功' : '创建成功')
    setModalOpen(false)
    fetchData()
  }

  const columns: ColumnsType<Quotation> = [
    { title: '报价单号', dataIndex: 'quotationNo', width: 150 },
    { title: '客户名称', dataIndex: 'clientName' },
    { title: '联系人', dataIndex: 'contactPerson', width: 100 },
    { title: '总金额', dataIndex: 'totalAmount', width: 120, render: (v) => v ? `¥${v}` : '-' },
    { title: '最终金额', dataIndex: 'finalAmount', width: 120, render: (v) => v ? `¥${v}` : '-' },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag>
    },
    {
      title: '创建时间', dataIndex: 'createdAt', width: 180,
      render: (t: string) => new Date(t).toLocaleString('zh-CN')
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
        <h2 style={{ margin: 0 }}>报价管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增报价</Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ current: page, total, onChange: setPage }}
      />
      <Modal
        title={editingId ? '编辑报价' : '新增报价'}
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
          <Form.Item name="totalAmount" label="总金额">
            <InputNumber style={{ width: '100%' }} prefix="¥" />
          </Form.Item>
          <Form.Item name="finalAmount" label="最终金额">
            <InputNumber style={{ width: '100%' }} prefix="¥" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
