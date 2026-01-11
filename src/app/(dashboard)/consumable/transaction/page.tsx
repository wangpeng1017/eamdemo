'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, message, Space, Tag, Row, Col, Statistic } from 'antd'
import { ImportOutlined, ExportOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import dayjs from 'dayjs'

interface Consumable {
  id: string
  code: string
  name: string
  unit: string
  unitPrice: number
}

interface StockTransaction {
  id: string
  transactionNo: string
  type: 'in' | 'out'
  consumableId: string
  consumable: Consumable
  quantity: number
  unitPrice: number
  totalAmount: number
  reason: string
  relatedOrder: string | null
  operator: string
  transactionDate: string
  remark: string | null
}

const reasonOptions = {
  in: [
    { value: '采购入库', label: '采购入库' },
    { value: '退货入库', label: '退货入库' },
    { value: '盘盈入库', label: '盘盈入库' },
    { value: '调拨入库', label: '调拨入库' },
    { value: '其他入库', label: '其他入库' },
  ],
  out: [
    { value: '领用出库', label: '领用出库' },
    { value: '报废出库', label: '报废出库' },
    { value: '盘亏出库', label: '盘亏出库' },
    { value: '调拨出库', label: '调拨出库' },
    { value: '其他出库', label: '其他出库' },
  ],
}

export default function StockTransactionPage() {
  const [transactions, setTransactions] = useState<StockTransaction[]>([])
  const [consumables, setConsumables] = useState<Consumable[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [transactionType, setTransactionType] = useState<'in' | 'out'>('in')
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [keyword, setKeyword] = useState('')
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [stats, setStats] = useState({ inTotal: 0, outTotal: 0 })
  const [form] = Form.useForm()

  // 加载易耗品列表
  const loadConsumables = useCallback(async () => {
    try {
      const res = await fetch('/api/consumable?pageSize=1000')
      const data = await res.json()
      if (data.success) {
        setConsumables(data.data.list || [])
      }
    } catch {
      // 加载失败不影响主功能
    }
  }, [])

  // 加载出入库记录
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(pagination.current),
        pageSize: String(pagination.pageSize),
      })
      if (typeFilter) params.append('type', typeFilter)
      if (keyword) params.append('keyword', keyword)

      const res = await fetch(`/api/consumable-transaction?${params}`)
      const data = await res.json()
      if (data.success) {
        setTransactions(data.data.list)
        setPagination(prev => ({ ...prev, total: data.data.total }))
        setStats(data.data.stats || { inTotal: 0, outTotal: 0 })
      } else {
        message.error(data.message || '加载失败')
      }
    } catch {
      message.error('网络错误')
    } finally {
      setLoading(false)
    }
  }, [pagination.current, pagination.pageSize, typeFilter, keyword])

  useEffect(() => {
    loadConsumables()
  }, [loadConsumables])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleAdd = (type: 'in' | 'out') => {
    setTransactionType(type)
    form.resetFields()
    form.setFieldsValue({ type, transactionDate: dayjs().format('YYYY-MM-DD HH:mm:ss') })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    setSubmitting(true)

    try {
      const res = await fetch('/api/consumable-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          type: transactionType,
        }),
      })
      const data = await res.json()

      if (data.success) {
        message.success(`${transactionType === 'in' ? '入库' : '出库'}成功`)
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
  const inCount = transactions.filter(t => t.type === 'in').length
  const outCount = transactions.filter(t => t.type === 'out').length

  const columns: ColumnsType<StockTransaction> = [
    { title: '单据编号', dataIndex: 'transactionNo', width: 150 },
    {
      title: '类型',
      dataIndex: 'type',
      width: 80,
      render: (type: string) => (
        <Tag color={type === 'in' ? 'green' : 'red'}>
          {type === 'in' ? '入库' : '出库'}
        </Tag>
      ),
    },
    {
      title: '易耗品编码',
      key: 'consumableCode',
      width: 100,
      render: (_, record) => record.consumable?.code || '-',
    },
    {
      title: '易耗品名称',
      key: 'consumableName',
      width: 150,
      render: (_, record) => record.consumable?.name || '-',
    },
    {
      title: '数量',
      key: 'quantity',
      width: 100,
      render: (_, record) => `${record.quantity} ${record.consumable?.unit || ''}`,
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      width: 80,
      render: (price: number) => `¥${price}`,
    },
    {
      title: '金额',
      dataIndex: 'totalAmount',
      width: 100,
      render: (amount: number) => `¥${amount.toFixed(2)}`,
    },
    { title: '原因', dataIndex: 'reason', width: 100 },
    { title: '操作人', dataIndex: 'operator', width: 80 },
    {
      title: '日期',
      dataIndex: 'transactionDate',
      width: 100,
      render: (date: string) => date ? date.split('T')[0] : '-',
    },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>出入库记录</h2>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
          <Button type="primary" icon={<ImportOutlined />} onClick={() => handleAdd('in')}>
            入库
          </Button>
          <Button danger icon={<ExportOutlined />} onClick={() => handleAdd('out')}>
            出库
          </Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="入库总额" value={stats.inTotal} prefix="¥" precision={2} valueStyle={{ color: 'green' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="出库总额" value={stats.outTotal} prefix="¥" precision={2} valueStyle={{ color: 'red' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="入库次数" value={inCount} suffix="次" />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="出库次数" value={outCount} suffix="次" />
          </Card>
        </Col>
      </Row>

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="搜索单据编号/名称"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onSearch={handleSearch}
            style={{ width: 200 }}
          />
          <Select
            placeholder="类型筛选"
            allowClear
            value={typeFilter}
            onChange={(v) => { setTypeFilter(v); setPagination(p => ({ ...p, current: 1 })) }}
            options={[
              { value: 'in', label: '入库' },
              { value: 'out', label: '出库' },
            ]}
            style={{ width: 100 }}
          />
        </Space>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={transactions}
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
        title={transactionType === 'in' ? '入库登记' : '出库登记'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="consumableId" label="易耗品" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="选择易耗品"
              optionFilterProp="label"
              options={consumables.map(c => ({
                value: c.id,
                label: `${c.code} - ${c.name} (¥${c.unitPrice}/${c.unit})`,
              }))}
            />
          </Form.Item>
          <Form.Item name="quantity" label="数量" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reason" label="原因" rules={[{ required: true }]}>
            <Select options={reasonOptions[transactionType]} />
          </Form.Item>
          <Form.Item name="operator" label="操作人" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="transactionDate" label="日期" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          {transactionType === 'in' && (
            <Form.Item name="relatedOrder" label="关联采购单">
              <Input placeholder="如: PO202601050001" />
            </Form.Item>
          )}
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
