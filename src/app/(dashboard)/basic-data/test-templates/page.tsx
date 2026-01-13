
'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Space, Modal, Select, Tag, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import TemplateEditor from '@/components/TemplateEditor'
import type { TemplateSchema } from '@/lib/template-converter'

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
  schema?: string | null
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
  const [editingRecord, setEditingRecord] = useState<TestTemplate | null>(null)
  const [previewData, setPreviewData] = useState<any>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>()

  const fetchData = async (p = page) => {
    setLoading(true)
    try {
      const categoryParam = selectedCategory ? `&category=${selectedCategory}` : ''
      const res = await fetch(`/api/test-template?page=${p}&pageSize=10${categoryParam}`)
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data.list || [])
        setTotal(json.data.total || 0)
      } else {
        setData(json.list || [])
        setTotal(json.total || 0)
      }
    } catch (e) {
      message.error('加载数据失败')
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [page, selectedCategory])

  const handleAdd = () => {
    setEditingId(null)
    setEditingRecord(null)
    setModalOpen(true)
  }

  const handleEdit = (record: TestTemplate) => {
    setEditingId(record.id)
    setEditingRecord(record)
    setModalOpen(true)
  }

  const handlePreview = async (record: TestTemplate) => {
    const res = await fetch(`/api/test-template/${record.id}`)
    const json = await res.json()
    setPreviewData(json)
    setPreviewOpen(true)
  }

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个检测模版吗？',
      onOk: async () => {
        await fetch(`/api/test-template/${id}`, { method: 'DELETE' })
        message.success('删除成功')
        fetchData()
      }
    })
  }

  const handleSave = async (schema: TemplateSchema) => {
    try {
      const data = {
        name: schema.title,
        category: selectedCategory || '其他',
        method: schema.header.methodBasis || '',
        schema: JSON.stringify(schema),
        status: 'active',
      }

      const url = editingId ? `/api/test-template/${editingId}` : '/api/test-template'
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.message || '保存失败')
      }

      message.success(editingId ? '更新成功' : '创建成功')
      setModalOpen(false)
      fetchData()
    } catch (e: any) {
      message.error(e.message || '保存失败')
      throw e
    }
  }

  const getInitialSchema = (): TemplateSchema | undefined => {
    if (!editingRecord?.schema) return undefined

    try {
      return typeof editingRecord.schema === 'string'
        ? JSON.parse(editingRecord.schema)
        : editingRecord.schema
    } catch {
      return undefined
    }
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
        <h2 style={{ margin: 0 }}>检测模版管理</h2>
        <Space>
          <Select
            placeholder="分类筛选"
            allowClear
            style={{ width: 150 }}
            value={selectedCategory}
            onChange={(v) => {
              setSelectedCategory(v || undefined)
            }}
            options={categoryOptions}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增模版</Button>
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

      {/* 可视化编辑器弹窗 */}
      <Modal
        title={editingId ? '编辑检测模版' : '新增检测模版'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        width="95%"
        style={{ top: 20 }}
        footer={null}
        destroyOnClose
      >
        <TemplateEditor
          initialValue={getInitialSchema()}
          onSave={handleSave}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>

      {/* 预览弹窗 */}
      <Modal
        title="模版预览"
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={null}
        width={800}
      >
        {previewData && (
          <div>
            <h3>{previewData.name}</h3>
            <p>检测方法: {previewData.method}</p>
            <p>分类: <Tag>{previewData.category}</Tag></p>
            <pre style={{
              background: '#f5f5f5',
              padding: 16,
              borderRadius: 4,
              overflow: 'auto',
              maxHeight: 500
            }}>
              {JSON.stringify(previewData.schema, null, 2)}
            </pre>
          </div>
        )}
      </Modal>
    </div>
  )
}
