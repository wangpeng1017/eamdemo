'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Space, Tag, Modal, Form, Input, InputNumber, DatePicker, Select, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface Contract {
  id: string
  contractNo: string
  clientName: string | null
  amount: number | null
  signDate: string | null
  startDate: string | null
  endDate: string | null
  status: string
  createdAt: string
}

const statusMap: Record<string, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'default' },
  active: { text: '生效中', color: 'success' },
  completed: { text: '已完成', color: 'cyan' },
  terminated: { text: '已终止', color: 'error' },
}

export default function ContractPage() {
  const [data, setData] = useState<Contract[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form] = Form.useForm()

  const fetchData = async (p = page) => {
    setLoading(true)
    const res = await fetch(`/api/contract?page=${p}&pageSize=10`)
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

  const handleEdit = (record: Contract) => {
    setEditingId(record.id)
    form.setFieldsValue({
      ...record,
      signDate: record.signDate ? dayjs(record.signDate) : null,
      startDate: record.startDate ? dayjs(record.startDate) : null,
      endDate: record.endDate ? dayjs(record.endDate) : null,
    })
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/contract/${id}`, { method: 'DELETE' })
    message.success('删除成功')
    fetchData()
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const data = {
      ...values,
      signDate: values.signDate?.toISOString(),
      startDate: values.startDate?.toISOString(),
      endDate: values.endDate?.toISOString(),
    }
    const url = editingId ? `/api/contract/${editingId}` : '/api/contract'
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

  const columns: ColumnsType<Contract> = [
    { title: '合同编号', dataIndex: 'contractNo', width: 150 },
    { title: '客户名称', dataIndex: 'clientName' },
    { title: '合同金额', dataIndex: 'amount', width: 120, render: (v) => v ? `¥${v}` : '-' },
    { title: '签订日期', dataIndex: 'signDate', width: 120, render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD') : '-' },
    { title: '开始日期', dataIndex: 'startDate', width: 120, render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD') : '-' },
    { title: '结束日期', dataIndex: 'endDate', width: 120, render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD') : '-' },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag>
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
        <h2 style={{ margin: 0 }}>合同管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增合同</Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ current: page, total, onChange: setPage }}
      />
      <Modal
        title={editingId ? '编辑合同' : '新增合同'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="clientName" label="客户名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="amount" label="合同金额">
            <InputNumber style={{ width: '100%' }} prefix="¥" />
          </Form.Item>
          <Form.Item name="signDate" label="签订日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="startDate" label="开始日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="endDate" label="结束日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          {editingId && (
            <Form.Item name="status" label="状态">
              <Select options={[
                { value: 'draft', label: '草稿' },
                { value: 'active', label: '生效中' },
                { value: 'completed', label: '已完成' },
                { value: 'terminated', label: '已终止' },
              ]} />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  )
}
