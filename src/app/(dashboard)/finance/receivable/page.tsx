'use client'

import { useState, useEffect } from 'react'
import { showSuccess, showError } from '@/lib/confirm'
import {
  Table, Button, Space, Tag, Modal, Form, Input, InputNumber,
  DatePicker, Select, message, Popconfirm, Upload, Tooltip, Card
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  UploadOutlined, PaperClipOutlined, DollarOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

// 附件信息
interface AttachmentInfo {
  id: string
  originalName: string
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
}

interface Receivable {
  id: string
  receivableNo: string
  clientName: string | null
  amount: number
  receivedAmount: number
  status: string
  dueDate: string | null
  createdAt: string
  invoices?: { invoiceNo: string; totalAmount: number; status: string }[]
  entrustment?: { entrustmentNo: string } | null
}

interface EntrustmentOption {
  id: string
  entrustmentNo: string
  clientName: string | null
}

const statusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待收款', color: 'default' },
  partial: { text: '部分收款', color: 'warning' },
  completed: { text: '已收款', color: 'success' },
}

export default function ReceivablePage() {
  const [data, setData] = useState<Receivable[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  // 凭证上传弹窗
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentTarget, setPaymentTarget] = useState<Receivable | null>(null)
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)
  const [uploadedVouchers, setUploadedVouchers] = useState<AttachmentInfo[]>([])
  const [voucherUploading, setVoucherUploading] = useState(false)
  const [form] = Form.useForm()
  const [paymentForm] = Form.useForm()
  const [entrustments, setEntrustments] = useState<EntrustmentOption[]>([])

  const fetchData = async (p = page) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p), pageSize: '10' })
    if (keyword) params.append('keyword', keyword)
    if (statusFilter) params.append('status', statusFilter)
    const res = await fetch(`/api/finance/receivable?${params}`)
    const json = await res.json()
    if (json.success && json.data) {
      setData(json.data.list || [])
      setTotal(json.data.total || 0)
    } else {
      setData([])
      setTotal(0)
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [page, statusFilter])

  useEffect(() => {
    // 加载委托单列表
    fetch('/api/entrustment?pageSize=200')
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setEntrustments((json.data.list || []).map((e: any) => ({
            id: e.id,
            entrustmentNo: e.entrustmentNo,
            clientName: e.client?.name || null,
          })))
        }
      })
      .catch(() => { })
  }, [])

  const handleAdd = () => {
    setEditingId(null)
    form.resetFields()
    setModalOpen(true)
  }

  const handleEdit = (record: Receivable) => {
    setEditingId(record.id)
    form.setFieldsValue({
      ...record,
      dueDate: record.dueDate ? dayjs(record.dueDate) : null,
    })
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/finance/receivable/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (res.ok && json.success) {
      showSuccess('删除成功')
      fetchData()
    } else {
      showError(json.error?.message || '删除失败')
    }
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const data = {
      ...values,
      dueDate: values.dueDate?.toISOString(),
    }
    const url = editingId ? `/api/finance/receivable/${editingId}` : '/api/finance/receivable'
    const method = editingId ? 'PUT' : 'POST'
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    showSuccess(editingId ? '更新成功' : '创建成功')
    setModalOpen(false)
    fetchData()
  }

  // ========== 凭证上传相关 ==========

  // 打开凭证上传弹窗
  const handleOpenPayment = (record: Receivable) => {
    setPaymentTarget(record)
    setUploadedVouchers([])
    paymentForm.resetFields()
    // 默认填入剩余未收金额
    const remaining = Number(record.amount) - Number(record.receivedAmount)
    paymentForm.setFieldsValue({
      amount: remaining > 0 ? Number(remaining.toFixed(2)) : 0,
      paymentDate: dayjs(),
      paymentMethod: '银行转账',
    })
    setPaymentModalOpen(true)
  }

  // 上传凭证文件
  const handleUploadVoucher = async (file: File) => {
    setVoucherUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload/finance?module=payment', { method: 'POST', body: formData })
      const json = await res.json()
      if (json.success && json.data) {
        setUploadedVouchers(prev => [...prev, json.data])
        showSuccess('凭证上传成功')
      } else {
        showError(json.error?.message || '凭证上传失败')
      }
    } catch {
      showError('凭证上传失败')
    }
    setVoucherUploading(false)
  }

  // 提交收款记录
  const handlePaymentSubmit = async () => {
    if (!paymentTarget) return
    try {
      const values = await paymentForm.validateFields()
      setPaymentSubmitting(true)

      const res = await fetch(`/api/finance/receivable/${paymentTarget.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          paymentDate: values.paymentDate?.toISOString(),
          attachments: uploadedVouchers,
        })
      })
      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess('收款凭证提交成功')
        setPaymentModalOpen(false)
        fetchData()
      } else {
        showError(json.error?.message || json.error || '提交失败')
      }
    } catch (err: any) {
      showError(err.message || '提交失败')
    } finally {
      setPaymentSubmitting(false)
    }
  }

  const columns: ColumnsType<Receivable> = [
    { title: '应收编号', dataIndex: 'receivableNo', width: 160 },
    { title: '客户名称', dataIndex: 'clientName', width: 150 },
    {
      title: '来源发票', width: 160,
      render: (_, r) => {
        if (!r.invoices || r.invoices.length === 0) return <Tag>手动创建</Tag>
        return r.invoices.map(inv => (
          <Tag key={inv.invoiceNo} color="blue">{inv.invoiceNo}</Tag>
        ))
      }
    },
    { title: '应收金额', dataIndex: 'amount', width: 120, render: (v) => `¥${v}` },
    { title: '已收金额', dataIndex: 'receivedAmount', width: 120, render: (v) => `¥${v}` },
    { title: '未收金额', width: 120, render: (_, r) => `¥${(Number(r.amount) - Number(r.receivedAmount)).toFixed(2)}` },
    { title: '到期日', dataIndex: 'dueDate', width: 120, render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD') : '-' },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag>
    },
    {
      title: '操作', fixed: 'right', width: 200,
      render: (_, record) => (
        <Space style={{ whiteSpace: 'nowrap' }}>
          {record.status !== 'completed' && (
            <Tooltip title="上传到账凭证">
              <Button
                size="small"
                type="primary"
                ghost
                icon={<DollarOutlined />}
                onClick={() => handleOpenPayment(record)}
              >
                上传凭证
              </Button>
            </Tooltip>
          )}
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="确认删除该应收款记录？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消" okButtonProps={{ danger: true }}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>应收款管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增应收</Button>
      </div>
      <Card size="small">
        <Space style={{ marginBottom: 16, whiteSpace: 'nowrap' }}>
          <Input.Search
            placeholder="搜索编号/客户名称"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onSearch={() => { setPage(1); fetchData(1) }}
            style={{ width: 220 }}
            allowClear
          />
          <Select
            placeholder="状态筛选"
            allowClear
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1) }}
            options={[
              { value: 'pending', label: '待收款' },
              { value: 'partial', label: '部分收款' },
              { value: 'completed', label: '已收款' },
            ]}
            style={{ width: 120 }}
          />
        </Space>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          scroll={{ x: 1300 }}
          pagination={{ current: page, total, onChange: setPage }}
          size="small"
        />
      </Card>

      {/* 新增/编辑应收款弹窗 */}
      <Modal
        title={editingId ? '编辑应收款' : '新增应收款'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="entrustmentId" label="关联委托单">
            <Select
              showSearch
              allowClear
              placeholder="选择委托单（可选）"
              optionFilterProp="label"
              options={entrustments.map(e => ({
                value: e.id,
                label: `${e.entrustmentNo}${e.clientName ? ' - ' + e.clientName : ''}`,
              }))}
              onChange={(_, option: any) => {
                if (option?.label) {
                  const clientName = option.label.split(' - ')[1]
                  if (clientName) form.setFieldValue('clientName', clientName)
                }
              }}
            />
          </Form.Item>
          <Form.Item name="clientName" label="客户名称" rules={[{ required: true, message: '请输入客户名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="amount" label="应收金额" rules={[{ required: true, message: '请输入应收金额' }]}>
            <InputNumber style={{ width: '100%' }} prefix="¥" min={0} precision={2} />
          </Form.Item>
          {editingId && (
            <Form.Item name="receivedAmount" label="已收金额">
              <InputNumber style={{ width: '100%' }} prefix="¥" min={0} precision={2} />
            </Form.Item>
          )}
          <Form.Item name="dueDate" label="到期日">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          {editingId && (
            <Form.Item name="status" label="状态">
              <Select options={[
                { value: 'pending', label: '待收款' },
                { value: 'partial', label: '部分收款' },
                { value: 'completed', label: '已收款' },
              ]} />
            </Form.Item>
          )}
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} placeholder="备注信息（选填）" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 上传凭证弹窗 */}
      <Modal
        title={`上传到账凭证 - ${paymentTarget?.clientName || ''}`}
        open={paymentModalOpen}
        onOk={handlePaymentSubmit}
        onCancel={() => setPaymentModalOpen(false)}
        width={520}
        confirmLoading={paymentSubmitting}
        okText="确认收款"
      >
        {paymentTarget && (
          <div style={{ marginBottom: 16, padding: '8px 12px', background: '#f5f5f5', borderRadius: 6 }}>
            <Space split={<span style={{ color: '#ccc' }}>|</span>}>
              <span>应收: <b>¥{Number(paymentTarget.amount).toFixed(2)}</b></span>
              <span>已收: <b>¥{Number(paymentTarget.receivedAmount).toFixed(2)}</b></span>
              <span>未收: <b style={{ color: '#cf1322' }}>¥{(Number(paymentTarget.amount) - Number(paymentTarget.receivedAmount)).toFixed(2)}</b></span>
            </Space>
          </div>
        )}
        <Form form={paymentForm} layout="vertical">
          <Form.Item name="amount" label="到账金额" rules={[{ required: true, message: '请输入到账金额' }]}>
            <InputNumber style={{ width: '100%' }} prefix="¥" min={0.01} precision={2} />
          </Form.Item>
          <Form.Item name="paymentDate" label="到账日期" rules={[{ required: true, message: '请选择到账日期' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="paymentMethod" label="支付方式" initialValue="银行转账">
            <Select options={[
              { value: '银行转账', label: '银行转账' },
              { value: '现金', label: '现金' },
              { value: '支票', label: '支票' },
              { value: '其他', label: '其他' },
            ]} />
          </Form.Item>
          <Form.Item name="transactionNo" label="交易流水号">
            <Input placeholder="银行交易流水号（选填）" />
          </Form.Item>
          <Form.Item label="到账凭证">
            <Upload
              beforeUpload={(file) => { handleUploadVoucher(file); return false }}
              showUploadList={false}
              accept=".pdf,.jpg,.jpeg,.png"
            >
              <Button icon={<UploadOutlined />} loading={voucherUploading}>上传凭证</Button>
            </Upload>
            {uploadedVouchers.length > 0 && (
              <div style={{ marginTop: 8 }}>
                {uploadedVouchers.map(f => (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                    <PaperClipOutlined />
                    <a href={f.fileUrl} target="_blank" rel="noreferrer" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.originalName}
                    </a>
                    <Button
                      type="text" size="small" danger icon={<DeleteOutlined />}
                      onClick={() => setUploadedVouchers(prev => prev.filter(v => v.id !== f.id))}
                    />
                  </div>
                ))}
              </div>
            )}
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} placeholder="备注信息（选填）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
