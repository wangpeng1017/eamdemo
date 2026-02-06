
'use client'

import { useState, useEffect } from 'react'
import { showSuccess, showError } from '@/lib/confirm'
import { Table, Button, Space, Modal, Form, Input, Select, Tag, message, Tree, Card, Row, Col } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, FolderOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { DataNode } from 'antd/es/tree'
import dayjs from 'dayjs'

interface Category {
  id: string
  name: string
  code: string | null
  children?: Category[]
}

interface InspectionStandard {
  id: string
  standardNo: string
  name: string
  description?: string
  validity: string
  categoryId: string | null
  category?: {
    id: string
    name: string
    code: string | null
  }
  createdAt: string
}

interface InspectionItem {
  id: string
  standardId: string
  name: string
  method?: string
  unit?: string
  requirement?: string
  sort: number
  status: number
  standard?: {
    id: string
    standardNo: string
    name: string
    category?: {
      id: string
      name: string
    }
  }
}

const validityMap: Record<string, { text: string; color: string }> = {
  valid: { text: '现行有效', color: 'success' },
  invalid: { text: '已作废', color: 'error' },
}

export default function InspectionStandardsPage() {
  const [categories, setCategories] = useState<DataNode[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [standards, setStandards] = useState<InspectionStandard[]>([])
  const [selectedStandard, setSelectedStandard] = useState<string | null>(null)
  const [items, setItems] = useState<InspectionItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [itemsTotal, setItemsTotal] = useState(0)
  const [itemsPage, setItemsPage] = useState(1)

  // Modal states
  const [standardModalOpen, setStandardModalOpen] = useState(false)
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [editingStandard, setEditingStandard] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [standardForm] = Form.useForm()
  const [itemForm] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  // 加载分类树
  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/inspection-standard-category/tree')
      const json = await res.json()
      if (json.success && json.data) {
        const buildTree = (nodes: Category[]): DataNode[] => {
          return nodes.map(node => ({
            key: node.id,
            title: node.name,
            children: node.children ? buildTree(node.children) : undefined,
          }))
        }
        setCategories(buildTree(json.data))
      }
    } catch (err) {
      console.error('加载分类失败:', err)
    }
  }

  // 加载标准列表
  const fetchStandards = async (categoryId: string) => {
    try {
      const res = await fetch(`/api/inspection-standard?categoryId=${categoryId}&pageSize=100`)
      const json = await res.json()
      if (json.success && json.data) {
        setStandards(json.data.list || [])
        // 默认选中第一个标准
        if (json.data.list?.length > 0 && !selectedStandard) {
          setSelectedStandard(json.data.list[0].id)
        }
      } else {
        setStandards([])
      }
    } catch (err) {
      console.error('加载标准失败:', err)
      showError('加载标准失败')
    }
  }

  // 加载检测项目
  const fetchItems = async (standardId: string, page = 1) => {
    setLoadingItems(true)
    try {
      const res = await fetch(`/api/inspection-item?standardId=${standardId}&page=${page}&pageSize=10`)
      const json = await res.json()
      if (json.success && json.data) {
        setItems(json.data.list || [])
        setItemsTotal(json.data.total || 0)
      } else {
        setItems([])
        setItemsTotal(0)
      }
    } catch (err) {
      console.error('加载检测项目失败:', err)
      showError('加载检测项目失败')
    }
    setLoadingItems(false)
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    if (selectedStandard) {
      fetchItems(selectedStandard, itemsPage)
    }
  }, [selectedStandard, itemsPage])

  const handleCategorySelect = (selectedKeys: React.Key[]) => {
    const categoryId = selectedKeys[0] as string
    setSelectedCategory(categoryId)
    setSelectedStandard(null)
    setItems([])
    fetchStandards(categoryId)
  }

  const handleStandardSelect = (standardId: string) => {
    setSelectedStandard(standardId)
    setItemsPage(1)
  }

  // 标准CRUD
  const handleAddStandard = () => {
    setEditingStandard(null)
    standardForm.resetFields()
    if (selectedCategory) {
      standardForm.setFieldValue('categoryId', selectedCategory)
    }
    setStandardModalOpen(true)
  }

  const handleEditStandard = (record: InspectionStandard) => {
    setEditingStandard(record.id)
    standardForm.setFieldsValue(record)
    setStandardModalOpen(true)
  }

  const handleDeleteStandard = async (id: string) => {
    const res = await fetch(`/api/inspection-standard/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (res.ok && json.success) {
      showSuccess('删除成功')
      if (selectedCategory) fetchStandards(selectedCategory)
    } else {
      showError(json.error || '删除失败')
    }
  }

  const handleStandardSubmit = async () => {
    try {
      const values = await standardForm.validateFields()
      setSubmitting(true)

      const url = editingStandard ? `/api/inspection-standard/${editingStandard}` : '/api/inspection-standard'
      const method = editingStandard ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      })

      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess(editingStandard ? '更新成功' : '创建成功')
        setStandardModalOpen(false)
        if (selectedCategory) fetchStandards(selectedCategory)
      } else {
        showError(json.error || '操作失败')
      }
    } catch (err: any) {
      showError(err.message || '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  // 检测项目CRUD
  const handleAddItem = () => {
    if (!selectedStandard) {
      showError('请先选择一个标准')
      return
    }
    setEditingItem(null)
    itemForm.resetFields()
    itemForm.setFieldValue('standardId', selectedStandard)
    setItemModalOpen(true)
  }

  const handleEditItem = (record: InspectionItem) => {
    setEditingItem(record.id)
    itemForm.setFieldsValue(record)
    setItemModalOpen(true)
  }

  const handleDeleteItem = async (id: string) => {
    const res = await fetch(`/api/inspection-item/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (res.ok && json.success) {
      showSuccess('删除成功')
      if (selectedStandard) fetchItems(selectedStandard, itemsPage)
    } else {
      showError(json.error || '删除失败')
    }
  }

  const handleItemSubmit = async () => {
    try {
      const values = await itemForm.validateFields()
      setSubmitting(true)

      const url = editingItem ? `/api/inspection-item/${editingItem}` : '/api/inspection-item'
      const method = editingItem ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      })

      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess(editingItem ? '更新成功' : '创建成功')
        setItemModalOpen(false)
        if (selectedStandard) fetchItems(selectedStandard, itemsPage)
      } else {
        showError(json.error || '操作失败')
      }
    } catch (err: any) {
      showError(err.message || '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  const standardColumns: ColumnsType<InspectionStandard> = [
    { title: '标准编号', dataIndex: 'standardNo', width: 150 },
    { title: '标准名称', dataIndex: 'name', ellipsis: true },
    {
      title: '有效性', dataIndex: 'validity', width: 100,
      render: (v) => <Tag color={validityMap[v]?.color}>{validityMap[v]?.text || v}</Tag>
    },
    { title: '备注', dataIndex: 'description', ellipsis: true, render: (v) => v || '-' },
    {
      title: '操作', width: 150, fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button size="small" onClick={() => handleStandardSelect(record.id)}>查看项目</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEditStandard(record)} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteStandard(record.id)} />
        </Space>
      )
    }
  ]

  const itemColumns: ColumnsType<InspectionItem> = [
    { title: '序号', width: 60, render: (_: unknown, __: unknown, index: number) => index + 1 },
    { title: '检测项目名称', dataIndex: 'name', ellipsis: true },
    { title: '检测方法', dataIndex: 'method', ellipsis: true, render: (v) => v || '-' },
    { title: '单位', dataIndex: 'unit', width: 80, render: (v) => v || '-' },
    { title: '技术要求', dataIndex: 'requirement', ellipsis: true, render: (v) => v || '-' },
    { title: '排序', dataIndex: 'sort', width: 80 },
    {
      title: '操作', width: 120, fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEditItem(record)} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteItem(record.id)} />
        </Space>
      )
    }
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>检查标准/依据管理</h2>
      </div>
      <Row gutter={16}>
        {/* 左侧：分类树 + 标准列表 */}
        <Col span={10}>
          <Card
            title="分类"
            size="small"
            style={{ marginBottom: 16 }}
            bodyStyle={{ maxHeight: 300, overflow: 'auto' }}
          >
            <Tree
              showIcon
              defaultExpandAll
              selectedKeys={selectedCategory ? [selectedCategory] : []}
              onSelect={handleCategorySelect}
              treeData={categories}
              icon={<FolderOutlined />}
            />
          </Card>

          {selectedCategory && (
            <Card
              title="标准列表"
              size="small"
              extra={
                <Button size="small" type="primary" icon={<PlusOutlined />} onClick={handleAddStandard}>
                  新增
                </Button>
              }
            >
              <Table
                rowKey="id"
                columns={standardColumns}
                dataSource={standards}
                size="small"
                pagination={false}
                scroll={{ y: 400 }}
              />
            </Card>
          )}
        </Col>

        {/* 右侧：检测项目列表 */}
        <Col span={14}>
          <Card
            title="检测项目"
            size="small"
            extra={
              selectedStandard ? (
                <Button size="small" type="primary" icon={<PlusOutlined />} onClick={handleAddItem}>
                  新增
                </Button>
              ) : null
            }
          >
            {selectedStandard ? (
              <Table
                rowKey="id"
                columns={itemColumns}
                dataSource={items}
                loading={loadingItems}
                size="small"
                scroll={{ y: 550 }}
                pagination={{
                  current: itemsPage,
                  total: itemsTotal,
                  pageSize: 10,
                  onChange: setItemsPage,
                  size: 'small',
                }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                请先选择分类和标准
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* 标准编辑Modal */}
      <Modal
        title={editingStandard ? '编辑检查标准' : '新增检查标准'}
        open={standardModalOpen}
        onOk={handleStandardSubmit}
        onCancel={() => setStandardModalOpen(false)}
        width={600}
        confirmLoading={submitting}
      >
        <Form form={standardForm} layout="vertical">
          <Form.Item name="categoryId" label="所属分类" rules={[{ required: true, message: '请选择分类' }]}>
            <Select placeholder="请选择分类">
              {categories.map((cat: any) => (
                <Select.Option key={cat.key} value={cat.key}>{cat.title}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="standardNo" label="标准编号" rules={[{ required: true, message: '请输入标准编号' }]}>
            <Input placeholder="如：GB/T 228.1-2021" />
          </Form.Item>
          <Form.Item name="name" label="标准名称" rules={[{ required: true, message: '请输入标准名称' }]}>
            <Input placeholder="如：金属材料 拉伸试验 第1部分：室温试验方法" />
          </Form.Item>
          <Form.Item name="validity" label="有效性" rules={[{ required: true, message: '请选择有效性' }]} initialValue="valid">
            <Select>
              <Select.Option value="valid">现行有效</Select.Option>
              <Select.Option value="invalid">已作废</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="备注">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 检测项目编辑Modal */}
      <Modal
        title={editingItem ? '编辑检测项目' : '新增检测项目'}
        open={itemModalOpen}
        onOk={handleItemSubmit}
        onCancel={() => setItemModalOpen(false)}
        width={600}
        confirmLoading={submitting}
      >
        <Form form={itemForm} layout="vertical">
          <Form.Item name="standardId" label="所属标准" rules={[{ required: true, message: '请选择标准' }]}>
            <Select placeholder="请选择标准" disabled>
              {standards.map(std => (
                <Select.Option key={std.id} value={std.id}>{std.standardNo} {std.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="name" label="检测项目名称" rules={[{ required: true, message: '请输入项目名称' }]}>
            <Input placeholder="如：抗拉强度" />
          </Form.Item>
          <Form.Item name="method" label="检测方法">
            <Input placeholder="如：GB/T 228.1-2021" />
          </Form.Item>
          <Form.Item name="unit" label="单位">
            <Input placeholder="如：MPa" />
          </Form.Item>
          <Form.Item name="requirement" label="技术要求">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="sort" label="排序" initialValue={0}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
