'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Space, Tag, Modal, Form, Input, Select, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface TestReport {
  id: string
  reportNo: string
  title: string | null
  conclusion: string | null
  status: string
  issuedDate: string | null
  task: { taskNo: string; testItem: string } | null
  createdAt: string
}

const statusMap: Record<string, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'default' },
  reviewing: { text: '审核中', color: 'processing' },
  approved: { text: '已批准', color: 'success' },
  issued: { text: '已发布', color: 'cyan' },
}

export default function TestReportPage() {
  const [data, setData] = useState<TestReport[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form] = Form.useForm()

  const fetchData = async (p = page) => {
    setLoading(true)
    const res = await fetch(`/api/test-report?page=${p}&pageSize=10`)
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

  const handleEdit = (record: TestReport) => {
    setEditingId(record.id)
    form.setFieldsValue(record)
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/test-report/${id}`, { method: 'DELETE' })
    message.success('删除成功')
    fetchData()
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const url = editingId ? `/api/test-report/${editingId}` : '/api/test-report'
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

  const columns: ColumnsType<TestReport> = [
    { title: '报告编号', dataIndex: 'reportNo', width: 150 },
    { title: '报告标题', dataIndex: 'title' },
    { title: '关联任务', render: (_, r) => r.task?.testItem || '-' },
    { title: '结论', dataIndex: 'conclusion', ellipsis: true },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag>
    },
    {
      title: '发布日期', dataIndex: 'issuedDate', width: 120,
      render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD HH:mm:ss') : '-'
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
        <h2 style={{ margin: 0 }}>报告管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增报告</Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ current: page, total, onChange: setPage }}
      />
      <Modal
        title={editingId ? '编辑报告' : '新增报告'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="报告标题" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="conclusion" label="结论">
            <Input.TextArea rows={4} />
          </Form.Item>
          {editingId && (
            <Form.Item name="status" label="状态">
              <Select options={[
                { value: 'draft', label: '草稿' },
                { value: 'reviewing', label: '审核中' },
                { value: 'approved', label: '已批准' },
                { value: 'issued', label: '已发布' },
              ]} />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  )
}
