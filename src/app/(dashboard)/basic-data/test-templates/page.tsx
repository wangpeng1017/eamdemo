'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Space, Modal, Form, Input, Select, Tag, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface TestTemplate {
  id: string
  code: string
  name: string
  category: string
  method: string
  version: string
  status: string
  author: string
  createdAt: string
  schema?: string | null  // JSON 表单结构
}

const categoryOptions = [
  { value: '复合材料', label: '复合材料' },
  { value: '金属材料', label: '金属材料' },
  { value: '金相分析', label: '金相分析' },
  { value: '混凝土', label: '混凝土' },
  { value: '水质检测', label: '水质检测' },
  { value: '其他', label: '其他' },
]

const statusMap: Record<string, { text: string; color: string }> = {
  active: { text: '启用', color: 'success' },
  archived: { text: '归档', color: 'default' },
}

export default function TestTemplatesPage() {
  const [data, setData] = useState<TestTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<any>(null)
  const [form] = Form.useForm()

  const fetchData = async (p = page) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/test-template?page=${p}&pageSize=10`)
      const json = await res.json()
      setData(json.list || [])
      setTotal(json.total || 0)
    } catch (e) {
      message.error('加载数据失败')
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [page])

  const handleAdd = () => {
    setEditingId(null)
    form.resetFields()
    setModalOpen(true)
  }

  const handleEdit = (record: TestTemplate) => {
    setEditingId(record.id)
    form.setFieldsValue({
      ...record,
      schema: JSON.stringify(JSON.parse(record.schema || '{}'), null, 2),
    })
    setModalOpen(true)
  }

  const handlePreview = async (record: TestTemplate) => {
    const res = await fetch(`/api/test-template/${record.id}`)
    const json = await res.json()
    setPreviewData(json)
    setPreviewOpen(true)
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/test-template/${id}`, { method: 'DELETE' })
    message.success('删除成功')
    fetchData()
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    let schemaObj = {}
    try {
      schemaObj = JSON.parse(values.schema || '{}')
    } catch {
      message.error('Schema JSON 格式错误')
      return
    }

    const data = { ...values, schema: schemaObj }
    const url = editingId ? `/api/test-template/${editingId}` : '/api/test-template'
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

  const columns: ColumnsType<TestTemplate> = [
    { title: '项目编号', dataIndex: 'code', width: 140 },
    { title: '项目名称', dataIndex: 'name', width: 200 },
    {
      title: '分类', dataIndex: 'category', width: 100,
      render: (cat) => <Tag>{cat}</Tag>
    },
    { title: '检测方法/标准', dataIndex: 'method', ellipsis: true },
    { title: '版本', dataIndex: 'version', width: 80 },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (s) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text || s}</Tag>
    },
    {
      title: '创建时间', dataIndex: 'createdAt', width: 170,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '操作', width: 180, fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EyeOutlined />} onClick={() => handlePreview(record)}>预览</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
        </Space>
      )
    }
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>检测项目管理</h2>
        <Space>
          <Select
            placeholder="分类筛选"
            allowClear
            style={{ width: 150 }}
            onChange={(v) => {
              fetch(`/api/test-template?page=1&pageSize=10${v ? `&category=${v}` : ''}`)
                .then(res => res.json())
                .then(json => {
                  setData(json.list || [])
                  setTotal(json.total || 0)
                  setPage(1)
                })
            }}
            options={categoryOptions}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增项目</Button>
        </Space>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        scroll={{ x: 1200 }}
        pagination={{ current: page, total, onChange: setPage }}
      />

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingId ? '编辑检测项目' : '新增检测项目'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="项目名称" rules={[{ required: true }]}>
            <Input placeholder="如：复合材料拉伸性能检测(GB/T)" />
          </Form.Item>
          <Form.Item name="category" label="分类" rules={[{ required: true }]}>
            <Select options={categoryOptions} placeholder="请选择分类" />
          </Form.Item>
          <Form.Item name="method" label="检测方法/标准" rules={[{ required: true }]}>
            <Input placeholder="如：GB/T 3354-2014" />
          </Form.Item>
          <Form.Item name="unit" label="默认单位">
            <Input placeholder="如：MPa" />
          </Form.Item>
          <Form.Item name="schema" label="表单结构 (JSON)" rules={[{ required: true }]}>
            <Input.TextArea
              rows={10}
              placeholder={`{
  "title": "试验记录",
  "header": { "methodBasis": "GB/T 3354-2014" },
  "columns": [
    { "title": "样品序号", "dataIndex": "index" },
    { "title": "拉伸强度 MPa", "dataIndex": "tensileStrength" }
  ],
  "statistics": ["平均值", "标准差"],
  "environment": true
}`}
            />
          </Form.Item>
          {editingId && (
            <Form.Item name="status" label="状态">
              <Select>
                <Select.Option value="active">启用</Select.Option>
                <Select.Option value="archived">归档</Select.Option>
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* 预览弹窗 */}
      <Modal
        title="项目预览"
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={null}
        width={800}
      >
        {previewData && (
          <div>
            <h3>{previewData.schema.title || previewData.name}</h3>
            <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 4, overflow: 'auto' }}>
              {JSON.stringify(previewData.schema, null, 2)}
            </pre>
          </div>
        )}
      </Modal>
    </div>
  )
}
