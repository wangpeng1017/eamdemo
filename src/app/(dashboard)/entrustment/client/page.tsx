'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Space, Tag, Modal, Form, Input, Select, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

interface Client {
  id: string
  name: string
  shortName: string | null
  type: string | null
  contact: string | null
  phone: string | null
  email: string | null
  address: string | null
  status: number
}

export default function ClientPage() {
  const [data, setData] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form] = Form.useForm()

  const fetchData = async (p = page) => {
    setLoading(true)
    const res = await fetch(`/api/client?page=${p}&pageSize=10`)
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

  const handleEdit = (record: Client) => {
    setEditingId(record.id)
    form.setFieldsValue(record)
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/client/${id}`, { method: 'DELETE' })
    message.success('删除成功')
    fetchData()
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const url = editingId ? `/api/client/${editingId}` : '/api/client'
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

  const columns: ColumnsType<Client> = [
    { title: '客户名称', dataIndex: 'name' },
    { title: '简称', dataIndex: 'shortName', width: 100 },
    { title: '类型', dataIndex: 'type', width: 100 },
    { title: '联系人', dataIndex: 'contact', width: 100 },
    { title: '电话', dataIndex: 'phone', width: 130 },
    { title: '邮箱', dataIndex: 'email' },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (s: number) => <Tag color={s === 1 ? 'success' : 'error'}>{s === 1 ? '启用' : '禁用'}</Tag>
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
        <h2 style={{ margin: 0 }}>客户管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增客户</Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ current: page, total, onChange: setPage }}
      />
      <Modal
        title={editingId ? '编辑客户' : '新增客户'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="客户名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="shortName" label="简称">
            <Input />
          </Form.Item>
          <Form.Item name="type" label="客户类型">
            <Select options={[
              { value: '企业', label: '企业' },
              { value: '政府', label: '政府' },
              { value: '科研院所', label: '科研院所' },
              { value: '个人', label: '个人' },
            ]} />
          </Form.Item>
          <Form.Item name="contact" label="联系人">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="电话">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input />
          </Form.Item>
          <Form.Item name="address" label="地址">
            <Input />
          </Form.Item>
          <Form.Item name="creditCode" label="统一社会信用代码">
            <Input />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue={1}>
            <Select options={[
              { value: 1, label: '启用' },
              { value: 0, label: '禁用' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
