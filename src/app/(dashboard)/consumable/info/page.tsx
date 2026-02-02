'use client'

import { useState, useEffect, useCallback } from 'react'
import { showSuccess, showError } from '@/lib/confirm'
import { Card, Table, Button, Form, Input, InputNumber, Select, Space, Tag, Popconfirm, Row, Col, Statistic, Drawer, Descriptions } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, WarningOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
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

export default function ConsumableInfoPage() {
  const router = useRouter()
  const [consumables, setConsumables] = useState<Consumable[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [keyword, setKeyword] = useState('')
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [stats, setStats] = useState<Record<string, number>>({})

  // 查看抽屉状态
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false)
  const [currentConsumable, setCurrentConsumable] = useState<Consumable | null>(null)

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
        showError(data.message || '加载失败')
      }
    } catch {
      showError('网络错误')
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
    router.push('/consumable/info/create')
  }

  const handleView = (record: Consumable) => {
    setCurrentConsumable(record)
    setViewDrawerOpen(true)
  }

  const handleEdit = (record: Consumable) => {
    router.push(`/consumable/info/edit/${record.id}`)
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/consumable/${id}`, { method: 'DELETE' })
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
      title: '操作', fixed: 'right',
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
        <Space style={{ marginBottom: 16 }} style={{ whiteSpace: 'nowrap' }}>
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

      {/* 查看抽屉 */}
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
            <Descriptions.Item label="当前库存">{currentConsumable.currentStock} {currentConsumable.unit}</Descriptions.Item>
            <Descriptions.Item label="安全库存">{currentConsumable.minStock} - {currentConsumable.maxStock}</Descriptions.Item>
            <Descriptions.Item label="单价">¥{currentConsumable.unitPrice}</Descriptions.Item>
            <Descriptions.Item label="供应商">{currentConsumable.supplier || '-'}</Descriptions.Item>
            <Descriptions.Item label="存放位置">{currentConsumable.location || '-'}</Descriptions.Item>
            <Descriptions.Item label="有效期">{currentConsumable.expiryDate ? currentConsumable.expiryDate.split('T')[0] : '-'}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusMap[currentConsumable.status]?.color}>
                {statusMap[currentConsumable.status]?.text}
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
