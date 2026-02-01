'use client'

import { useState, useEffect, useCallback } from 'react'
import { showSuccess, showError } from '@/lib/confirm'
import { Card, Table, Button, Modal, Form, Input, InputNumber, message, Space, Tag, Popconfirm, Select } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

interface EvaluationItem {
  id: string
  name: string
  weight: number
  maxScore: number
  description: string | null
  sort: number
}

interface Category {
  id: string
  name: string
}

interface EvaluationTemplate {
  id: string
  name: string
  code: string
  categoryId: string | null
  category: Category | null
  description: string | null
  status: boolean
  items: EvaluationItem[]
  createdAt: string
}

export default function EvaluationTemplatePage() {
  const [templates, setTemplates] = useState<EvaluationTemplate[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EvaluationTemplate | null>(null)
  const [editingItem, setEditingItem] = useState<EvaluationItem | null>(null)
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null)
  const [form] = Form.useForm()
  const [itemForm] = Form.useForm()

  // 加载分类列表
  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/supplier-category?tree=true')
      const data = await res.json()
      if (data.success) {
        // 扁平化树形数据
        const flattenTree = (items: Category[]): Category[] => {
          const result: Category[] = []
          const traverse = (nodes: (Category & { children?: Category[] })[]) => {
            nodes.forEach(node => {
              result.push({ id: node.id, name: node.name })
              if (node.children && node.children.length > 0) {
                traverse(node.children)
              }
            })
          }
          traverse(data.data)
          return result
        }
        setCategories(flattenTree(data.data))
      }
    } catch {
      // 加载失败不影响主功能
    }
  }, [])

  // 加载模板列表
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/evaluation-template?pageSize=100')
      const data = await res.json()
      if (data.success) {
        setTemplates(data.data.list)
      } else {
        showError(data.message || '加载失败')
      }
    } catch {
      showError('网络错误')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleAdd = () => {
    setEditingTemplate(null)
    form.resetFields()
    form.setFieldsValue({ status: true })
    setModalOpen(true)
  }

  const handleEdit = (record: EvaluationTemplate) => {
    setEditingTemplate(record)
    form.setFieldsValue({
      ...record,
      categoryId: record.categoryId,
    })
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/evaluation-template/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        showSuccess('删除成功')
        loadData()
      } else {
        showError(data.message || '删除失败')
      }
    } catch {
      showError('网络错误')
    }
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    setSubmitting(true)

    try {
      const url = editingTemplate ? `/api/evaluation-template/${editingTemplate.id}` : '/api/evaluation-template'
      const method = editingTemplate ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json()

      if (data.success) {
        showSuccess(editingTemplate ? '更新成功' : '创建成功')
        setModalOpen(false)
        loadData()
      } else {
        showError(data.message || '操作失败')
      }
    } catch {
      showError('网络错误')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddItem = (templateId: string) => {
    setCurrentTemplateId(templateId)
    setEditingItem(null)
    itemForm.resetFields()
    itemForm.setFieldsValue({ weight: 10, maxScore: 100 })
    setItemModalOpen(true)
  }

  const handleEditItem = (templateId: string, item: EvaluationItem) => {
    setCurrentTemplateId(templateId)
    setEditingItem(item)
    itemForm.setFieldsValue(item)
    setItemModalOpen(true)
  }

  const handleDeleteItem = async (templateId: string, itemId: string) => {
    try {
      const res = await fetch(`/api/evaluation-template/${templateId}/item/${itemId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        showSuccess('删除成功')
        loadData()
      } else {
        showError(data.message || '删除失败')
      }
    } catch {
      showError('网络错误')
    }
  }

  const handleItemSubmit = async () => {
    const values = await itemForm.validateFields()
    if (!currentTemplateId) return

    setSubmitting(true)
    try {
      const url = editingItem
        ? `/api/evaluation-template/${currentTemplateId}/item/${editingItem.id}`
        : `/api/evaluation-template/${currentTemplateId}/item`
      const method = editingItem ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json()

      if (data.success) {
        showSuccess(editingItem ? '更新成功' : '添加成功')
        setItemModalOpen(false)
        loadData()
      } else {
        showError(data.message || '操作失败')
      }
    } catch {
      showError('网络错误')
    } finally {
      setSubmitting(false)
    }
  }

  // 计算权重总和
  const getTotalWeight = (items: EvaluationItem[]) => {
    return items.reduce((sum, item) => sum + item.weight, 0)
  }

  const columns: ColumnsType<EvaluationTemplate> = [
    { title: '模板名称', dataIndex: 'name', width: 200 },
    { title: '模板编码', dataIndex: 'code', width: 150 },
    {
      title: '适用分类',
      key: 'categoryName',
      width: 100,
      render: (_, record) => record.category?.name || '-',
    },
    { title: '描述', dataIndex: 'description', ellipsis: true },
    {
      title: '评价项数',
      key: 'itemCount',
      width: 80,
      render: (_, record) => record.items?.length || 0,
    },
    {
      title: '权重总计',
      key: 'totalWeight',
      width: 100,
      render: (_, record) => {
        const total = getTotalWeight(record.items || [])
        return (
          <Tag color={total === 100 ? 'green' : 'orange'}>
            {total}%
          </Tag>
        )
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (status: boolean) => (
        <Tag color={status ? 'green' : 'red'}>{status ? '启用' : '禁用'}</Tag>
      ),
    },
    {
      title: '操作', fixed: 'right',
      
      render: (_, record) => (
        <Space style={{ whiteSpace: 'nowrap' }}>
          <Button size="small" onClick={() => handleAddItem(record.id)}>添加评价项</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="确认删除?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const expandedRowRender = (record: EvaluationTemplate) => {
    const itemColumns: ColumnsType<EvaluationItem> = [
      { title: '评价项名称', dataIndex: 'name' },
      {
        title: '权重',
        dataIndex: 'weight',
        width: 80,
        render: (weight: number) => `${weight}%`,
      },
      { title: '满分', dataIndex: 'maxScore', width: 60 },
      { title: '说明', dataIndex: 'description', ellipsis: true },
      {
        title: '操作', fixed: 'right',
        
        render: (_, item) => (
          <Space style={{ whiteSpace: 'nowrap' }}>
            <Button size="small" icon={<EditOutlined />} onClick={() => handleEditItem(record.id, item)} />
            <Popconfirm title="确认删除?" onConfirm={() => handleDeleteItem(record.id, item.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        ),
      },
    ]

    return (
      <div style={{ padding: '0 16px' }}>
        <Table
          rowKey="id"
          columns={itemColumns}
          dataSource={record.items || []}
          pagination={false}
          size="small"
        />
        {getTotalWeight(record.items || []) !== 100 && (
          <div style={{ color: '#faad14', marginTop: 8 }}>
            Warning: 权重总计应为 100%，当前为 {getTotalWeight(record.items || [])}%
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>评价模板管理</h2>
        <Space style={{ whiteSpace: 'nowrap' }}>
          <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增模板
          </Button>
        </Space>
      </div>

      <Card>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={templates}
          loading={loading}
          expandable={{ expandedRowRender }}
          pagination={false}
        />
      </Card>

      {/* 模板编辑弹窗 */}
      <Modal
        title={editingTemplate ? '编辑模板' : '新增模板'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="模板名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="code" label="模板编码" rules={[{ required: true }]}>
            <Input placeholder="如: TPL_TEST_SERVICE" />
          </Form.Item>
          <Form.Item name="categoryId" label="适用分类">
            <Select
              allowClear
              placeholder="选择分类"
              options={categories.map(c => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue={true}>
            <Select>
              <Select.Option value={true}>启用</Select.Option>
              <Select.Option value={false}>禁用</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 评价项编辑弹窗 */}
      <Modal
        title={editingItem ? '编辑评价项' : '添加评价项'}
        open={itemModalOpen}
        onOk={handleItemSubmit}
        onCancel={() => setItemModalOpen(false)}
        confirmLoading={submitting}
        width={400}
      >
        <Form form={itemForm} layout="vertical">
          <Form.Item name="name" label="评价项名称" rules={[{ required: true }]}>
            <Input placeholder="如: 检测质量" />
          </Form.Item>
          <Form.Item name="weight" label="权重 (%)" rules={[{ required: true }]}>
            <InputNumber min={1} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="maxScore" label="满分" rules={[{ required: true }]}>
            <InputNumber min={1} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <Input.TextArea rows={2} placeholder="评价项的具体说明" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
