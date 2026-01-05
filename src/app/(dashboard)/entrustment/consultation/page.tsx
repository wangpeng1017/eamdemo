'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Space, Tag, Modal, Form, Input, Select, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

interface Consultation {
  id: string
  consultationNo: string
  clientCompany: string | null
  contactPerson: string | null
  contactPhone: string | null
  sampleInfo: string | null
  testRequirements: string | null
  status: string
  createdAt: string
}

const statusMap: Record<string, { text: string; color: string }> = {
  following: { text: '跟进中', color: 'processing' },
  quoted: { text: '已报价', color: 'warning' },
  closed: { text: '已关闭', color: 'default' },
}

export default function ConsultationPage() {
  const [data, setData] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form] = Form.useForm()

  const fetchData = async (p = page) => {
    setLoading(true)
    const res = await fetch(`/api/consultation?page=${p}&pageSize=10`)
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

  const handleEdit = (record: Consultation) => {
    setEditingId(record.id)
    form.setFieldsValue(record)
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/consultation/${id}`, { method: 'DELETE' })
    message.success('删除成功')
    fetchData()
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    if (editingId) {
      await fetch(`/api/consultation/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      })
      message.success('更新成功')
    } else {
      await fetch('/api/consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      })
      message.success('创建成功')
    }
    setModalOpen(false)
    fetchData()
  }

  const columns: ColumnsType<Consultation> = [
    { title: '咨询单号', dataIndex: 'consultationNo', width: 150 },
    { title: '客户公司', dataIndex: 'clientCompany' },
    { title: '联系人', dataIndex: 'contactPerson', width: 100 },
    { title: '联系电话', dataIndex: 'contactPhone', width: 130 },
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
        <h2 style={{ margin: 0 }}>咨询管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增咨询</Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ current: page, total, onChange: setPage }}
      />
      <Modal
        title={editingId ? '编辑咨询' : '新增咨询'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="clientCompany" label="客户公司" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="contactPerson" label="联系人">
            <Input />
          </Form.Item>
          <Form.Item name="contactPhone" label="联系电话">
            <Input />
          </Form.Item>
          <Form.Item name="sampleInfo" label="样品信息">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="testRequirements" label="检测要求">
            <Input.TextArea rows={3} />
          </Form.Item>
          {editingId && (
            <Form.Item name="status" label="状态">
              <Select options={[
                { value: 'following', label: '跟进中' },
                { value: 'quoted', label: '已报价' },
                { value: 'closed', label: '已关闭' },
              ]} />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  )
}
