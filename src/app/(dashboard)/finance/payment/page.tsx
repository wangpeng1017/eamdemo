'use client'

import { useState, useEffect } from 'react'
import {
  Table, Button, Space, Tag, Modal, Form, Input, Select, DatePicker,
  InputNumber, message, Card, Row, Col, Statistic, Popconfirm
} from 'antd'
import { PlusOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface Payment {
  id: string
  amount: number
  paymentDate: string
  paymentMethod: string
  handlerName: string | null
  bankName: string | null
  transactionNo: string | null
  remark: string | null
  createdAt: string
  receivable: {
    id: string
    receivableNo: string
    clientName: string | null
    amount: number
    receivedAmount: number
    status: string
  }
}

interface Receivable {
  id: string
  receivableNo: string
  clientName: string | null
  amount: number
  receivedAmount: number
  status: string
}

const paymentMethodOptions = [
  { value: '银行转账', label: '银行转账' },
  { value: '现金', label: '现金' },
  { value: '支票', label: '支票' },
  { value: '其他', label: '其他' },
]

export default function PaymentPage() {
  const [data, setData] = useState<Payment[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)
  const [page, setPage] = useState(1)

  const [modalOpen, setModalOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [currentPayment, setCurrentPayment] = useState<Payment | null>(null)
  const [receivables, setReceivables] = useState<Receivable[]>([])
  const [selectedReceivable, setSelectedReceivable] = useState<Receivable | null>(null)

  const [form] = Form.useForm()

  const fetchData = async (p = page) => {
    setLoading(true)
    const res = await fetch(`/api/finance/payment?page=${p}&pageSize=10`)
    const json = await res.json()
    if (json.success) {
      setData(json.data.list)
      setTotal(json.data.total)
      setTotalAmount(json.data.totalAmount)
    }
    setLoading(false)
  }

  const fetchReceivables = async () => {
    const res = await fetch('/api/finance/receivable?status=pending&pageSize=100')
    const json = await res.json()
    if (json.success) {
      // 包含待收款和部分收款的应收账款
      const pendingRes = await fetch('/api/finance/receivable?status=partial&pageSize=100')
      const pendingJson = await pendingRes.json()
      const allReceivables = [
        ...(json.data.list || []),
        ...(pendingJson.data?.list || []),
      ]
      setReceivables(allReceivables)
    }
  }

  useEffect(() => {
    fetchData()
  }, [page])

  const handleAdd = async () => {
    await fetchReceivables()
    setSelectedReceivable(null)
    form.resetFields()
    setModalOpen(true)
  }

  const handleView = (record: Payment) => {
    setCurrentPayment(record)
    setDetailOpen(true)
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/finance/payment/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (json.success) {
      message.success('删除成功，已回滚应收账款')
      fetchData()
    } else {
      message.error(json.error?.message || '删除失败')
    }
  }

  const handleReceivableChange = (receivableId: string) => {
    const receivable = receivables.find(r => r.id === receivableId)
    setSelectedReceivable(receivable || null)
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const res = await fetch('/api/finance/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...values,
        paymentDate: values.paymentDate.format('YYYY-MM-DD'),
      }),
    })
    const json = await res.json()

    if (json.success) {
      message.success('收款登记成功')
      setModalOpen(false)
      fetchData()
    } else {
      message.error(json.error?.message || '操作失败')
    }
  }

  const columns: ColumnsType<Payment> = [
    {
      title: '应收单号', dataIndex: ['receivable', 'receivableNo'], width: 150,
    },
    {
      title: '客户名称', dataIndex: ['receivable', 'clientName'], ellipsis: true,
    },
    {
      title: '收款金额', dataIndex: 'amount', width: 120,
      render: (v: number) => `¥${Number(v).toLocaleString()}`,
    },
    {
      title: '收款日期', dataIndex: 'paymentDate', width: 120,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD'),
    },
    { title: '收款方式', dataIndex: 'paymentMethod', width: 100 },
    { title: '经手人', dataIndex: 'handlerName', width: 80 },
    { title: '交易流水号', dataIndex: 'transactionNo', width: 150, ellipsis: true },
    {
      title: '操作', width: 120, fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record)} />
          <Popconfirm title="删除后将回滚应收账款，确认删除?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small">
            <Statistic title="收款记录数" value={total} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="累计收款金额"
              value={totalAmount}
              precision={2}
              prefix="¥"
            />
          </Card>
        </Col>
      </Row>

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0 }}>收款记录</h3>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          登记收款
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ current: page, total, onChange: setPage }}
        scroll={{ x: 1100 }}
      />

      {/* 新增收款弹窗 */}
      <Modal
        title="登记收款"
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="receivableId" label="应收账款" rules={[{ required: true }]}>
            <Select
              placeholder="选择应收账款"
              onChange={handleReceivableChange}
              options={receivables.map(r => ({
                value: r.id,
                label: `${r.receivableNo} - ${r.clientName} (待收: ¥${(Number(r.amount) - Number(r.receivedAmount)).toLocaleString()})`,
              }))}
            />
          </Form.Item>

          {selectedReceivable && (
            <Card size="small" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic title="应收金额" value={Number(selectedReceivable.amount)} prefix="¥" precision={2} />
                </Col>
                <Col span={8}>
                  <Statistic title="已收金额" value={Number(selectedReceivable.receivedAmount)} prefix="¥" precision={2} />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="待收金额"
                    value={Number(selectedReceivable.amount) - Number(selectedReceivable.receivedAmount)}
                    prefix="¥"
                    precision={2}
                    valueStyle={{ color: '#cf1322' }}
                  />
                </Col>
              </Row>
            </Card>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="amount" label="收款金额" rules={[{ required: true }]}>
                <InputNumber
                  style={{ width: '100%' }}
                  min={0.01}
                  max={selectedReceivable ? Number(selectedReceivable.amount) - Number(selectedReceivable.receivedAmount) : undefined}
                  precision={2}
                  prefix="¥"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="paymentDate" label="收款日期" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="paymentMethod" label="收款方式" rules={[{ required: true }]}>
                <Select options={paymentMethodOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="handlerName" label="经手人">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="bankName" label="开户行">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="transactionNo" label="交易流水号">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title="收款详情"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={500}
      >
        {currentPayment && (
          <div>
            <p><strong>应收单号：</strong>{currentPayment.receivable.receivableNo}</p>
            <p><strong>客户名称：</strong>{currentPayment.receivable.clientName}</p>
            <p><strong>收款金额：</strong>¥{Number(currentPayment.amount).toLocaleString()}</p>
            <p><strong>收款日期：</strong>{dayjs(currentPayment.paymentDate).format('YYYY-MM-DD')}</p>
            <p><strong>收款方式：</strong>{currentPayment.paymentMethod}</p>
            <p><strong>经手人：</strong>{currentPayment.handlerName || '-'}</p>
            <p><strong>开户行：</strong>{currentPayment.bankName || '-'}</p>
            <p><strong>交易流水号：</strong>{currentPayment.transactionNo || '-'}</p>
            <p><strong>备注：</strong>{currentPayment.remark || '-'}</p>
          </div>
        )}
      </Modal>
    </div>
  )
}
