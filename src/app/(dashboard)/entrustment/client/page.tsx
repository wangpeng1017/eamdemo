'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Space, Tag, Modal, Form, Input, Select, message, Popconfirm } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface Client {
  id: string
  name: string
  contact: string | null
  phone: string | null
  address: string | null
  creditCode: string | null  // 税号
  bankName: string | null    // 开户行
  bankAccount: string | null // 银行账号
  remark: string | null
  status: string
  createdAt: string
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
    form.setFieldsValue({ status: 'approved' })
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
    { title: '单位名称', dataIndex: 'name', width: 200 },
    { title: '联系人', dataIndex: 'contact', width: 100 },
    { title: '联系方式', dataIndex: 'phone', width: 130 },
    { title: '地址', dataIndex: 'address', width: 150, ellipsis: true },
    {
      title: '开票信息',
      width: 280,
      render: (_, record) => (
        <div style={{ fontSize: 12, lineHeight: 1.6 }}>
          {record.creditCode && <div><span style={{ color: '#1890ff' }}>税号:</span> {record.creditCode}</div>}
          {record.bankName && <div><span style={{ color: '#1890ff' }}>银行:</span> {record.bankName}</div>}
          {record.bankAccount && <div><span style={{ color: '#1890ff' }}>账号:</span> {record.bankAccount}</div>}
          {!record.creditCode && !record.bankName && !record.bankAccount && <span style={{ color: '#999' }}>-</span>}
        </div>
      ),
    },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (s: string) => <Tag color={s === 'approved' ? 'success' : 'default'}>{s === 'approved' ? '已批准' : s}</Tag>
    },
    {
      title: '创建时间', dataIndex: 'createdAt', width: 160,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '操作', width: 120, fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="确认删除?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>委托单位管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增单位</Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        scroll={{ x: 1400 }}
        pagination={{ current: page, total, pageSize: 10, onChange: setPage, showSizeChanger: false }}
      />
      <Modal
        title={editingId ? '编辑单位' : '新增单位'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="单位名称" rules={[{ required: true, message: '请输入单位名称' }]}>
            <Input placeholder="请输入单位全称" />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="contact" label="联系人">
              <Input placeholder="请输入联系人" />
            </Form.Item>
            <Form.Item name="phone" label="联系方式">
              <Input placeholder="请输入联系电话" />
            </Form.Item>
          </div>
          <Form.Item name="address" label="地址">
            <Input placeholder="请输入地址" />
          </Form.Item>
          <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 4, marginBottom: 16 }}>
            <div style={{ fontWeight: 500, marginBottom: 12 }}>开票信息</div>
            <Form.Item name="creditCode" label="税号" style={{ marginBottom: 12 }}>
              <Input placeholder="如: 91340200713920435C" />
            </Form.Item>
            <Form.Item name="bankName" label="开户银行" style={{ marginBottom: 12 }}>
              <Input placeholder="如: 中国工商银行芜湖分行" />
            </Form.Item>
            <Form.Item name="bankAccount" label="银行账号" style={{ marginBottom: 0 }}>
              <Input placeholder="如: 1307023009022100123" />
            </Form.Item>
          </div>
          <Form.Item name="status" label="状态" initialValue="approved">
            <Select options={[
              { value: 'approved', label: '已批准' },
              { value: 'pending', label: '待审批' },
              { value: 'rejected', label: '已拒绝' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
