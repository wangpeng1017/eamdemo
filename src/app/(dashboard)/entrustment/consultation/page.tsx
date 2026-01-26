// @file: 委托咨询登记页面
// @input: /api/consultation, /api/client
// @output: 咨询CRUD、生成报价
// @pos: 委托流程入口页 - 客户首次咨询
// ⚠️ 更新我时，请同步更新本注释及 entrustment/_INDEX.md

'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Space, Modal, Form, Input, Select, DatePicker, message, Drawer, Row, Col, InputNumber, Divider } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, FileTextOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { StatusTag } from '@/components/StatusTag'
import UserSelect from '@/components/UserSelect'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useRouter } from 'next/navigation'

interface Client {
  id: string
  name: string
  shortName?: string
  contact?: string
  phone?: string
  email?: string
  address?: string
}

interface TestTemplate {
  id: string
  templateNo: string
  name: string
  category?: string
  method?: string
}

interface ConsultationSample {
  name: string
  model?: string
  material?: string
  quantity: number
  remark?: string
}

interface Consultation {
  id: string
  consultationNo: string
  clientId?: string
  client?: Client
  clientContactPerson?: string
  sampleName?: string | null
  sampleModel?: string | null
  sampleMaterial?: string | null
  estimatedQuantity?: string | null
  testItems?: string[]
  expectedDeadline?: string | null
  budgetRange?: string | null
  feasibility?: string | null
  feasibilityNote?: string | null
  follower?: string | null
  status: string
  createdAt: string
  consultationSamples?: ConsultationSample[]
}

const FEASIBILITY_OPTIONS = [
  { value: 'feasible', label: '可行' },
  { value: 'difficult', label: '困难' },
  { value: 'infeasible', label: '不可行' },
]

export default function ConsultationPage() {
  const router = useRouter()
  const [data, setData] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [currentConsultation, setCurrentConsultation] = useState<Consultation | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [clientsLoading, setClientsLoading] = useState(false)
  const [testTemplates, setTestTemplates] = useState<TestTemplate[]>([])
  const [form] = Form.useForm()
  const [filters, setFilters] = useState<any>({})

  // 行选择
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [selectedRows, setSelectedRows] = useState<Consultation[]>([])

  // 弹窗
  const [generateQuoteModalOpen, setGenerateQuoteModalOpen] = useState(false)
  const [closeConsultModalOpen, setCloseConsultModalOpen] = useState(false)
  const [generateQuoteForm] = Form.useForm()
  const [closeReasonForm] = Form.useForm()
  const [quoteItems, setQuoteItems] = useState<any[]>([])
  const [quoteSamples, setQuoteSamples] = useState<any[]>([])

  // 获取客户列表
  const fetchClients = async () => {
    setClientsLoading(true)
    try {
      const res = await fetch('/api/entrustment/client?status=approved&pageSize=1000')
      const json = await res.json()
      setClients(json.list || [])
    } catch (error) {
      console.error('获取客户列表失败:', error)
    } finally {
      setClientsLoading(false)
    }
  }

  // 获取检测项目列表
  const fetchTestTemplates = async () => {
    try {
      const res = await fetch('/api/test-template?pageSize=1000')
      const json = await res.json()
      if (json.success && json.data) {
        setTestTemplates(json.data.list || [])
      } else {
        setTestTemplates(json.list || [])
      }
    } catch (error) {
      console.error('获取检测项目列表失败:', error)
    }
  }

  const fetchData = async (p = page, f = filters) => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(p),
      pageSize: '10',
      ...Object.fromEntries(Object.entries(f).filter(([_, v]) => v !== undefined && v !== '')),
    })
    const res = await fetch(`/api/consultation?${params}`)
    const json = await res.json()
    if (json.success && json.data) {
      setData(json.data.list || [])
      setTotal(json.data.total || 0)
    } else {
      setData(json.list || [])
      setTotal(json.total || 0)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
    fetchClients()
    fetchTestTemplates()
  }, [page])

  const handleAdd = () => {
    setEditingId(null)
    setSamples([{ name: '', quantity: 1 }])
    form.resetFields()
    setModalOpen(true)
  }

  const handleEdit = (record: Consultation) => {
    setEditingId(record.id)
    // 兼容旧数据：如果有关联样品表则使用，否则使用旧字段
    let initSamples: ConsultationSample[] = []
    if (record.consultationSamples && record.consultationSamples.length > 0) {
      initSamples = record.consultationSamples.map(s => ({
        name: s.name,
        model: s.model || undefined,
        material: s.material || undefined,
        quantity: s.quantity || 1,
        remark: s.remark || undefined
      }))
    } else if (record.sampleName) {
      initSamples = [{
        name: record.sampleName,
        model: record.sampleModel || undefined,
        material: record.sampleMaterial || undefined,
        // estimateQuantity is string in interface but mapped to int in API... 
        // Need to check specific implementation. 
        // Based on interface: estimatedQuantity?: string | null
        quantity: parseInt(record.estimatedQuantity || '1') || 1
      }]
    }

    setSamples(initSamples)

    const formData = {
      ...record,
      clientId: record.clientId || record.client?.id,
      expectedDeadline: record.expectedDeadline ? dayjs(record.expectedDeadline) : undefined,
      testItems: record.testItems || [],
    }
    form.setFieldsValue(formData)
    setModalOpen(true)
  }

  const handleView = async (record: Consultation) => {
    // view logic might need API call to get full details including samples if main list doesn't have it fully populated
    // But list API now includes consultationSamples
    setCurrentConsultation(record)
    setViewDrawerOpen(true)
  }

  const handleDelete = async (record: Consultation) => {
    let title = '确认删除'
    let content = '确定要删除这条咨询记录吗？'
    let okType: 'danger' | 'primary' = 'primary'

    console.log('Delete button clicked', record)
    if (!record) {
      console.error('Record is undefined')
      return
    }

    console.log('Checking status:', record.status)
    if (record.status === 'quoted') {
      console.log('Status is quoted, attempt to show warning')
      title = '无法删除'
      content = '该咨询单已生成报价，请先处理相关报价单后再尝试删除，或将状态更改为"已关闭"。'
      modal.warning({
        title,
        content,
      })
      return
    }

    if (record.status === 'closed') {
      content = '该咨询单已关闭，确定要彻底删除吗？删除后无法恢复。'
      okType = 'danger'
    }

    modal.confirm({
      title,
      content,
      okType,
      onOk: async () => {
        const res = await fetch(`/api/consultation/${record.id}`, { method: 'DELETE' })
        const json = await res.json()
        if (res.ok && json.success) {
          message.success('删除成功')
          fetchData()
        } else {
          message.error(json.error?.message || '删除失败')
        }
      },
    })
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const submitData = {
      ...values,
      expectedDeadline: values.expectedDeadline ? values.expectedDeadline.toISOString() : null,
      samples, // 传递样品列表
    }

    if (editingId) {
      await fetch(`/api/consultation/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      })
      message.success('更新成功')
    } else {
      await fetch('/api/consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      })
      message.success('创建成功')
    }
    setModalOpen(false)
    fetchData()
  }

  // 客户选择变化时自动填充联系人
  const handleClientChange = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    if (client) {
      form.setFieldsValue({
        clientContactPerson: client.contact || '',
      })
    }
  }

  // 打开生成报价单弹窗
  const handleOpenGenerateQuote = () => {
    if (selectedRows.length !== 1) {
      message.warning('请选择一条咨询记录')
      return
    }
    const consultation = selectedRows[0]

    // 初始化样品数据
    let initSamples: any[] = []
    if (consultation.consultationSamples && consultation.consultationSamples.length > 0) {
      initSamples = consultation.consultationSamples.map(s => ({
        name: s.name,
        model: s.model,
        material: s.material,
        quantity: s.quantity,
        remark: s.remark
      }))
    } else if (consultation.sampleName) {
      initSamples = [{
        name: consultation.sampleName,
        model: consultation.sampleModel,
        material: consultation.sampleMaterial,
        quantity: parseInt(consultation.estimatedQuantity || '1') || 1
      }]
    }
    setQuoteSamples(initSamples)

    const items = (consultation.testItems || []).map(item => {
      // 查找检测项目模板，获取检测标准
      const template = testTemplates.find(t => t.name === item)
      return {
        name: item,
        standard: template?.method || '',
        quantity: 10,
        unitPrice: 0,
      }
    })
    setQuoteItems(items)
    generateQuoteForm.setFieldsValue({
      consultationId: consultation.id,
      consultationNo: consultation.consultationNo,
      clientId: consultation.clientId,
      clientName: consultation.client?.name,
      contact: consultation.clientContactPerson,
      phone: consultation.client?.phone,
      email: consultation.client?.email,
      address: consultation.client?.address,
      sampleName: consultation.sampleName, // 保留作为默认值，但主要使用 samples 数组
    })
    setGenerateQuoteModalOpen(true)
  }

  // 生成报价单提交
  const handleGenerateQuote = async () => {
    const values = await generateQuoteForm.validateFields()
    message.loading({ content: '正在创建报价单...', key: 'generate' })

    const res = await fetch('/api/quotation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consultationNo: values.consultationNo,
        clientId: values.clientId,
        clientContactPerson: values.contact,
        sampleName: values.sampleName, // 后端兼容
        samples: quoteSamples, // 传递多行样品数据
        clientRemark: values.clientRemark,
        items: quoteItems.map((item: any) => ({
          serviceItem: item.name,
          methodStandard: item.standard,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
        })),
      }),
    })

    const json = await res.json()

    // 更新咨询单状态为已报价
    await fetch(`/api/consultation/${values.consultationId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'quoted', quotationNo: json.quotationNo }),
    })

    message.success({ content: `报价单 ${json.quotationNo} 创建成功`, key: 'generate' })
    setGenerateQuoteModalOpen(false)
    setSelectedRowKeys([])
    setSelectedRows([])
    fetchData()
    router.push('/entrustment/quotation')
  }

  // 打开关闭咨询弹窗
  const handleOpenCloseConsult = () => {
    if (selectedRows.length === 0) {
      message.warning('请选择咨询记录')
      return
    }
    closeReasonForm.resetFields()
    setCloseConsultModalOpen(true)
  }

  // 关闭咨询提交
  const handleCloseConsult = async () => {
    const values = await closeReasonForm.validateFields()

    for (const row of selectedRows) {
      await fetch(`/api/consultation/${row.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'closed',
        }),
      })
    }

    message.success('咨询已关闭')
    setCloseConsultModalOpen(false)
    setSelectedRowKeys([])
    setSelectedRows([])
    fetchData()
  }

  // 添加报价项
  const handleAddQuoteItem = () => {
    setQuoteItems([...quoteItems, { name: '', standard: '', quantity: 1, unitPrice: 0 }])
  }

  // 更新报价项
  const handleUpdateQuoteItem = (index: number, field: string, value: any) => {
    const newItems = [...quoteItems]
    newItems[index] = { ...newItems[index], [field]: value }

    // 如果选择了检测项目，自动带出检测标准
    if (field === 'name') {
      const template = testTemplates.find(t => t.name === value)
      if (template?.method) {
        newItems[index].standard = template.method
      }
    }

    setQuoteItems(newItems)
  }

  // 删除报价项
  const handleRemoveQuoteItem = (index: number) => {
    setQuoteItems(quoteItems.filter((_, i) => i !== index))
  }

  // 报价单样品操作
  const handleAddQuoteSample = () => {
    setQuoteSamples([...quoteSamples, { name: '', quantity: 1 }])
  }

  const handleUpdateQuoteSample = (index: number, field: string, value: any) => {
    const newSamples = [...quoteSamples]
    newSamples[index] = { ...newSamples[index], [field]: value }
    setQuoteSamples(newSamples)
  }

  const handleRemoveQuoteSample = (index: number) => {
    setQuoteSamples(quoteSamples.filter((_, i) => i !== index))
  }

  // 计算报价金额
  const totalAmount = quoteItems.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0)
  const taxAmount = totalAmount * 0.06
  const totalWithTax = totalAmount + taxAmount

  // 针对单条记录生成报价单
  const handleOpenGenerateQuoteForRecord = (consultation: Consultation) => {
    // 初始化样品数据
    let initSamples: any[] = []
    if (consultation.consultationSamples && consultation.consultationSamples.length > 0) {
      initSamples = consultation.consultationSamples.map(s => ({
        name: s.name,
        model: s.model,
        material: s.material,
        quantity: s.quantity,
        remark: s.remark
      }))
    } else if (consultation.sampleName) {
      initSamples = [{
        name: consultation.sampleName,
        model: consultation.sampleModel,
        material: consultation.sampleMaterial,
        quantity: parseInt(consultation.estimatedQuantity || '1') || 1
      }]
    }
    setQuoteSamples(initSamples)

    const items = (consultation.testItems || []).map(item => {
      const template = testTemplates.find(t => t.name === item)
      return {
        name: item,
        standard: template?.method || '',
        quantity: 1,
        unitPrice: 0
      }
    })
    setQuoteItems(items)
    generateQuoteForm.resetFields()
    generateQuoteForm.setFieldsValue({
      consultationId: consultation.id,
      consultationNo: consultation.consultationNo,
      clientId: consultation.clientId,
      clientName: consultation.client?.name,
      clientContact: consultation.clientContactPerson,
      clientPhone: consultation.client?.phone,
      validDays: 30,
      taxRate: 6,
      discountAmount: 0,
    })
    setGenerateQuoteModalOpen(true)
  }

  const columns: ColumnsType<Consultation> = [
    { title: '咨询单号', dataIndex: 'consultationNo', width: 140 },
    {
      title: '客户名称',
      width: 150,
      ellipsis: true,
      render: (_, record) => record.client?.name || '-'
    },
    {
      title: '样品名称',
      dataIndex: 'sampleName',
      width: 120,
      ellipsis: true,
      render: (v, record) => {
        if (v) return v
        if (record.consultationSamples && record.consultationSamples.length > 0) {
          return record.consultationSamples[0].name + (record.consultationSamples.length > 1 ? ` 等${record.consultationSamples.length}个` : '')
        }
        return '-'
      }
    },
    {
      title: '检测项目',
      dataIndex: 'testItems',
      width: 180,
      ellipsis: true,
      render: (items: string[]) => {
        if (!items || items.length === 0) return '-'
        const displayItems = items.slice(0, 2)
        const extra = items.length > 2 ? ` 等${items.length}项` : ''
        return displayItems.join('、') + extra
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: string) => <StatusTag type="consultation" status={s} />
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '联系人/电话',
      width: 130,
      render: (_, record) => (
        <div>
          <div>{record.clientContactPerson || '-'}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{record.client?.phone || '-'}</div>
        </div>
      )
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      render: (_, record) => (
        <Space size="small" style={{ whiteSpace: 'nowrap' }}>
          {/* 业务按钮（带文字） */}
          <Button size="small" icon={<FileTextOutlined />} onClick={() => handleOpenGenerateQuoteForRecord(record)}>生成报价单</Button>
          {/* 通用按钮（仅图标） */}
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record)} />
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
        </Space>
      )
    }
  ]

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[], rows: Consultation[]) => {
      setSelectedRowKeys(keys)
      setSelectedRows(rows)
    },
  }

  // 引用 useModal
  const [modal, contextHolder] = Modal.useModal()

  // 样品信息
  // interface needs to be at top level but for now define here or use existing
  // The state was defined here
  const [samples, setSamples] = useState<ConsultationSample[]>([])

  const handleAddSample = () => {
    setSamples([...samples, { name: '', quantity: 1 }])
  }

  const handleUpdateSample = (index: number, field: keyof ConsultationSample, value: any) => {
    const newSamples = [...samples]
    newSamples[index] = { ...newSamples[index], [field]: value }
    setSamples(newSamples)
  }

  const handleRemoveSample = (index: number) => {
    setSamples(samples.filter((_, i) => i !== index))
  }

  const sampleColumns: ColumnsType<ConsultationSample> = [
    {
      title: '样品名称',
      dataIndex: 'name',
      render: (val, record, index) => (
        <Input
          value={val}
          onChange={e => handleUpdateSample(index, 'name', e.target.value)}
          placeholder="样品名称"
        />
      )
    },
    {
      title: '规格型号',
      dataIndex: 'model',
      render: (val, record, index) => (
        <Input
          value={val}
          onChange={e => handleUpdateSample(index, 'model', e.target.value)}
          placeholder="规格型号"
        />
      )
    },
    {
      title: '材质',
      dataIndex: 'material',
      render: (val, record, index) => (
        <Input
          value={val}
          onChange={e => handleUpdateSample(index, 'material', e.target.value)}
          placeholder="材质"
        />
      )
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      width: 100,
      render: (val, record, index) => (
        <InputNumber
          min={1}
          value={val}
          onChange={v => handleUpdateSample(index, 'quantity', v || 1)}
        />
      )
    },
    {
      title: '操作',
      width: 60,
      render: (_, __, index) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveSample(index)}
        />
      )
    }
  ]


  return (
    <div>
      {contextHolder}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>委托咨询</h2>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增咨询</Button>
        </Space>
      </div>

      {/* 筛选条件 */}
      <div style={{ background: '#f5f5f5', padding: 16, marginBottom: 16, borderRadius: 4 }}>
        <Form layout="inline" onFinish={(values) => { setFilters(values); setPage(1); fetchData(1, values) }}>
          <Form.Item name="keyword" label="关键词">
            <Input placeholder="咨询单号/客户名称/联系人" allowClear style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select placeholder="全部状态" allowClear style={{ width: 120 }}>
              <Select.Option value="following">跟进中</Select.Option>
              <Select.Option value="quoted">已报价</Select.Option>
              <Select.Option value="rejected">已拒绝</Select.Option>
              <Select.Option value="closed">已关闭</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">查询</Button>
          </Form.Item>
        </Form>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        rowSelection={rowSelection}
        scroll={{ x: 1050 }}
        pagination={{ current: page, total, pageSize: 10, onChange: setPage, showSizeChanger: false }}
      />

      {/* 新增/编辑模态框 */}
      <Modal
        title={editingId ? '编辑咨询' : '新增咨询'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={800}
        footer={[
          <Button key="cancel" onClick={() => setModalOpen(false)}>取消</Button>,
          <Button key="submit" type="primary" onClick={handleSubmit}>{editingId ? '更新' : '创建'}</Button>,
        ]}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="clientId" label="客户" rules={[{ required: true, message: '请选择客户' }]}>
                <Select
                  showSearch
                  allowClear
                  placeholder="选择客户"
                  loading={clientsLoading}
                  optionFilterProp="label"
                  options={clients.map(c => ({ value: c.id, label: c.name }))}
                  onChange={handleClientChange}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="clientContactPerson" label="联系人" rules={[{ required: true, message: '请输入联系人' }]}>
                <Input placeholder="请输入联系人姓名" />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 500 }}>样品信息</span>
              <Button type="dashed" onClick={handleAddSample} icon={<PlusOutlined />} size="small">添加样品</Button>
            </div>
            <Table
              rowKey={(r, i) => i || 0}
              columns={sampleColumns}
              dataSource={samples}
              pagination={false}
              size="small"
              bordered
              locale={{ emptyText: '暂无样品' }}
            />
          </div>

          <Form.Item name="testItems" label="检测项目（多选）">
            <Select
              mode="multiple"
              placeholder="请选择检测项目"
              showSearch
              optionFilterProp="label"
              options={testTemplates.map(t => ({ value: t.name, label: t.name }))}
            />
          </Form.Item>

          <Divider orientationMargin="0">其他信息</Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="expectedDeadline" label="期望交付日期">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="follower" label="跟单人">
                <UserSelect placeholder="请选择跟单人" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="budgetRange" label="预算范围">
                <Input placeholder="例如：5000-10000元" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="feasibility" label="可行性评估">
                <Select options={FEASIBILITY_OPTIONS} placeholder="请选择" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="feasibilityNote" label="可行性说明">
            <Input.TextArea rows={2} placeholder="请输入可行性说明" />
          </Form.Item>

          {/* 状态字段已移除，由系统自动管理 */}
        </Form>
      </Modal>

      {/* 查看详情抽屉 */}
      <Drawer
        title="咨询详情"
        placement="right"
        width={600}
        open={viewDrawerOpen}
        onClose={() => setViewDrawerOpen(false)}
      >
        {currentConsultation && (
          <div>
            <Descriptions title="基本信息" data={currentConsultation} />
            <Divider />
            <Descriptions title="样品信息" data={currentConsultation} />
            <Divider />
            <Descriptions title="其他信息" data={currentConsultation} />
          </div>
        )}
      </Drawer>

      {/* 生成报价单弹窗 */}
      <Modal
        title="新建报价单"
        open={generateQuoteModalOpen}
        onOk={handleGenerateQuote}
        onCancel={() => setGenerateQuoteModalOpen(false)}
        width={900}
        okText="保存"
      >
        <Form form={generateQuoteForm} layout="vertical">
          <h4>委托方信息</h4>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="clientName" label="委托方公司" rules={[{ required: true }]}>
                <Input disabled />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="contact" label="联系人" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="联系电话" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="email" label="邮箱">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="address" label="地址">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Divider>样品信息</Divider>
          {/* 隐藏原来的单行 sampleName，改用表格，但为了兼容后端可能的必填校验，可以保留 hidden 字段 */}
          <Form.Item name="sampleName" hidden>
            <Input />
          </Form.Item>

          <Table
            dataSource={quoteSamples}
            rowKey={(r, i) => i || 0}
            pagination={false}
            size="small"
            bordered
            locale={{ emptyText: '暂无样品' }}
            footer={() => (
              <Button type="dashed" onClick={handleAddQuoteSample} block icon={<PlusOutlined />}>
                添加样品
              </Button>
            )}
            columns={[
              {
                title: '样品名称',
                dataIndex: 'name',
                render: (val, record, index) => (
                  <Input value={val} onChange={e => handleUpdateQuoteSample(index, 'name', e.target.value)} placeholder="样品名称" />
                )
              },
              {
                title: '规格型号',
                dataIndex: 'model',
                render: (val, record, index) => (
                  <Input value={val} onChange={e => handleUpdateQuoteSample(index, 'model', e.target.value)} placeholder="规格型号" />
                )
              },
              {
                title: '材质',
                dataIndex: 'material',
                render: (val, record, index) => (
                  <Input value={val} onChange={e => handleUpdateQuoteSample(index, 'material', e.target.value)} placeholder="材质" />
                )
              },
              {
                title: '数量',
                dataIndex: 'quantity',
                width: 80,
                render: (val, record, index) => (
                  <InputNumber min={1} value={val} onChange={v => handleUpdateQuoteSample(index, 'quantity', v || 1)} />
                )
              },
              {
                title: '操作',
                width: 60,
                render: (_, __, index) => (
                  <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemoveQuoteSample(index)} />
                )
              }
            ]}
          />

          <Divider>检测项目</Divider>
          {quoteItems.map((item, index) => (
            <Row key={index} gutter={8} style={{ marginBottom: 8 }}>
              <Col span={6}>
                <Select
                  placeholder="检测项目"
                  value={item.name}
                  onChange={(v) => handleUpdateQuoteItem(index, 'name', v)}
                  showSearch
                  optionFilterProp="label"
                  options={testTemplates.map(t => ({ value: t.name, label: t.name }))}
                  style={{ width: '100%' }}
                />
              </Col>
              <Col span={6}>
                <Input
                  placeholder="检测标准"
                  value={item.standard}
                  onChange={(e) => handleUpdateQuoteItem(index, 'standard', e.target.value)}
                />
              </Col>
              <Col span={3}>
                <InputNumber
                  placeholder="数量"
                  value={item.quantity}
                  onChange={(v) => handleUpdateQuoteItem(index, 'quantity', v)}
                  min={1}
                  style={{ width: '100%' }}
                />
              </Col>
              <Col span={4}>
                <InputNumber
                  placeholder="单价"
                  value={item.unitPrice}
                  onChange={(v) => handleUpdateQuoteItem(index, 'unitPrice', v)}
                  min={0}
                  precision={2}
                  prefix="¥"
                  style={{ width: '100%' }}
                />
              </Col>
              <Col span={4}>
                <span>总价: ¥{((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}</span>
              </Col>
              <Col span={1}>
                <Button danger size="small" onClick={() => handleRemoveQuoteItem(index)}/>
              </Col>
            </Row>
          ))}

          <div style={{ background: '#f5f5f5', padding: 12, marginTop: 16 }}>
            <div>报价合计: ¥{totalAmount.toFixed(2)}</div>
            <div>含税合计(6%): ¥{totalWithTax.toFixed(2)}</div>
            <div style={{ fontWeight: 'bold' }}>优惠后合计: ¥{totalWithTax.toFixed(2)}</div>
          </div>

          <Form.Item name="clientRemark" label="客户要求备注" style={{ marginTop: 16 }}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="consultationId" hidden><Input /></Form.Item>
          <Form.Item name="consultationNo" hidden><Input /></Form.Item>
          <Form.Item name="clientId" hidden><Input /></Form.Item>
        </Form>
      </Modal>

      {/* 关闭咨询弹窗 */}
      <Modal
        title="关闭咨询"
        open={closeConsultModalOpen}
        onOk={handleCloseConsult}
        onCancel={() => setCloseConsultModalOpen(false)}
      >
        <Form form={closeReasonForm} layout="vertical">
          <Form.Item
            name="closeReason"
            label="关闭原因"
            rules={[{ required: true, message: '请输入关闭原因' }]}
          >
            <Input.TextArea rows={4} placeholder="请输入关闭原因" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

// 详情展示组件
function Descriptions({ title, data }: { title: string; data: Consultation }) {
  const items = [
    { label: '咨询单号', value: data.consultationNo },
    { label: '客户名称', value: data.client?.name || '-' },
    { label: '联系人', value: data.clientContactPerson || '-' },
    { label: '联系电话', value: data.client?.phone || '-' },
    { label: '客户邮箱', value: data.client?.email || '-' },
    { label: '客户地址', value: data.client?.address || '-' },
    { label: '样品名称', value: data.sampleName },
    { label: '规格型号', value: data.sampleModel },
    { label: '样品材质', value: data.sampleMaterial },
    { label: '预估数量', value: data.estimatedQuantity },
    { label: '检测项目', value: data.testItems?.join(', ') },
    { label: '期望交付日期', value: data.expectedDeadline ? dayjs(data.expectedDeadline).format('YYYY-MM-DD HH:mm:ss') : '-' },
    { label: '预算范围', value: data.budgetRange },
    { label: '可行性评估', value: <StatusTag type="feasibility" status={data.feasibility} /> },
    { label: '可行性说明', value: data.feasibilityNote },
    { label: '跟单人', value: data.follower },
    { label: '状态', value: <StatusTag type="consultation" status={data.status} /> },
    { label: '创建时间', value: dayjs(data.createdAt).format('YYYY-MM-DD HH:mm:ss') },
  ]

  const relevantItems = title === '基本信息'
    ? items.slice(0, 7)
    : title === '其他信息' // Skip Sample Info section for now
      ? items.slice(11)
      : []

  return (
    <div>
      <h4 style={{ marginBottom: 16 }}>{title}</h4>
      {title === '样品信息' ? (
        <Table
          dataSource={data.consultationSamples || []}
          rowKey="name" // simple key
          pagination={false}
          size="small"
          bordered
          columns={[
            { title: '样品名称', dataIndex: 'name' },
            { title: '规格型号', dataIndex: 'model' },
            { title: '材质', dataIndex: 'material' },
            { title: '数量', dataIndex: 'quantity' },
            { title: '备注', dataIndex: 'remark' },
          ]}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
          {relevantItems.map((item, index) => (
            <div key={index}>
              <span style={{ color: '#666', fontSize: 12 }}>{item.label}：</span>
              <span style={{ marginLeft: 8 }}>{item.value || '-'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
