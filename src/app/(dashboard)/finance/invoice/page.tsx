
'use client'

import { useState, useEffect } from 'react'
import { showSuccess, showError } from '@/lib/confirm'
import { Table, Button, Space, Tag, Modal, Form, Input, InputNumber, DatePicker, Select, message, Popconfirm, Upload, Card } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, PaperClipOutlined, DeleteOutlined as DeleteFileOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface Client {
  name: string
  contact: string | null
}

interface Entrustment {
  entrustmentNo: string
  clientId: string | null
  contactPerson: string | null
}

// 附件信息
interface AttachmentInfo {
  id: string
  originalName: string
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
}

interface Invoice {
  id: string
  invoiceNo: string
  amount: number
  invoiceType?: string | null
  type: string | null
  status: string
  issuedDate: string | null
  paymentDate?: string | null
  createdAt: string
  entrustmentId?: string | null
  entrustment?: Entrustment | null
  client?: Client | null
  clientName: string
  clientTaxNo?: string | null
  invoiceAmount?: number
  taxRate?: number
  taxAmount?: number
  totalAmount?: number
  attachments?: string | null
}

interface AvailableEntrustment {
  id: string
  entrustmentNo: string
  invoiceTitle?: string | null
  taxId?: string | null
  contactPerson?: string | null
  contactPhone?: string | null
  contactEmail?: string | null
  client?: {
    name: string
    contact: string | null
  }
  quotation?: {
    subtotal?: number | null
    taxTotal?: number | null
    discountTotal?: number | null
  } | null
  contract?: {
    contractAmount?: number | null
  } | null
}

const statusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待开票', color: 'default' },
  issued: { text: '已开票', color: 'success' },
}

export default function InvoicePage() {
  const [data, setData] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [availableEntrustments, setAvailableEntrustments] = useState<AvailableEntrustment[]>([])
  const [loadingEntrustments, setLoadingEntrustments] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<AttachmentInfo[]>([])
  const [uploading, setUploading] = useState(false)
  const [form] = Form.useForm()

  // 上传附件到服务端
  const handleUploadFile = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload/finance?module=invoice', { method: 'POST', body: formData })
      const json = await res.json()
      if (json.success && json.data) {
        setUploadedFiles(prev => [...prev, json.data])
        showSuccess('附件上传成功')
      } else {
        showError(json.error?.message || '附件上传失败')
      }
    } catch {
      showError('附件上传失败')
    }
    setUploading(false)
  }

  // 删除已上传附件
  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const fetchData = async (p = page) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), pageSize: '10' })
      if (keyword) params.append('keyword', keyword)
      if (statusFilter) params.append('status', statusFilter)
      const res = await fetch(`/api/finance/invoice?${params}`)
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data.list || [])
        setTotal(json.data.total || 0)
      } else {
        setData([])
        setTotal(0)
      }
    } catch (err) {
      console.error('获取发票列表失败:', err)
      showError('获取发票列表失败')
      setData([])
      setTotal(0)
    }
    setLoading(false)
  }

  // 获取可关联的委托单列表
  const fetchAvailableEntrustments = async (keyword = '') => {
    setLoadingEntrustments(true)
    try {
      const res = await fetch(`/api/finance/invoice/available-entrustments?keyword=${encodeURIComponent(keyword)}&page=1&pageSize=50`)
      const json = await res.json()
      if (json.success && json.data) {
        setAvailableEntrustments(json.data.list || [])
      }
    } catch (err) {
      console.error('获取委托单列表失败:', err)
    }
    setLoadingEntrustments(false)
  }

  useEffect(() => { fetchData() }, [page, statusFilter])

  const handleAdd = () => {
    setEditingId(null)
    form.resetFields()
    setUploadedFiles([])
    fetchAvailableEntrustments()
    setModalOpen(true)
  }

  // 选择委托单时自动填充客户名称、税号、金额等信息
  const handleEntrustmentChange = (entrustmentNo: string) => {
    if (!entrustmentNo) {
      // 清空时不操作
      return
    }
    const selected = availableEntrustments.find(e => e.entrustmentNo === entrustmentNo)
    if (!selected) return

    // 自动填充客户名称：优先开票抬头，其次客户名称
    const clientName = selected.invoiceTitle || selected.client?.name || ''
    // 自动填充税号
    const clientTaxNo = selected.taxId || ''
    // 自动填充金额：优先合同金额，其次报价单含税金额，再次报价单小计
    let invoiceAmount: number | undefined = undefined
    if (selected.contract?.contractAmount != null) {
      invoiceAmount = Number(selected.contract.contractAmount)
    } else if (selected.quotation?.discountTotal != null && Number(selected.quotation.discountTotal) > 0) {
      invoiceAmount = Number(selected.quotation.discountTotal)
    } else if (selected.quotation?.subtotal != null) {
      invoiceAmount = Number(selected.quotation.subtotal)
    }

    form.setFieldsValue({
      clientName,
      clientTaxNo,
      ...(invoiceAmount != null && isFinite(invoiceAmount) ? { invoiceAmount } : {}),
    })
  }

  const handleEdit = (record: Invoice) => {
    setEditingId(record.id)
    // 解析已有附件
    let files: AttachmentInfo[] = []
    if (record.attachments) {
      try { files = JSON.parse(record.attachments) } catch { files = [] }
    }
    setUploadedFiles(files)
    form.setFieldsValue({
      entrustmentId: record.entrustment?.entrustmentNo || record.entrustmentId || null,
      clientName: record.clientName,
      clientTaxNo: record.clientTaxNo,
      invoiceAmount: record.invoiceAmount,
      taxRate: record.taxRate,
      invoiceType: record.invoiceType,
      status: record.status,
      issuedDate: record.issuedDate ? dayjs(record.issuedDate) : null,
      paymentDate: record.paymentDate ? dayjs(record.paymentDate) : null,
    })
    fetchAvailableEntrustments()
    setModalOpen(true)
  }


  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/finance/invoice/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (res.ok && json.success) {
      showSuccess('删除成功')
      fetchData()
    } else {
      showError(json.error || '删除失败')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      // 如果选择了委托单，查找实际的委托单ID
      let entrustmentId = values.entrustmentId
      if (values.entrustmentId && typeof values.entrustmentId === 'string') {
        const selected = availableEntrustments.find(e => e.entrustmentNo === values.entrustmentId)
        if (selected) {
          entrustmentId = selected.id
        }
      }

      const data = {
        ...values,
        entrustmentId,
        issuedDate: values.issuedDate?.toISOString ? values.issuedDate.toISOString() : values.issuedDate,
        paymentDate: values.paymentDate?.toISOString ? values.paymentDate.toISOString() : values.paymentDate,
        attachments: uploadedFiles,
      }

      const url = editingId ? `/api/finance/invoice/${editingId}` : '/api/finance/invoice'
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const json = await res.json()

      if (res.ok && json.success) {
        showSuccess(editingId ? '更新成功' : '创建成功')
        setModalOpen(false)
        fetchData()
      } else {
        showError(json.error || '操作失败')
      }
    } catch (err: any) {
      console.error('提交失败:', err)
      showError(err.message || '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  const columns: ColumnsType<Invoice> = [
    { title: '发票号', dataIndex: 'invoiceNo', width: 150 },
    { title: '客户名称', dataIndex: 'clientName', width: 150 },
    {
      title: '关联委托单',
      dataIndex: 'entrustment',
      width: 150,
      render: (e: Entrustment | null) => e?.entrustmentNo || '-'
    },
    { title: '开票金额', dataIndex: 'totalAmount', width: 120, render: (v) => v ? `¥${v}` : '-' },
    { title: '发票类型', dataIndex: 'invoiceType', width: 120 },
    {
      title: '附件', dataIndex: 'attachments', width: 80, align: 'center' as const,
      render: (v: string | null) => {
        if (!v) return '-'
        try {
          const files = JSON.parse(v)
          return files.length > 0 ? <Space><PaperClipOutlined />{files.length}</Space> : '-'
        } catch { return '-' }
      }
    },
    { title: '回款日期', dataIndex: 'paymentDate', width: 120, render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD') : '-' },
    { title: '开票日期', dataIndex: 'issuedDate', width: 120, render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD') : '-' },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag>
    },
    {
      title: '创建时间', dataIndex: 'createdAt', width: 180,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作', fixed: 'right', width: 150,
      render: (_, record) => (
        <Space style={{ whiteSpace: 'nowrap' }}>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm title="确认删除该发票？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消" okButtonProps={{ danger: true }}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>发票管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增发票</Button>
      </div>
      <Card size="small">
        <Space style={{ marginBottom: 16, whiteSpace: 'nowrap' }}>
          <Input.Search
            placeholder="搜索发票号/客户名称"
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
              { value: 'pending', label: '待开票' },
              { value: 'issued', label: '已开票' },
            ]}
            style={{ width: 120 }}
          />
        </Space>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{ current: page, total, onChange: setPage }}
          size="small"
        />
      </Card>
      <Modal
        title={editingId ? '编辑发票' : '新增发票'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={600}
        confirmLoading={submitting}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="entrustmentId"
            label="关联委托单"
            tooltip="可选择关联一个委托单"
          >
            <Select
              placeholder="请选择委托单"
              showSearch
              allowClear
              loading={loadingEntrustments}
              onSearch={(value) => fetchAvailableEntrustments(value)}
              onChange={handleEntrustmentChange}
              filterOption={false}
              options={availableEntrustments.map(e => ({
                value: e.entrustmentNo,
                label: `${e.entrustmentNo} - ${e.client?.name || '未知客户'}`
              }))}
            />
          </Form.Item>
          <Form.Item
            name="paymentDate"
            label="回款日期"
            rules={[{ required: true, message: '请选择回款日期' }]}
            tooltip="必填项，记录实际回款日期"
          >
            <DatePicker style={{ width: '100%' }} placeholder="请选择回款日期" />
          </Form.Item>
          <Form.Item name="clientName" label="客户名称" rules={[{ required: true, message: '请输入客户名称' }]}>
            <Input placeholder="请输入客户名称" />
          </Form.Item>
          <Form.Item name="clientTaxNo" label="客户税号">
            <Input placeholder="请输入客户税号" />
          </Form.Item>
          <Form.Item name="invoiceAmount" label="不含税金额" rules={[{ required: true, message: '请输入金额' }]}>
            <InputNumber style={{ width: '100%' }} prefix="¥" min={0} precision={2} placeholder="请输入金额" />
          </Form.Item>
          <Form.Item
            name="taxRate"
            label="税率"
            rules={[{ required: true, message: '请选择税率' }]}
            initialValue={0.06}
          >
            <Select>
              <Select.Option value={0.06}>6%</Select.Option>
              <Select.Option value={0.09}>9%</Select.Option>
              <Select.Option value={0.13}>13%</Select.Option>
              <Select.Option value={0}>免税</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="invoiceType" label="发票类型" initialValue="增值税普通发票">
            <Select>
              <Select.Option value="增值税普通发票">增值税普通发票</Select.Option>
              <Select.Option value="增值税专用发票">增值税专用发票</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="issuedDate" label="开票日期">
            <DatePicker style={{ width: '100%' }} placeholder="请选择开票日期" />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue="pending">
            <Select>
              <Select.Option value="pending">待开票</Select.Option>
              <Select.Option value="issued">已开票</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="附件">
            <Upload
              beforeUpload={(file) => { handleUploadFile(file); return false }}
              showUploadList={false}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
            >
              <Button icon={<UploadOutlined />} loading={uploading}>上传附件</Button>
            </Upload>
            {uploadedFiles.length > 0 && (
              <div style={{ marginTop: 8 }}>
                {uploadedFiles.map(f => (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                    <PaperClipOutlined />
                    <a href={f.fileUrl} target="_blank" rel="noreferrer" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.originalName}
                    </a>
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => handleRemoveFile(f.id)} />
                  </div>
                ))}
              </div>
            )}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
