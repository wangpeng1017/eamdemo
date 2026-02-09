'use client'

import { useState, useEffect } from 'react'
import { showSuccess, showError } from '@/lib/confirm'
import { Table, Button, Space, Modal, Form, Input, InputNumber, Select, Tag, Tree, Card, Row, Col, Popconfirm, Tooltip } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, FolderOutlined, ExperimentOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { DataNode } from 'antd/es/tree'

interface Category {
  id: string
  name: string
  code: string | null
  description?: string | null
  sort: number
}

interface InspectionStandard {
  id: string
  standardNo: string
  name: string
  description?: string
  validity: string
  categoryId: string | null
  category?: { id: string; name: string; code: string | null }
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
}

const validityMap: Record<string, { text: string; color: string }> = {
  valid: { text: '现行有效', color: 'success' },
  invalid: { text: '已作废', color: 'error' },
}

export default function InspectionStandardsPage() {
  // 分类
  const [categories, setCategories] = useState<Category[]>([])
  const [treeData, setTreeData] = useState<DataNode[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryForm] = Form.useForm()

  // 标准
  const [standards, setStandards] = useState<InspectionStandard[]>([])
  const [loadingStandards, setLoadingStandards] = useState(false)
  const [standardModalOpen, setStandardModalOpen] = useState(false)
  const [editingStandard, setEditingStandard] = useState<string | null>(null)
  const [standardForm] = Form.useForm()

  // 检测项目 - 按标准 ID 缓存
  const [itemsMap, setItemsMap] = useState<Record<string, InspectionItem[]>>({})
  const [loadingItemsFor, setLoadingItemsFor] = useState<string | null>(null)
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [currentStandardId, setCurrentStandardId] = useState<string | null>(null)
  const [itemForm] = Form.useForm()

  const [submitting, setSubmitting] = useState(false)

  // ==================== 分类管理 ====================

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/inspection-standard-category?limit=100')
      const json = await res.json()
      if (json.success && json.data) {
        const list: Category[] = Array.isArray(json.data) ? json.data : []
        setCategories(list)
        setTreeData(list.map(cat => ({
          key: cat.id,
          title: cat.name,
          icon: <FolderOutlined />,
        })))
      }
    } catch (err) {
      console.error('加载分类失败:', err)
    }
  }

  const handleAddCategory = () => {
    setEditingCategory(null)
    categoryForm.resetFields()
    setCategoryModalOpen(true)
  }

  const handleEditCategory = (cat: Category) => {
    setEditingCategory(cat)
    categoryForm.setFieldsValue(cat)
    setCategoryModalOpen(true)
  }

  const handleCategorySubmit = async () => {
    try {
      const values = await categoryForm.validateFields()
      setSubmitting(true)
      const url = editingCategory
        ? `/api/inspection-standard-category/${editingCategory.id}`
        : '/api/inspection-standard-category'
      const method = editingCategory ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess(editingCategory ? '更新分类成功' : '创建分类成功')
        setCategoryModalOpen(false)
        fetchCategories()
      } else {
        showError(json.error || '操作失败')
      }
    } catch (err: any) {
      if (err?.errorFields) return
      showError(err.message || '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    try {
      const res = await fetch(`/api/inspection-standard-category/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess('删除成功')
        if (selectedCategory === id) {
          setSelectedCategory(null)
          setStandards([])
        }
        fetchCategories()
      } else {
        showError(json.error || '删除失败')
      }
    } catch {
      showError('删除失败')
    }
  }

  // ==================== 标准管理 ====================

  const fetchStandards = async (categoryId: string) => {
    setLoadingStandards(true)
    try {
      const res = await fetch(`/api/inspection-standard?categoryId=${categoryId}&pageSize=100`)
      const json = await res.json()
      if (json.success && json.data) {
        const list = json.data.list || json.data || []
        setStandards(Array.isArray(list) ? list : [])
      } else {
        setStandards([])
      }
    } catch (err) {
      console.error('加载标准失败:', err)
      showError('加载标准失败')
    }
    setLoadingStandards(false)
  }

  const handleAddStandard = () => {
    setEditingStandard(null)
    standardForm.resetFields()
    if (selectedCategory) standardForm.setFieldValue('categoryId', selectedCategory)
    setStandardModalOpen(true)
  }

  const handleEditStandard = (record: InspectionStandard) => {
    setEditingStandard(record.id)
    standardForm.setFieldsValue(record)
    setStandardModalOpen(true)
  }

  const handleDeleteStandard = async (id: string) => {
    try {
      const res = await fetch(`/api/inspection-standard/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess('删除成功')
        if (selectedCategory) fetchStandards(selectedCategory)
      } else {
        showError(json.error || '删除失败')
      }
    } catch {
      showError('删除失败')
    }
  }

  const handleStandardSubmit = async () => {
    try {
      const values = await standardForm.validateFields()
      setSubmitting(true)
      const url = editingStandard ? `/api/inspection-standard/${editingStandard}` : '/api/inspection-standard'
      const method = editingStandard ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess(editingStandard ? '更新成功' : '创建成功')
        setStandardModalOpen(false)
        if (selectedCategory) fetchStandards(selectedCategory)
      } else {
        showError(json.error || '操作失败')
      }
    } catch (err: any) {
      if (err?.errorFields) return
      showError(err.message || '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  // ==================== 检测项目管理 ====================

  const fetchItems = async (standardId: string) => {
    setLoadingItemsFor(standardId)
    try {
      const res = await fetch(`/api/inspection-item?standardId=${standardId}`)
      const json = await res.json()
      if (json.success && json.data) {
        const list = Array.isArray(json.data) ? json.data : (json.data.list || [])
        setItemsMap(prev => ({ ...prev, [standardId]: list }))
      }
    } catch (err) {
      console.error('加载检测项目失败:', err)
    }
    setLoadingItemsFor(null)
  }

  const handleAddItem = (standardId: string) => {
    setCurrentStandardId(standardId)
    setEditingItem(null)
    itemForm.resetFields()
    itemForm.setFieldValue('standardId', standardId)
    setItemModalOpen(true)
  }

  const handleEditItem = (record: InspectionItem) => {
    setCurrentStandardId(record.standardId)
    setEditingItem(record.id)
    itemForm.setFieldsValue(record)
    setItemModalOpen(true)
  }

  const handleDeleteItem = async (item: InspectionItem) => {
    try {
      const res = await fetch(`/api/inspection-item/${item.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess('删除成功')
        fetchItems(item.standardId)
      } else {
        showError(json.error || '删除失败')
      }
    } catch {
      showError('删除失败')
    }
  }

  const handleItemSubmit = async () => {
    try {
      const values = await itemForm.validateFields()
      setSubmitting(true)
      const url = editingItem ? `/api/inspection-item/${editingItem}` : '/api/inspection-item'
      const method = editingItem ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess(editingItem ? '更新成功' : '创建成功')
        setItemModalOpen(false)
        if (currentStandardId) fetchItems(currentStandardId)
      } else {
        showError(json.error || '操作失败')
      }
    } catch (err: any) {
      if (err?.errorFields) return
      showError(err.message || '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  // ==================== 生命周期 ====================

  useEffect(() => { fetchCategories() }, [])

  const handleCategorySelect = (selectedKeys: React.Key[]) => {
    const categoryId = selectedKeys[0] as string
    setSelectedCategory(categoryId)
    setItemsMap({})
    fetchStandards(categoryId)
  }

  const selectedCategoryName = categories.find(c => c.id === selectedCategory)?.name

  // ==================== 展开行：检测项目 ====================

  const itemColumns: ColumnsType<InspectionItem> = [
    { title: '序号', width: 60, render: (_: unknown, __: unknown, i: number) => i + 1 },
    { title: '检测项目名称', dataIndex: 'name' },
    { title: '检测方法', dataIndex: 'method', render: (v) => v || '-' },
    { title: '单位', dataIndex: 'unit', width: 80, render: (v) => v || '-' },
    { title: '技术要求', dataIndex: 'requirement', ellipsis: true, render: (v) => v || '-' },
    { title: '排序', dataIndex: 'sort', width: 60 },
    {
      title: '操作', width: 100, fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); handleEditItem(record) }} />
          <Popconfirm title="确认删除?" onConfirm={() => handleDeleteItem(record)} okText="确认" cancelText="取消">
            <Button size="small" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  const expandedRowRender = (standard: InspectionStandard) => {
    const items = itemsMap[standard.id] || []
    const loading = loadingItemsFor === standard.id

    return (
      <div style={{ padding: '8px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontWeight: 500, color: '#1677ff' }}>
            <ExperimentOutlined /> 检测项目（{items.length} 项）
          </span>
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => handleAddItem(standard.id)}>
            新增项目
          </Button>
        </div>
        <Table
          rowKey="id"
          columns={itemColumns}
          dataSource={items}
          loading={loading}
          size="small"
          pagination={false}
          locale={{ emptyText: '暂无检测项目' }}
        />
      </div>
    )
  }

  const handleExpand = (expanded: boolean, record: InspectionStandard) => {
    if (expanded && !itemsMap[record.id]) {
      fetchItems(record.id)
    }
  }

  // ==================== 标准表格列 ====================

  const standardColumns: ColumnsType<InspectionStandard> = [
    { title: '标准编号', dataIndex: 'standardNo', width: 180 },
    { title: '标准名称', dataIndex: 'name', ellipsis: true },
    {
      title: '有效性', dataIndex: 'validity', width: 100,
      render: (v) => <Tag color={validityMap[v]?.color}>{validityMap[v]?.text || v}</Tag>
    },
    { title: '备注', dataIndex: 'description', ellipsis: true, width: 150, render: (v) => v || '-' },
    {
      title: '操作', width: 100, fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEditStandard(record)} />
          <Popconfirm title="确认删除?" description="将同时删除关联的检测项目" onConfirm={() => handleDeleteStandard(record.id)} okText="确认" cancelText="取消">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  // ==================== 渲染 ====================

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>检查标准/依据管理</h2>
      </div>
      <Row gutter={16}>
        {/* 左侧：分类树 */}
        <Col span={4}>
          <Card
            title="标准分类"
            size="small"
            extra={
              <Tooltip title="新增分类">
                <Button size="small" type="primary" icon={<PlusOutlined />} onClick={handleAddCategory} />
              </Tooltip>
            }
            bodyStyle={{ maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}
          >
            {treeData.length > 0 ? (
              <>
                <Tree
                  showIcon
                  defaultExpandAll
                  selectedKeys={selectedCategory ? [selectedCategory] : []}
                  onSelect={handleCategorySelect}
                  treeData={treeData}
                />
                {selectedCategory && (
                  <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 8, marginTop: 8 }}>
                    <Space size="small">
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => {
                          const cat = categories.find(c => c.id === selectedCategory)
                          if (cat) handleEditCategory(cat)
                        }}
                      >
                        编辑
                      </Button>
                      <Popconfirm
                        title="确认删除分类?"
                        description="分类下有标准时无法删除"
                        onConfirm={() => handleDeleteCategory(selectedCategory)}
                        okText="确认"
                        cancelText="取消"
                      >
                        <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
                      </Popconfirm>
                    </Space>
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>
                暂无分类，请先新增
              </div>
            )}
          </Card>
        </Col>

        {/* 右侧：标准 + 检测项目合并表格 */}
        <Col span={20}>
          <Card
            title={selectedCategoryName ? `${selectedCategoryName} - 标准与检测项目` : '标准与检测项目'}
            size="small"
            extra={
              selectedCategory ? (
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddStandard}>
                  新增标准
                </Button>
              ) : null
            }
          >
            {selectedCategory ? (
              <Table
                rowKey="id"
                columns={standardColumns}
                dataSource={standards}
                loading={loadingStandards}
                size="small"
                pagination={false}
                scroll={{ y: 'calc(100vh - 280px)' }}
                expandable={{
                  expandedRowRender,
                  onExpand: handleExpand,
                  rowExpandable: () => true,
                }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: 80, color: '#999' }}>
                ← 请先选择左侧分类
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* ========== 分类编辑 Modal ========== */}
      <Modal
        title={editingCategory ? '编辑分类' : '新增分类'}
        open={categoryModalOpen}
        onOk={handleCategorySubmit}
        onCancel={() => setCategoryModalOpen(false)}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={categoryForm} layout="vertical">
          <Form.Item name="name" label="分类名称" rules={[{ required: true, message: '请输入分类名称' }]}>
            <Input placeholder="如：企业标准、国家标准" />
          </Form.Item>
          <Form.Item name="code" label="分类编码">
            <Input placeholder="如：QB、GB（可选）" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="分类说明（可选）" />
          </Form.Item>
          <Form.Item name="sort" label="排序" initialValue={0}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ========== 标准编辑 Modal ========== */}
      <Modal
        title={editingStandard ? '编辑检查标准' : '新增检查标准'}
        open={standardModalOpen}
        onOk={handleStandardSubmit}
        onCancel={() => setStandardModalOpen(false)}
        width={600}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={standardForm} layout="vertical">
          <Form.Item name="categoryId" label="所属分类" rules={[{ required: true, message: '请选择分类' }]}>
            <Select placeholder="请选择分类">
              {categories.map(cat => (
                <Select.Option key={cat.id} value={cat.id}>{cat.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="standardNo" label="标准编号" rules={[{ required: true, message: '请输入标准编号' }]}>
            <Input placeholder="如：GB/T 228.1-2021" />
          </Form.Item>
          <Form.Item name="name" label="标准名称" rules={[{ required: true, message: '请输入标准名称' }]}>
            <Input placeholder="如：金属材料 拉伸试验 第1部分：室温试验方法" />
          </Form.Item>
          <Form.Item name="validity" label="有效性" rules={[{ required: true }]} initialValue="valid">
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

      {/* ========== 检测项目编辑 Modal ========== */}
      <Modal
        title={editingItem ? '编辑检测项目' : '新增检测项目'}
        open={itemModalOpen}
        onOk={handleItemSubmit}
        onCancel={() => setItemModalOpen(false)}
        width={600}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={itemForm} layout="vertical">
          <Form.Item name="standardId" hidden><Input /></Form.Item>
          <Form.Item name="name" label="检测项目名称" rules={[{ required: true, message: '请输入项目名称' }]}>
            <Input placeholder="如：抗拉强度" />
          </Form.Item>
          <Form.Item name="method" label="检测方法">
            <Input placeholder="如：GB/T 228.1-2021" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="unit" label="单位">
                <Input placeholder="如：MPa" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sort" label="排序" initialValue={0}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="requirement" label="技术要求">
            <Input.TextArea rows={3} placeholder="如：≥ 520 MPa" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
