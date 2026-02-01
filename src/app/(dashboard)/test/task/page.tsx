'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Space, Tag, Modal, Form, Input, Select, DatePicker, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface TestTask {
  id: string
  taskNo: string
  testItem: string
  testMethod: string | null
  status: string
  plannedDate: string | null
  sample: { sampleNo: string; name: string } | null
  device: { deviceNo: string; name: string } | null
  createdAt: string
}

const statusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待检测', color: 'default' },
  testing: { text: '检测中', color: 'processing' },
  completed: { text: '已完成', color: 'success' },
  reviewed: { text: '已审核', color: 'cyan' },
}

export default function TestTaskPage() {
  const [data, setData] = useState<TestTask[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form] = Form.useForm()

  const fetchData = async (p = page) => {
    setLoading(true)
    const res = await fetch(`/api/test-task?page=${p}&pageSize=10`)
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

  const handleEdit = (record: TestTask) => {
    setEditingId(record.id)
    form.setFieldsValue({
      ...record,
      plannedDate: record.plannedDate ? dayjs(record.plannedDate) : null
    })
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/test-task/${id}`, { method: 'DELETE' })
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
      plannedDate: values.plannedDate?.toISOString()
    }
    const url = editingId ? `/api/test-task/${editingId}` : '/api/test-task'
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

  const columns: ColumnsType<TestTask> = [
    { title: '任务编号', dataIndex: 'taskNo', width: 150 },
    { title: '样品', dataIndex: ['sample', 'name'], render: (_, r) => r.sample?.name || '-' },
    { title: '检测项目', dataIndex: 'testItem' },
    { title: '检测方法', dataIndex: 'testMethod', width: 150 },
    { title: '设备', dataIndex: ['device', 'name'], render: (_, r) => r.device?.name || '-' },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag>
    },
    {
      title: '计划日期', dataIndex: 'plannedDate', width: 120,
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
        <h2 style={{ margin: 0 }}>检测任务</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增任务</Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ current: page, total, onChange: setPage }}
      />
      <Modal
        title={editingId ? '编辑任务' : '新增任务'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="testItem" label="检测项目" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="testMethod" label="检测方法">
            <Input />
          </Form.Item>
          <Form.Item name="plannedDate" label="计划日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          {editingId && (
            <Form.Item name="status" label="状态">
              <Select options={[
                { value: 'pending', label: '待检测' },
                { value: 'testing', label: '检测中' },
                { value: 'completed', label: '已完成' },
                { value: 'reviewed', label: '已审核' },
              ]} />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  )
}
