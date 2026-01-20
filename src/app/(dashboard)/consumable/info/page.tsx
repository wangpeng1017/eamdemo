'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, message, Space, Tag, Popconfirm, Row, Col, Statistic } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, WarningOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'

interface Consumable {
  id: string
  code: string
  name: string
  categoryId: string | null
  category: { id: string; name: string } | null
  specification: string | null
  unit: string
  currentStock: number
  minStock: number
  maxStock: number
  unitPrice: number
  supplier: string | null
  location: string | null
  expiryDate: string | null
  status: 'normal' | 'low' | 'out' | 'expired'
  remark: string | null
}

interface Category {
  id: string
  name: string
}

const unitOptions = [
  { value: '瓶', label: '瓶' },
  { value: '盒', label: '盒' },
  { value: '个', label: '个' },
  { value: '支', label: '支' },
  { value: 'ml', label: 'ml' },
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: '套', label: '套' },
]

export default function ConsumableInfoPage() {
  const [consumables, setConsumables] = useState<Consumable[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [keyword, setKeyword] = useState('')
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [stats, setStats] = useState<Record<string, number>>({})
  const [form] = Form.useForm()

  // 加载分类列表
  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/consumable-category')
      const data = await res.json()
      if (data.success) {
        setCategories(data.data.list || data.data || [])
      }
    } catch {
      // 分类加载失败不影响主功能
    }
  }, [])

  // 加载易耗品列表
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(pagination.current),
        pageSize: String(pagination.pageSize),
      })
      if (categoryFilter) params.append('categoryId', categoryFilter)
      if (statusFilter) params.append('status', statusFilter)
      if (keyword) params.append('keyword', keyword)

      const res = await fetch(`/api/consumable?${params}`)
      const data = await res.json()
      if (data.success) {
        setConsumables(data.data.list)
        setPagination(prev => ({ ...prev, total: data.data.total }))
        setStats(data.data.stats || {})
      } else {
        message.error(data.message || '加载失败')
      }
    } catch {
      message.error('网络错误')
    } finally {
      setLoading(false)
    }
  }, [pagination.current, pagination.pageSize, categoryFilter, statusFilter, keyword])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleAdd = () => {
    setEditingId(null)
    form.resetFields()
    form.setFieldsValue({ minStock: 10, maxStock: 100, currentStock: 0, unitPrice: 0 })
    setModalOpen(true)
  }

  const handleEdit = (record: Consumable) => {
    setEditingId(record.id)
    form.setFieldsValue({
      ...record,
      expiryDate: record.expiryDate ? record.expiryDate.split('T')[0] : null,
    })
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/consumable/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        message.success('删除成功')
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
      const url = editingId ? `/api/consumable/${editingId}` : '/api/consumable'
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

  const handleTableChange = (pag: TablePaginationConfig) => {
    setPagination(prev => ({
      ...prev,
      current: pag.current || 1,
      pageSize: pag.pageSize || 10,
    }))
  }

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }))
  }

  // 统计数据
  const totalItems = consumables.length
  const normalCount = stats.normal || 0
  const lowCount = stats.low || 0
  const outCount = stats.out || 0
  const expiredCount = stats.expired || 0
  const totalValue = consumables.reduce((sum, c) => sum + c.currentStock * c.unitPrice, 0)

  const statusMap: Record<string, { text: string; color: string }> = {
    normal: { text: '正常', color: 'green' },
    low: { text: '库存不足', color: 'orange' },
    out: { text: '缺货', color: 'red' },
    expired: { text: '已过期', color: 'default' },
  }

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
      render: (_, record) => (
        <span style={{ color: record.currentStock < record.minStock ? 'red' : undefined }}>
          {record.currentStock} {record.unit}
          {record.currentStock < record.minStock && <WarningOutlined style={{ marginLeft: 4, color: 'orange' }} />}
        </span>
      ),
    },
    {
      title: '安全库存',
      key: 'safeStock',
      width: 100,
      render: (_, record) => `${record.minStock} - ${record.maxStock}`,
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      width: 80,
      render: (price: number) => `¥${price}`,
    },
    { title: '存放位置', dataIndex: 'location', width: 80 },
    {
      title: '有效期',
      dataIndex: 'expiryDate',
      width: 100,
      render: (date: string | null) => date ? date.split('T')[0] : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (status: string) => (
        <Tag color={statusMap[status]?.color}>{statusMap[status]?.text}</Tag>
      ),
    },
    {
      title: '操作',
      width: 80,
      render: (_, record) => (
        <Space>
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
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增易耗品
          </Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card size="small">
            <Statistic title="易耗品总数" value={pagination.total || totalItems} suffix="种" />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="库存正常" value={normalCount} valueStyle={{ color: 'green' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="库存不足" value={lowCount} valueStyle={{ color: 'orange' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="缺货" value={outCount} valueStyle={{ color: 'red' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="已过期" value={expiredCount} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="库存总值" value={totalValue} prefix="¥" precision={2} />
          </Card>
        </Col>
      </Row>

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="搜索编码/名称"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onSearch={handleSearch}
            style={{ width: 200 }}
          />
          <Select
            placeholder="分类筛选"
            allowClear
            value={categoryFilter}
            onChange={(v) => { setCategoryFilter(v); setPagination(p => ({ ...p, current: 1 })) }}
            options={categories.map(c => ({ value: c.id, label: c.name }))}
            style={{ width: 120 }}
          />
          <Select
            placeholder="状态筛选"
            allowClear
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPagination(p => ({ ...p, current: 1 })) }}
            options={[
              { value: 'normal', label: '正常' },
              { value: 'low', label: '库存不足' },
              { value: 'out', label: '缺货' },
              { value: 'expired', label: '已过期' },
            ]}
            style={{ width: 120 }}
          />
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
        />
      </Card>

      <Modal
        title={editingId ? '编辑易耗品' : '新增易耗品'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="code" label="编码" rules={[{ required: true }]}>
                <Input placeholder="如: HX001" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="name" label="名称" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="categoryId" label="分类">
                <Select
                  allowClear
                  placeholder="选择分类"
                  options={categories.map(c => ({ value: c.id, label: c.name }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="specification" label="规格">
                <Input placeholder="如: 500ml/瓶" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="unit" label="单位" rules={[{ required: true }]}>
                <Select options={unitOptions} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="unitPrice" label="单价 (元)" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="currentStock" label="当前库存" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="minStock" label="最低库存" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="maxStock" label="最高库存" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="supplier" label="供应商">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="location" label="存放位置">
                <Input placeholder="如: A-1-1" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="expiryDate" label="有效期">
                <Input type="date" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
