'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Space, Modal, Form, Input, Select, Tag, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface CapabilityReview {
  id: string
  userId: string
  user: { id: string; name: string }
  capabilityId?: string
  capability?: { id: string; parameter: string; certificate: string }
  trainingContent: string
  examDate: string
  examResult: string
}

const resultMap: Record<string, { text: string; color: string }> = {
  Pass: { text: '合格', color: 'success' },
  Fail: { text: '不合格', color: 'error' },
}

export default function CapabilityReviewPage() {
  const [data, setData] = useState<CapabilityReview[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [capabilities, setCapabilities] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [form] = Form.useForm()

  const fetchData = async (p = page) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/capability-review?page=${p}&pageSize=10`)
      const json = await res.json()
      setData(json.list || [])
      setTotal(json.total || 0)
    } catch {
      message.error('加载数据失败')
    }
    setLoading(false)
  }

  const fetchUsers = async () => {
    const res = await fetch('/api/user')
    const json = await res.json()
    setUsers(json.list || [])
  }

  const fetchCapabilities = async (userId?: string) => {
    if (!userId) {
      setCapabilities([])
      return
    }
    const res = await fetch(`/api/personnel-capability?userId=${userId}`)
    const json = await res.json()
    setCapabilities(json.list || [])
  }

  useEffect(() => { fetchData(); fetchUsers() }, [page])

  const handleAdd = () => {
    setEditingId(null)
    form.resetFields()
    setSelectedUser(null)
    setCapabilities([])
    setModalOpen(true)
  }

  const handleEdit = (record: CapabilityReview) => {
    setEditingId(record.id)
    setSelectedUser(record.userId)
    fetchCapabilities(record.userId)
    form.setFieldsValue({
      ...record,
      examDate: dayjs(record.examDate),
    })
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/capability-review/${id}`, { method: 'DELETE' })
    message.success('删除成功')
    fetchData()
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const data = {
      ...values,
      examDate: values.examDate.toISOString(),
    }
    const url = editingId ? `/api/capability-review/${editingId}` : '/api/capability-review'
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

  const handleUserChange = (userId: string) => {
    setSelectedUser(userId)
    form.setFieldsValue({ capabilityId: undefined })
    fetchCapabilities(userId)
  }

  const columns: ColumnsType<CapabilityReview> = [
    { title: '员工姓名', dataIndex: ['user', 'name'], width: 100 },
    {
      title: '关联能力',
      dataIndex: 'capability',
      width: 200,
      render: (cap) => cap ? `${cap.parameter} (${cap.certificate})` : '-'
    },
    {
      title: '培训/考核内容',
      dataIndex: 'trainingContent',
      ellipsis: true,
    },
    {
      title: '考核日期', dataIndex: 'examDate', width: 120,
      render: (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '考核结果', dataIndex: 'examResult', width: 100,
      render: (r) => <Tag color={resultMap[r]?.color}>{resultMap[r]?.text || r}</Tag>
    },
    {
      title: '操作', width: 150, fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
        </Space>
      )
    }
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>能力评审管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增评审</Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        scroll={{ x: 1000 }}
        pagination={{ current: page, total, onChange: setPage }}
      />

      <Modal
        title={editingId ? '编辑能力评审' : '新增能力评审'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="userId" label="员工" rules={[{ required: true }]}>
            <Select
              placeholder="选择员工"
              onChange={handleUserChange}
              options={users.map((u: any) => ({ value: u.id, label: u.name }))}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Form.Item name="capabilityId" label="关联能力（可选）">
            <Select
              placeholder="选择关联的资质记录"
              allowClear
              options={capabilities.map((c: any) => ({
                value: c.id,
                label: `${c.parameter} - ${c.certificate}`
              }))}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Form.Item name="trainingContent" label="培训/考核内容" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="请输入培训或考核的具体内容" />
          </Form.Item>
          <Form.Item name="examDate" label="考核日期" rules={[{ required: true }]}>
            <input
              type="date"
              style={{ width: '100%', padding: 6, border: '1px solid #d9d9d9', borderRadius: 4 }}
              onChange={(e) => {
                if (e.target.value) {
                  form.setFieldsValue({ examDate: dayjs(e.target.value) })
                }
              }}
            />
          </Form.Item>
          <Form.Item name="examResult" label="考核结果" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="Pass">合格</Select.Option>
              <Select.Option value="Fail">不合格</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
