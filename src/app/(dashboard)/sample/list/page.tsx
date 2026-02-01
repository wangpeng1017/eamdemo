'use client'

import { useState, useEffect } from 'react'
import { showSuccess, showError } from '@/lib/confirm'
import { Table, Button, Space, Tag, Modal, Form, Input, Select, DatePicker, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface Sample {
  id: string
  sampleNo: string
  name: string
  type: string | null
  specification: string | null
  quantity: string | null
  storageLocation: string | null
  status: string
  receivedDate: string | null
  createdAt: string
}

const statusMap: Record<string, { text: string; color: string }> = {
  received: { text: '已接收', color: 'default' },
  testing: { text: '检测中', color: 'processing' },
  completed: { text: '已完成', color: 'success' },
  returned: { text: '已归还', color: 'warning' },
}

export default function SampleListPage() {
  const [data, setData] = useState<Sample[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form] = Form.useForm()

  const fetchData = async (p = page) => {
    setLoading(true)
    const res = await fetch(`/api/sample?page=${p}&pageSize=10`)
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

  useEffect(() => { fetchData() }, [page])

  const handleAdd = () => {
    setEditingId(null)
    form.resetFields()
    setModalOpen(true)
  }

  const handleEdit = (record: Sample) => {
    setEditingId(record.id)
    form.setFieldsValue({
      ...record,
      receivedDate: record.receivedDate ? dayjs(record.receivedDate) : null
    })
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/sample/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (res.ok && json.success) {
      showSuccess('删除成功')
      fetchData()
    } else {
      showError(json.error?.message || '删除失败')
    }
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const data = {
      ...values,
      receivedDate: values.receivedDate?.toISOString()
    }
    const url = editingId ? `/api/sample/${editingId}` : '/api/sample'
    const method = editingId ? 'PUT' : 'POST'
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    showSuccess(editingId ? '更新成功' : '创建成功')
    setModalOpen(false)
    fetchData()
  }

  const columns: ColumnsType<Sample> = [
    { title: '样品编号', dataIndex: 'sampleNo', width: 150 },
    { title: '样品名称', dataIndex: 'name' },
    { title: '样品类型', dataIndex: 'type', width: 100 },
    { title: '规格型号', dataIndex: 'specification', width: 120 },
    { title: '数量', dataIndex: 'quantity', width: 80 },
    { title: '存放位置', dataIndex: 'storageLocation', width: 120 },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text || s}</Tag>
    },
    {
      title: '接收日期', dataIndex: 'receivedDate', width: 120,
      render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD HH:mm:ss') : '-'
    },
    {
      title: '创建时间', dataIndex: 'createdAt', width: 170,
      render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD HH:mm:ss') : '-'
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
        <h2 style={{ margin: 0 }}>样品列表</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增样品</Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ current: page, total, onChange: setPage }}
      />
      <Modal
        title={editingId ? '编辑样品' : '新增样品'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="样品名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="样品类型">
            <Select options={[
              { value: '金属', label: '金属' },
              { value: '塑料', label: '塑料' },
              { value: '复合材料', label: '复合材料' },
              { value: '其他', label: '其他' },
            ]} />
          </Form.Item>
          <Form.Item name="specification" label="规格型号">
            <Input />
          </Form.Item>
          <Form.Item name="quantity" label="数量">
            <Input />
          </Form.Item>
          <Form.Item name="unit" label="单位">
            <Input placeholder="如：个、件、kg" />
          </Form.Item>
          <Form.Item name="storageLocation" label="存放位置">
            <Input />
          </Form.Item>
          <Form.Item name="receivedDate" label="接收日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          {editingId && (
            <Form.Item name="status" label="状态">
              <Select options={[
                { value: 'received', label: '已接收' },
                { value: 'testing', label: '检测中' },
                { value: 'completed', label: '已完成' },
                { value: 'returned', label: '已归还' },
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
