'use client'

import { useState, useEffect } from 'react'
import { showSuccess, showError } from '@/lib/confirm'
import { Table, Button, Space, Tag, Modal, Form, Input, InputNumber, DatePicker, Select, message, Popconfirm } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface OutsourceOrder {
  id: string
  orderNo: string
  supplierName: string | null
  amount: number | null
  status: string
  expectedDate: string | null
  completedDate: string | null
  supplier: { name: string } | null
  task?: {
    project?: {
      subcontractAssignee?: string | null
      subcontractAssigneeName?: string | null
    }
  } | null
  createdAt: string
}

const statusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待处理', color: 'default' },
  processing: { text: '处理中', color: 'processing' },
  completed: { text: '已完成', color: 'success' },
}

export default function OutsourceOrderPage() {
  const [data, setData] = useState<OutsourceOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [form] = Form.useForm()

  const fetchData = async (p = page) => {
    setLoading(true)
    const res = await fetch(`/api/outsource-order?page=${p}&pageSize=10`)
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

  const fetchSuppliers = async () => {
    try {
      const res = await fetch('/api/supplier?pageSize=100')
      const json = await res.json()
      setSuppliers(json.list || [])
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchData()
    fetchSuppliers()
  }, [page])

  const handleAdd = () => {
    setEditingId(null)
    form.resetFields()
    setModalOpen(true)
  }

  const handleEdit = (record: OutsourceOrder) => {
    setEditingId(record.id)
    form.setFieldsValue({
      ...record,
      expectedDate: record.expectedDate ? dayjs(record.expectedDate) : null,
      completedDate: record.completedDate ? dayjs(record.completedDate) : null,
    })
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/outsource-order/${id}`, { method: 'DELETE' })
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
    const selectedSupplier = suppliers.find(s => s.id === values.supplierId)
    const data = {
      ...values,
      supplierName: selectedSupplier?.name,
      expectedDate: values.expectedDate?.toISOString(),
      completedDate: values.completedDate?.toISOString(),
    }
    const url = editingId ? `/api/outsource-order/${editingId}` : '/api/outsource-order'
    const method = editingId ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    if (res.ok) {
      showSuccess(editingId ? '更新成功' : '创建成功')
      setModalOpen(false)
      fetchData()
    } else {
      const err = await res.json()
      showError(err.error || '操作失败')
    }
  }

  const columns: ColumnsType<OutsourceOrder> = [
    { title: '外包单号', dataIndex: 'orderNo', width: 150 },
    { title: '供应商', render: (_, r) => r.supplier?.name || r.supplierName || '-' },
    {
      title: '内部负责人',
      key: 'manager',
      width: 150,
      render: (_, record) => record.task?.project?.subcontractAssigneeName || '-'
    },
    { title: '金额', dataIndex: 'amount', width: 120, render: (v) => v ? `¥${v}` : '-' },
    { title: '期望完成', dataIndex: 'expectedDate', width: 120, render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD HH:mm:ss') : '-' },
    { title: '实际完成', dataIndex: 'completedDate', width: 120, render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD HH:mm:ss') : '-' },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag>
    },
    {
      title: '操作', fixed: 'right',
      render: (_, record) => (
        <Space style={{ whiteSpace: 'nowrap' }}>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="确认删除该外包订单？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消" okButtonProps={{ danger: true }}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>外包订单</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增订单</Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ current: page, total, onChange: setPage }}
      />
      <Modal
        title={editingId ? '编辑订单' : '新增订单'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="supplierId" label="供应商名称" rules={[{ required: true }]}>
            <Select
              placeholder="请选择供应商"
              showSearch
              optionFilterProp="label"
              options={suppliers.map(s => ({ value: s.id, label: s.name }))}
            />
          </Form.Item>
          <Form.Item name="amount" label="金额">
            <InputNumber style={{ width: '100%' }} prefix="¥" />
          </Form.Item>
          <Form.Item name="expectedDate" label="期望完成日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          {editingId && (
            <>
              <Form.Item name="completedDate" label="实际完成日期">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="status" label="状态">
                <Select options={[
                  { value: 'pending', label: '待处理' },
                  { value: 'processing', label: '处理中' },
                  { value: 'completed', label: '已完成' },
                ]} />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  )
}
