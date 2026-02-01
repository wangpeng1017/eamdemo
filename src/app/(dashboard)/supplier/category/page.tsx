'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, Tree, Button, Modal, Form, Input, message, Space, Popconfirm, Row, Col, Table, Tag, Select } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, FolderOutlined, FolderOpenOutlined, ReloadOutlined } from '@ant-design/icons'
import type { DataNode } from 'antd/es/tree'
import type { ColumnsType } from 'antd/es/table'

interface Category {
  id: string
  name: string
  code: string
  parentId: string | null
  description: string | null
  sort: number
  status: boolean
  children?: Category[]
}

export default function SupplierCategoryPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [form] = Form.useForm()

  // 加载分类列表
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/supplier-category?tree=true')
      const data = await res.json()
      if (data.success) {
        // 扁平化树形数据
        const flattenTree = (items: Category[]): Category[] => {
          const result: Category[] = []
          const traverse = (nodes: Category[]) => {
            nodes.forEach(node => {
              result.push(node)
              if (node.children && node.children.length > 0) {
                traverse(node.children)
              }
            })
          }
          traverse(items)
          return result
        }
        setCategories(flattenTree(data.data))
      } else {
        message.error(data.message || '加载失败')
      }
    } catch {
      message.error('网络错误')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 构建树形数据
  const buildTree = (items: Category[], parentId: string | null = null): Category[] => {
    return items
      .filter(item => item.parentId === parentId)
      .sort((a, b) => a.sort - b.sort)
      .map(item => ({
        ...item,
        children: buildTree(items, item.id),
      }))
  }

  // 转换为 Tree 组件需要的格式
  const convertToTreeData = (items: Category[]): DataNode[] => {
    return items.map(item => ({
      key: item.id,
      title: (
        <span>
          {item.name}
          <span style={{ color: '#999', marginLeft: 8 }}>({item.code})</span>
          {!item.status && <Tag color="red" style={{ marginLeft: 8 }}>禁用</Tag>}
        </span>
      ),
      icon: item.children && item.children.length > 0 ? <FolderOpenOutlined /> : <FolderOutlined />,
      children: item.children ? convertToTreeData(item.children) : undefined,
    }))
  }

  const treeData = convertToTreeData(buildTree(categories))

  const handleAdd = (parentId: string | null = null) => {
    setEditingId(null)
    form.resetFields()
    form.setFieldsValue({ parentId, sort: 0, status: true })
    setModalOpen(true)
  }

  const handleEdit = (record: Category) => {
    setEditingId(record.id)
    form.setFieldsValue(record)
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    // 检查是否有子分类
    const hasChildren = categories.some(c => c.parentId === id)
    if (hasChildren) {
      message.error('请先删除子分类')
      return
    }

    try {
      const res = await fetch(`/api/supplier-category/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        message.success('删除成功')
        if (selectedCategory?.id === id) {
          setSelectedCategory(null)
        }
        loadData()
      } else {
        message.error(data.message || '删除失败')
      }
    } catch {
      message.error('网络错误')
    }
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    setSubmitting(true)

    try {
      const url = editingId ? `/api/supplier-category/${editingId}` : '/api/supplier-category'
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json()

      if (data.success) {
        message.success(editingId ? '更新成功' : '创建成功')
        setModalOpen(false)
        loadData()
      } else {
        message.error(data.message || '操作失败')
      }
    } catch {
      message.error('网络错误')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSelect = (selectedKeys: React.Key[]) => {
    if (selectedKeys.length > 0) {
      const category = categories.find(c => c.id === selectedKeys[0])
      setSelectedCategory(category || null)
    } else {
      setSelectedCategory(null)
    }
  }

  const columns: ColumnsType<Category> = [
    { title: '分类名称', dataIndex: 'name' },
    { title: '分类编码', dataIndex: 'code' },
    { title: '描述', dataIndex: 'description', ellipsis: true },
    { title: '排序', dataIndex: 'sort', width: 60 },
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
        <Space>
          <Button size="small" onClick={() => handleAdd(record.id)}>添加子分类</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="确认删除?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // 获取顶级分类用于下拉选择
  const topCategories = categories.filter(c => !c.parentId)

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>供应商分类</h2>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAdd(null)}>
            新增一级分类
          </Button>
        </Space>
      </div>

      <Row gutter={16}>
        <Col span={8}>
          <Card title="分类树" size="small" loading={loading}>
            <Tree
              showIcon
              defaultExpandAll
              treeData={treeData}
              onSelect={handleSelect}
              selectedKeys={selectedCategory ? [selectedCategory.id] : []}
            />
          </Card>
        </Col>
        <Col span={16}>
          <Card
            title={selectedCategory ? `${selectedCategory.name} - 子分类` : '全部分类'}
            size="small"
          >
            <Table
              rowKey="id"
              columns={columns}
              dataSource={selectedCategory
                ? categories.filter(c => c.parentId === selectedCategory.id)
                : buildTree(categories)
              }
              loading={loading}
              pagination={false}
              size="small"
              expandable={selectedCategory ? undefined : { defaultExpandAllRows: true }}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title={editingId ? '编辑分类' : '新增分类'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="分类名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="code" label="分类编码" rules={[{ required: true }]}>
            <Input placeholder="如: TEST_SERVICE" />
          </Form.Item>
          <Form.Item name="parentId" label="上级分类">
            <Select allowClear placeholder="无（一级分类）">
              {topCategories.map(c => (
                <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="sort" label="排序">
            <Input type="number" />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue={true}>
            <Select>
              <Select.Option value={true}>启用</Select.Option>
              <Select.Option value={false}>禁用</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
