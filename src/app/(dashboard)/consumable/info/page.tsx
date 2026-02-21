'use client'

import { useState, useEffect, useCallback } from 'react'
import { showSuccess, showError } from '@/lib/confirm'
import { Card, Table, Button, Form, Input, InputNumber, Select, Space, Tag, Popconfirm, Row, Col, Statistic, Drawer, Descriptions, Tree, Typography, Modal, Tooltip } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, WarningOutlined, ReloadOutlined, EyeOutlined, FolderOutlined, AppstoreOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import type { DataNode } from 'antd/es/tree'

const { Text } = Typography

interface Consumable {
  id: string
  code: string
  name: string
  categoryId: string | null
  category: { id: string; name: string } | null
  specification: string | null
  unit: string
  stockQuantity: number
  minStock: number | null
  location: string | null
  status: number
  remark: string | null
}

// 分类（支持树形）
interface Category {
  id: string
  name: string
  code: string | null
  description: string | null
  parentId: string | null
  sort: number
  status: number
  children?: Category[]
  _count?: { consumables: number }
}

export default function ConsumableInfoPage() {
  const router = useRouter()
  const [consumables, setConsumables] = useState<Consumable[]>([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [stats, setStats] = useState<Record<string, number>>({})

  // 分类树
  const [categories, setCategories] = useState<Category[]>([])
  const [treeData, setTreeData] = useState<DataNode[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [selectedCategoryName, setSelectedCategoryName] = useState('')
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([])

  // 分类管理 Modal
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [addingParentId, setAddingParentId] = useState<string | null>(null)
  const [categoryForm] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  // 查看抽屉
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false)
  const [currentConsumable, setCurrentConsumable] = useState<Consumable | null>(null)

  // ==================== 加载分类树 ====================

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/consumable-category')
      const data = await res.json()
      if (data.success) {
        const list: Category[] = data.data.list || data.data || []
        setCategories(list)

        // 构建树形数据
        const tree: DataNode[] = list.map(parent => ({
          key: parent.id,
          title: (
            <span>
              {parent.name}
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
                ({(parent.children || []).reduce((sum, c) => sum + (c._count?.consumables || 0), 0) + (parent._count?.consumables || 0)})
              </Text>
            </span>
          ),
          icon: <FolderOutlined />,
          children: (parent.children || []).map(child => ({
            key: child.id,
            title: (
              <span>
                {child.name}
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
                  ({child._count?.consumables || 0})
                </Text>
              </span>
            ),
            icon: <AppstoreOutlined />,
            isLeaf: true,
          })),
        }))
        setTreeData(tree)
        setExpandedKeys(list.map(c => c.id))
      }
    } catch {
      // 分类加载失败不影响主功能
    }
  }, [])

  // ==================== 加载易耗品列表 ====================

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(pagination.current),
        pageSize: String(pagination.pageSize),
      })
      if (selectedCategoryId) params.append('categoryId', selectedCategoryId)
      if (statusFilter) params.append('status', statusFilter)
      if (keyword) params.append('keyword', keyword)

      const res = await fetch(`/api/consumable?${params}`)
      const data = await res.json()
      if (data.success) {
        setConsumables(data.data.list)
        setPagination(prev => ({ ...prev, total: data.data.total }))
        setStats(data.data.stats || {})
      } else {
        showError(data.message || '加载失败')
      }
    } catch {
      showError('网络错误')
    } finally {
      setLoading(false)
    }
  }, [pagination.current, pagination.pageSize, selectedCategoryId, statusFilter, keyword])

  useEffect(() => { loadCategories() }, [loadCategories])
  useEffect(() => { loadData() }, [loadData])

  // ==================== 树选择 ====================

  const handleTreeSelect = (selectedKeys: React.Key[]) => {
    if (selectedKeys.length === 0) {
      // 取消选中 → 显示全部
      setSelectedCategoryId(null)
      setSelectedCategoryName('')
      setPagination(prev => ({ ...prev, current: 1 }))
      return
    }
    const key = selectedKeys[0] as string
    setSelectedCategoryId(key)
    setPagination(prev => ({ ...prev, current: 1 }))

    // 查找分类名称
    const isParent = categories.some(c => c.id === key)
    if (isParent) {
      setSelectedCategoryName(categories.find(c => c.id === key)?.name || '')
    } else {
      for (const p of categories) {
        const child = (p.children || []).find(c => c.id === key)
        if (child) { setSelectedCategoryName(`${p.name} > ${child.name}`); break }
      }
    }
  }

  // ==================== 分类管理 ====================

  const handleAddCategory = (parentId: string | null = null) => {
    setEditingCategory(null)
    setAddingParentId(parentId)
    categoryForm.resetFields()
    setCategoryModalOpen(true)
  }

  const handleEditCategory = () => {
    if (!selectedCategoryId) return
    let cat: Category | null = null
    for (const parent of categories) {
      if (parent.id === selectedCategoryId) { cat = parent; break }
      const child = (parent.children || []).find(c => c.id === selectedCategoryId)
      if (child) { cat = child; break }
    }
    if (!cat) return
    setEditingCategory(cat)
    setAddingParentId(null)
    categoryForm.setFieldsValue({ name: cat.name, code: cat.code, description: cat.description, sort: cat.sort })
    setCategoryModalOpen(true)
  }

  const handleCategorySubmit = async () => {
    try {
      const values = await categoryForm.validateFields()
      setSubmitting(true)
      const url = editingCategory
        ? `/api/consumable-category/${editingCategory.id}`
        : '/api/consumable-category'
      const method = editingCategory ? 'PUT' : 'POST'
      const payload = { ...values }
      if (!editingCategory && addingParentId) {
        payload.parentId = addingParentId
      }
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess(editingCategory ? '更新分类成功' : '创建分类成功')
        setCategoryModalOpen(false)
        loadCategories()
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

  const handleDeleteCategory = async () => {
    if (!selectedCategoryId) return
    try {
      const res = await fetch(`/api/consumable-category/${selectedCategoryId}`, { method: 'DELETE' })
      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess('删除分类成功')
        setSelectedCategoryId(null)
        setSelectedCategoryName('')
        loadCategories()
        loadData()
      } else {
        showError(json.error || json.message || '删除失败')
      }
    } catch {
      showError('删除失败')
    }
  }

  // ==================== 易耗品操作 ====================

  const handleAdd = () => router.push('/consumable/info/create')
  const handleView = (record: Consumable) => { setCurrentConsumable(record); setViewDrawerOpen(true) }
  const handleEdit = (record: Consumable) => router.push(`/consumable/info/edit/${record.id}`)

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/consumable/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        showSuccess('删除成功')
        loadData()
        loadCategories()
      } else {
        showError(data.message || '删除失败')
      }
    } catch {
      showError('网络错误')
    }
  }

  const handleTableChange = (pag: TablePaginationConfig) => {
    setPagination(prev => ({
      ...prev,
      current: pag.current || 1,
      pageSize: pag.pageSize || 10,
    }))
  }

  const handleSearch = () => setPagination(prev => ({ ...prev, current: 1 }))

  // 统计
  const totalItems = consumables.length
  const normalCount = stats[1] || 0
  const disabledCount = stats[0] || 0

  const statusMap: Record<number, { text: string; color: string }> = {
    1: { text: '正常', color: 'green' },
    0: { text: '禁用', color: 'default' },
  }

  // 判断选中的是否为父级分类
  const selectedIsParent = selectedCategoryId ? categories.some(c => c.id === selectedCategoryId) : false

  const columns: ColumnsType<Consumable> = [
    { title: '编码', dataIndex: 'code', width: 80 },
    { title: '名称', dataIndex: 'name', width: 150 },
    {
      title: '分类',
      dataIndex: 'category',
      width: 100,
      render: (category: Category | null) => category?.name || '-',
    },
    { title: '规格', dataIndex: 'specification', width: 120 },
    {
      title: '库存',
      key: 'stock',
      width: 100,
      render: (_, record) => {
        const isLow = record.minStock != null && record.stockQuantity < record.minStock
        return (
          <span style={{ color: isLow ? 'red' : undefined }}>
            {record.stockQuantity} {record.unit}
            {isLow && <WarningOutlined style={{ marginLeft: 4, color: 'orange' }} />}
          </span>
        )
      },
    },
    {
      title: '最低库存',
      dataIndex: 'minStock',
      width: 100,
      render: (val: number | null) => val != null ? val : '-',
    },
    { title: '存放位置', dataIndex: 'location', width: 80, render: (v: string | null) => v || '-' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (status: number) => (
        <Tag color={statusMap[status]?.color}>{statusMap[status]?.text || '未知'}</Tag>
      ),
    },
    {
      title: '操作', fixed: 'right', width: 120,
      render: (_, record) => (
        <Space style={{ whiteSpace: 'nowrap' }}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record)} />
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="确认删除?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>易耗品信息</h2>
        <Space style={{ whiteSpace: 'nowrap' }}>
          <Button icon={<ReloadOutlined />} onClick={() => { loadData(); loadCategories() }}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增易耗品
          </Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small">
            <Statistic title="易耗品总数" value={pagination.total || totalItems} suffix="种" />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic title="正常" value={normalCount} valueStyle={{ color: 'green' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic title="禁用" value={disabledCount} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        {/* 左侧：分类树 */}
        <Col span={5}>
          <Card
            title="耗材分类"
            size="small"
            extra={
              <Tooltip title="新增一级分类">
                <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => handleAddCategory(null)} />
              </Tooltip>
            }
            styles={{ body: { maxHeight: 'calc(100vh - 320px)', overflow: 'auto' } }}
          >
            {treeData.length > 0 ? (
              <>
                <Tree
                  showIcon
                  expandedKeys={expandedKeys}
                  onExpand={(keys) => setExpandedKeys(keys)}
                  selectedKeys={selectedCategoryId ? [selectedCategoryId] : []}
                  onSelect={handleTreeSelect}
                  treeData={treeData}
                />
                {selectedCategoryId && (
                  <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 8, marginTop: 8 }}>
                    <Space size="small" wrap>
                      {selectedIsParent && (
                        <Button size="small" type="primary" ghost icon={<PlusOutlined />} onClick={() => handleAddCategory(selectedCategoryId)}>
                          子分类
                        </Button>
                      )}
                      <Button size="small" icon={<EditOutlined />} onClick={handleEditCategory}>
                        编辑
                      </Button>
                      <Popconfirm
                        title="确认删除分类?"
                        description={selectedIsParent ? '需先删除子分类和关联耗材' : '需先删除关联耗材'}
                        onConfirm={handleDeleteCategory}
                        okText="确认" cancelText="取消"
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

        {/* 右侧：耗材列表 */}
        <Col span={19}>
          <Card
            title={selectedCategoryName ? `${selectedCategoryName} - 易耗品列表` : '全部易耗品'}
            size="small"
          >
            <Space style={{ marginBottom: 16, whiteSpace: 'nowrap' }}>
              <Input.Search
                placeholder="搜索编码/名称"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onSearch={handleSearch}
                style={{ width: 200 }}
              />
              <Select
                placeholder="状态筛选"
                allowClear
                value={statusFilter}
                onChange={(v) => { setStatusFilter(v); setPagination(p => ({ ...p, current: 1 })) }}
                options={[
                  { value: '1', label: '正常' },
                  { value: '0', label: '禁用' },
                ]}
                style={{ width: 100 }}
              />
              {selectedCategoryId && (
                <Button size="small" onClick={() => { setSelectedCategoryId(null); setSelectedCategoryName('') }}>
                  查看全部
                </Button>
              )}
            </Space>

            <Table
              rowKey="id"
              columns={columns}
              dataSource={consumables}
              loading={loading}
              pagination={{
                ...pagination,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条`,
              }}
              onChange={handleTableChange}
              size="small"
              scroll={{ y: 'calc(100vh - 420px)' }}
            />
          </Card>
        </Col>
      </Row>

      {/* ========== 分类编辑 Modal ========== */}
      <Modal
        title={editingCategory ? '编辑分类' : (addingParentId ? '新增子分类' : '新增一级分类')}
        open={categoryModalOpen}
        onOk={handleCategorySubmit}
        onCancel={() => setCategoryModalOpen(false)}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={categoryForm} layout="vertical">
          <Form.Item name="name" label="分类名称" rules={[{ required: true, message: '请输入分类名称' }]}>
            <Input placeholder={addingParentId ? '如：试剂、工具、防护用品' : '如：化学类、物理类、生物类'} />
          </Form.Item>
          <Form.Item name="code" label="分类编码">
            <Input placeholder="分类编码（可选）" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="分类说明（可选）" />
          </Form.Item>
          <Form.Item name="sort" label="排序" initialValue={0}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ========== 查看抽屉 ========== */}
      <Drawer
        title="易耗品详情"
        placement="right"
        width={800}
        open={viewDrawerOpen}
        onClose={() => setViewDrawerOpen(false)}
      >
        {currentConsumable && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="编码">{currentConsumable.code}</Descriptions.Item>
            <Descriptions.Item label="名称">{currentConsumable.name}</Descriptions.Item>
            <Descriptions.Item label="分类">{currentConsumable.category?.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="规格">{currentConsumable.specification || '-'}</Descriptions.Item>
            <Descriptions.Item label="当前库存">{currentConsumable.stockQuantity} {currentConsumable.unit}</Descriptions.Item>
            <Descriptions.Item label="最低库存">{currentConsumable.minStock ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="存放位置">{currentConsumable.location || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusMap[currentConsumable.status]?.color}>
                {statusMap[currentConsumable.status]?.text || '未知'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="备注" span={2}>
              {currentConsumable.remark || '-'}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  )
}
