// @file: 业务咨询登记页面
// @input: /api/consultation, /api/client
// @output: 咨询CRUD、生成报价
// @pos: 委托流程入口页 - 客户首次咨询
// ⚠️ 更新我时，请同步更新本注释及 entrustment/_INDEX.md

'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Space, Modal, Form, Input, Select, DatePicker, message, Drawer, Row, Col, InputNumber, Divider, Tabs, Upload, Image } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, FileTextOutlined, CloseCircleOutlined, TeamOutlined, SyncOutlined, PaperClipOutlined } from '@ant-design/icons'
import { StatusTag } from '@/components/StatusTag'
import UserSelect from '@/components/UserSelect'
import SampleTestItemTable, { SampleTestItemData } from '@/components/SampleTestItemTable'
import ConsultationAssessmentModal from '@/components/ConsultationAssessmentModal'
import ReassessmentModal from '@/components/ReassessmentModal'
import AssessmentResultTab from '@/components/AssessmentResultTab'
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

interface Attachment {
  id: string
  originalName: string
  fileName: string
  fileSize: number
  mimeType: string
  fileUrl: string
  uploadedAt: string
  uploadedBy?: string
}

interface Consultation {
  id: string
  consultationNo: string
  clientId?: string
  client?: Client
  clientContactPerson?: string
  estimatedQuantity?: string | null
  testItems?: string[]
  expectedDeadline?: string | null
  budgetRange?: string | null
  feasibility?: string | null
  feasibilityNote?: string | null
  follower?: string | null
  status: string
  createdAt: string
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

  // 样品检测项
  const [sampleTestItems, setSampleTestItems] = useState<SampleTestItemData[]>([])

  // 评估相关状态
  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false)
  const [reassessmentModalOpen, setReassessmentModalOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  // 附件上传相关
  const [fileList, setFileList] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)

  // 获取客户列表
  const fetchClients = async () => {
    setClientsLoading(true)
    try {
      const res = await fetch('/api/entrustment/client?status=approved&pageSize=1000')
      const json = await res.json()
      setClients(json.list || [])
    } catch (error) {
      message.error('获取客户列表失败')
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
      message.error('获取检测项目列表失败')
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
    fetchCurrentUser()
  }, [page])

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me')
      const json = await res.json()
      if (json.success && json.data) {
        setCurrentUser(json.data)
      }
    } catch (error) {
      console.error('获取当前用户信息失败:', error)
    }
  }

  const handleAdd = () => {
    setEditingId(null)
    setSampleTestItems([])
    setFileList([])
    form.resetFields()
    setModalOpen(true)
  }

  const handleEdit = async (record: Consultation) => {
    setEditingId(record.id)

    // 加载样品检测项数据
    try {
      const res = await fetch(`/api/sample-test-item?bizType=consultation&bizId=${record.id}`)
      const json = await res.json()
      if (json.success && json.data) {
        const loadedItems = json.data.map((item: any) => ({
          ...item,
          key: item.id || `temp_${Date.now()}_${Math.random()}`,
        }))
        setSampleTestItems(loadedItems)
      } else {
        setSampleTestItems([])
      }
    } catch (error) {
      message.error('加载样品检测项失败')
      setSampleTestItems([])
    }

    // 加载附件数据
    try {
      const res = await fetch(`/api/consultation/${record.id}`)
      const json = await res.json()
      if (json.success && json.data && json.data.attachments) {
        const loadedFiles = json.data.attachments.map((att: Attachment) => ({
          uid: att.id,
          name: att.originalName,
          status: 'done',
          url: att.fileUrl,
          response: att,
        }))
        setFileList(loadedFiles)
      } else {
        setFileList([])
      }
    } catch (error) {
      message.error('加载附件失败')
      setFileList([])
    }

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
    setCurrentConsultation(record)
    setViewDrawerOpen(true)
  }

  const handleDelete = async (record: Consultation) => {
    let title = '确认删除'
    let content = '确定要删除这条咨询记录吗？'
    let okType: 'danger' | 'primary' = 'primary'

    if (record.status === 'quoted') {
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

    // 提取附件信息
    const attachments = fileList
      .filter(file => file.status === 'done' && file.response)
      .map(file => file.response)

    const submitData = {
      ...values,
      expectedDeadline: values.expectedDeadline ? values.expectedDeadline.toISOString() : null,
      attachments: attachments,
      // 直接包含样品检测项数据
      sampleTestItems: sampleTestItems,
    }

    let consultationId = editingId

    if (editingId) {
      await fetch(`/api/consultation/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      })
      message.success('更新成功')
    } else {
      const res = await fetch('/api/consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      })
      const json = await res.json()
      consultationId = json.data?.id || json.id
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

  // 附件上传前验证
  const beforeUpload = (file: File) => {
    const validTypes = [
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]

    if (!validTypes.includes(file.type)) {
      message.error('只能上传图片、PDF或Office文档！')
      return false
    }

    const isLt5M = file.size / 1024 / 1024 < 5
    if (!isLt5M) {
      message.error('文件大小不能超过5MB！')
      return false
    }

    return true
  }

  // 文件上传变化处理
  const handleUploadChange = ({ fileList: newFileList }: any) => {
    setFileList(newFileList)
  }

  // 文件删除处理
  const handleRemove = async (file: any) => {
    if (file.response && editingId) {
      try {
        await fetch(`/api/upload/consultation/${file.response.id}?consultationId=${editingId}`, {
          method: 'DELETE',
        })
      } catch (error) {
        console.error('删除文件失败:', error)
      }
    }
    return true
  }

  // 打开生成报价单弹窗
  const handleOpenGenerateQuote = () => {
    if (selectedRows.length !== 1) {
      message.warning('请选择一条咨询记录')
      return
    }
    const consultation = selectedRows[0]

    // 初始化样品数据（从样品检测项获取）
    let initSamples: any[] = []
    if (sampleTestItems.length > 0) {
      initSamples = sampleTestItems.map(item => ({
        name: item.sampleName,
        model: '',
        material: item.material,
        quantity: item.quantity,
        remark: ''
      }))
    }
    setQuoteSamples(initSamples)

    const items = (consultation.testItems || []).map(item => {
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
        samples: quoteSamples,
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

    // 复制样品检测项数据到报价单
    if (json.id) {
      await fetch('/api/sample-test-item/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceBizType: 'consultation',
          sourceBizId: values.consultationId,
          targetBizType: 'quotation',
          targetBizId: json.id,
        })
      })
    }

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
    // 初始化样品数据（从样品检测项获取）
    let initSamples: any[] = []
    if (sampleTestItems.length > 0) {
      initSamples = sampleTestItems.map(item => ({
        name: item.sampleName,
        model: '',
        material: item.material,
        quantity: item.quantity,
        remark: ''
      }))
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

  // 发起评估
  const handleStartAssessment = (consultation: Consultation) => {
    setCurrentConsultation(consultation)
    setAssessmentModalOpen(true)
  }

  // 重新评估
  const handleReassessment = (consultation: Consultation) => {
    setCurrentConsultation(consultation)
    setReassessmentModalOpen(true)
  }

  // 关闭咨询单
  const handleCloseConsultation = async (consultation: Consultation) => {
    Modal.confirm({
      title: '确认关闭咨询单',
      content: `确定要关闭咨询单 ${consultation.consultationNo} 吗？关闭后将无法继续评估。`,
      onOk: async () => {
        try {
          const res = await fetch(`/api/consultation/${consultation.id}/close`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
          const json = await res.json()
          if (json.success) {
            message.success('咨询单已关闭')
            fetchData()
          } else {
            message.error(json.error?.message || '关闭失败')
          }
        } catch (error) {
          console.error('关闭咨询单失败:', error)
          message.error('关闭失败')
        }
      }
    })
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
      width: 350,
      render: (_, record) => (
        <Space size="small" style={{ whiteSpace: 'nowrap' }}>
          {record.status === 'following' && (
            <Button
              size="small"
              icon={<TeamOutlined />}
              onClick={() => handleStartAssessment(record)}
            >
              发起评估
            </Button>
          )}
          {record.status === 'assessment_failed' && (
            <>
              <Button
                size="small"
                icon={<SyncOutlined />}
                onClick={() => handleReassessment(record)}
              >
                重新评估
              </Button>
              <Button
                size="small"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => handleCloseConsultation(record)}
              >
                关闭
              </Button>
            </>
          )}
          <Button size="small" icon={<FileTextOutlined />} onClick={() => handleOpenGenerateQuoteForRecord(record)}>生成报价单</Button>
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

  return (
    <div>
      {contextHolder}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>业务咨询</h2>
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

          {/* 样品检测项表格 */}
          <div style={{ marginBottom: 16 }}>
            <SampleTestItemTable
              bizType="consultation"
              bizId={editingId || undefined}
              value={sampleTestItems}
              onChange={setSampleTestItems}
              showAssessment={true}
            />
          </div>

          <Form.Item name="testItems" label="检测项目（多选）" style={{ display: 'none' }}>
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

          <Form.Item
            label="附件上传"
            extra="支持图片、PDF、Word、Excel，单个文件最大5MB，最多5个文件"
          >
            <Upload
              action="/api/upload/consultation"
              listType="picture"
              fileList={fileList}
              maxCount={5}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              beforeUpload={beforeUpload}
              onChange={handleUploadChange}
              onRemove={handleRemove}
            >
              <Button icon={<PlusOutlined />}>上传附件</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      {/* 查看详情抽屉 */}
      <Drawer
        title="咨询详情"
        placement="right"
        width={800}
        open={viewDrawerOpen}
        onClose={() => setViewDrawerOpen(false)}
      >
        {currentConsultation && (
          <Tabs
            defaultActiveKey="basic"
            items={[
              {
                key: 'basic',
                label: '基本信息',
                children: (
                  <div>
                    <Descriptions title="基本信息" data={currentConsultation} />
                    <Divider />
                    <Descriptions title="其他信息" data={currentConsultation} />
                  </div>
                )
              },
              {
                key: 'assessment',
                label: '评估结果',
                children: (
                  <AssessmentResultTab
                    consultationId={currentConsultation.id}
                    consultationNo={currentConsultation.consultationNo}
                    currentUserId={currentUser?.id}
                  />
                )
              }
            ]}
          />
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

      {/* 发起评估弹窗 */}
      <ConsultationAssessmentModal
        open={assessmentModalOpen}
        consultationId={currentConsultation?.id || null}
        consultationNo={currentConsultation?.consultationNo}
        onCancel={() => {
          setAssessmentModalOpen(false)
          setCurrentConsultation(null)
        }}
        onSuccess={() => {
          setAssessmentModalOpen(false)
          setCurrentConsultation(null)
          fetchData()
          message.success('评估已发起')
        }}
      />

      {/* 重新评估弹窗 */}
      <ReassessmentModal
        open={reassessmentModalOpen}
        consultationId={currentConsultation?.id || null}
        consultationNo={currentConsultation?.consultationNo}
        currentRequirement={currentConsultation?.clientRequirement}
        onCancel={() => {
          setReassessmentModalOpen(false)
          setCurrentConsultation(null)
        }}
        onSuccess={() => {
          setReassessmentModalOpen(false)
          setCurrentConsultation(null)
          fetchData()
        }}
      />
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
    ? items.slice(0, 6)
    : title === '其他信息'
      ? items.slice(6)
      : []

  return (
    <div>
      <h4 style={{ marginBottom: 16 }}>{title}</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
        {relevantItems.map((item, index) => (
          <div key={index}>
            <span style={{ color: '#666', fontSize: 12 }}>{item.label}：</span>
            <span style={{ marginLeft: 8 }}>{item.value || '-'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
