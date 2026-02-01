'use client'

import { useState, useEffect } from 'react'
import { showSuccess, showError } from '@/lib/confirm'
import { Table, Button, Space, Modal, Form, Input, message, Card } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface ReportCategory {
  id: string
  categoryCode: string
  categoryName: string
  testTypes: string[]
  templateName: string
  description?: string
  createdAt: string
}

export default function ReportCategoriesPage() {
  const [data, setData] = useState<ReportCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form] = Form.useForm()

  const fetchData = async (p = page) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/report-category?page=${p}&pageSize=10`)
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
    form.setFieldsValue({ testTypes: [''] })
    setModalOpen(true)
  }

  const handleEdit = (record: ReportCategory) => {
    setEditingId(record.id)
    form.setFieldsValue({
      ...record,
      testTypes: record.testTypes.length > 0 ? record.testTypes : [''],
    })
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/report-category/${id}`, { method: 'DELETE' })
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
    // 过滤空类型
    const testTypes = values.testTypes?.filter((t: string) => t.trim()) || []

    const data = { ...values, testTypes }
    const url = editingId ? `/api/report-category/${editingId}` : '/api/report-category'
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

  const columns: ColumnsType<ReportCategory> = [
    { title: '分类代码', dataIndex: 'categoryCode', width: 120 },
    { title: '分类名称', dataIndex: 'categoryName', width: 150 },
    {
      title: '适用试验类型',
      dataIndex: 'testTypes',
      render: (types: string[]) => types.join('、') || '-'
    },
    { title: '报告模板', dataIndex: 'templateName' },
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
        <h2 style={{ margin: 0 }}>样品报告分类管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增分类</Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        scroll={{ x: 900 }}
        pagination={{ current: page, total, onChange: setPage }}
      />

      <Modal
        title={editingId ? '编辑报告分类' : '新增报告分类'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="categoryCode" label="分类代码" rules={[{ required: true }]}>
            <Input placeholder="如：MECH" />
          </Form.Item>
          <Form.Item name="categoryName" label="分类名称" rules={[{ required: true }]}>
            <Input placeholder="如：力学性能报告" />
          </Form.Item>
          <Form.Item name="templateName" label="报告模板名称" rules={[{ required: true }]}>
            <Input placeholder="如：力学性能标准模板" />
          </Form.Item>
          <Card title="适用试验类型" size="small">
            <Form.List name="testTypes">
              {(fields, { add, remove }) => (
                <>
                  {fields.map((field, index) => (
                    <Space key={field.key} style={{ display: 'flex', marginBottom: 8 }} align="baseline" style={{ whiteSpace: 'nowrap' }}>
                      <Form.Item
                        {...field}
                        style={{ marginBottom: 0, flex: 1 }}
                        rules={[{ required: true, message: '请输入试验类型' }]}
                      >
                        <Input placeholder="如：抗压强度" />
                      </Form.Item>
                      {fields.length > 1 && (
                        <Button type="link" danger onClick={() => remove(field.name)}/>
                      )}
                    </Space>
                  ))}
                  <Button type="dashed" onClick={() => add()} block>+ 添加试验类型</Button>
                </>
              )}
            </Form.List>
          </Card>
          <Form.Item name="description" label="描述" style={{ marginTop: 16 }}>
            <Input.TextArea rows={2} placeholder="分类说明" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
