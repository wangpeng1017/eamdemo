
'use client'

import { useState, useEffect } from 'react'
import { showSuccess, showError } from '@/lib/confirm'
import { Table, Button, Space, Modal, Form, Input, Select, Tag, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface InspectionStandard {
  id: string
  standardNo: string
  name: string
  description?: string
  validity: string
  createdAt: string
}

const validityMap: Record<string, { text: string; color: string }> = {
  valid: { text: '现行有效', color: 'success' },
  invalid: { text: '已作废', color: 'error' },
}

export default function InspectionStandardsPage() {
  const [data, setData] = useState<InspectionStandard[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form] = Form.useForm()

  const fetchData = async (p = page) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/inspection-standard?page=${p}&pageSize=10`)
      const json = await res.json()
      setData(json.list || [])
      setTotal(json.total || 0)
    } catch {
      showError('加载数据失败')
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [page])

  const handleAdd = () => {
    setEditingId(null)
    form.resetFields()
    setModalOpen(true)
  }

  const handleEdit = (record: InspectionStandard) => {
    setEditingId(record.id)
    form.setFieldsValue(record)
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/inspection-standard/${id}`, { method: 'DELETE' })
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
    const url = editingId ? `/api/inspection-standard/${editingId}` : '/api/inspection-standard'
    const method = editingId ? 'PUT' : 'POST'
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values)
    })
    showSuccess(editingId ? '更新成功' : '创建成功')
    setModalOpen(false)
    fetchData()
  }

  const columns: ColumnsType<InspectionStandard> = [
    { title: '序号', width: 80, render: (_: unknown, __: unknown, index: number) => index + 1 },
    { title: '标准编号', dataIndex: 'standardNo', width: 150 },
    { title: '标准名称', dataIndex: 'name', ellipsis: true },
    {
      title: '有效性', dataIndex: 'validity', width: 100,
      render: (v) => <Tag color={validityMap[v]?.color}>{validityMap[v]?.text || v}</Tag>
    },
    { title: '备注', dataIndex: 'description', ellipsis: true, render: (v) => v || '-' },
    {
      title: '创建时间', dataIndex: 'createdAt', width: 170,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '操作', fixed: 'right',
      render: (_, record) => (
        <Space size="small" style={{ whiteSpace: 'nowrap' }}>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}/>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
        </Space>
      )
    }
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>检查标准/依据管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增标准</Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        scroll={{ x: 800 }}
        pagination={{ current: page, total, onChange: setPage }}
      />

      <Modal
        title={editingId ? '编辑检查标准' : '新增检查标准'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="standardNo" label="标准编号" rules={[{ required: true, message: '请输入标准编号' }]}>
            <Input placeholder="如：GB/T 228.1-2021" />
          </Form.Item>
          <Form.Item name="name" label="标准名称" rules={[{ required: true, message: '请输入标准名称' }]}>
            <Input placeholder="如：金属材料 拉伸试验 第1部分：室温试验方法" />
          </Form.Item>
          <Form.Item name="validity" label="有效性" rules={[{ required: true, message: '请选择有效性' }]}>
            <Select placeholder="请选择有效性">
              <Select.Option value="valid">现行有效</Select.Option>
              <Select.Option value="invalid">已作废</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="备注">
            <Input.TextArea rows={3} placeholder="可选填写备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
