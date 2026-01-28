// @file: 检测报价管理页面
// @input: /api/quotation, /api/consultation, /api/client
// @output: 报价CRUD、提交审批、生成PDF、生成合同
// @pos: 委托流程核心页 - 咨询后生成报价
// ⚠️ 更新我时，请同步更新本注释及 entrustment/_INDEX.md

'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Space, Modal, Form, Input, InputNumber, Select, DatePicker, message, Drawer, Tag, Row, Col, Divider, Popconfirm, Tabs, Descriptions, Card, Radio, Upload } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, CheckOutlined, CloseOutlined, SendOutlined, FilePdfOutlined, FolderOutlined, FileAddOutlined, MessageOutlined, UploadOutlined, FileTextOutlined } from '@ant-design/icons'
import { StatusTag } from '@/components/StatusTag'
import { ApprovalTimeline } from '@/components/ApprovalTimeline'
import UserSelect from '@/components/UserSelect'
import SampleTestItemTable, { SampleTestItemData } from '@/components/SampleTestItemTable'
import { RejectModal } from '@/components/RejectModal'
import { CreateEntrustmentButton } from '@/components/CreateEntrustmentButton'
import { QuotationPDFButton } from '@/components/QuotationPDFButton'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface Client {
  id: string
  name: string
  shortName?: string
  contact?: string
  phone?: string
  email?: string
  address?: string
}

interface QuotationItem {
  id?: string
  serviceItem: string
  methodStandard: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface QuotationApproval {
  id: string
  level: number
  role: string
  approver: string
  action: string
  comment?: string
  timestamp: string
}

interface Quotation {
  id: string
  quotationNo: string
  consultationNo?: string | null
  clientId?: string
  client?: Client
  clientContactPerson?: string
  consultationId?: string | null
  quotationDate: string
  validDays: number
  totalAmount: number
  taxRate: number
  taxAmount: number
  totalWithTax: number
  discountAmount?: number
  discountReason?: string | null
  finalAmount: number
  paymentTerms?: string | null
  deliveryTerms?: string | null
  remark?: string | null
  clientResponse?: string | null
  status: string
  createdAt: string
  items?: QuotationItem[]
  approvals?: QuotationApproval[]
}

const STATUS_OPTIONS = [
  { value: 'draft', label: '草稿' },
  { value: 'pending_sales', label: '待销售审批' },
  { value: 'pending_finance', label: '待财务审批' },
  { value: 'pending_lab', label: '待实验室审批' },
  { value: 'approved', label: '已批准' },
  { value: 'rejected', label: '已拒绝' },
  { value: 'archived', label: '已归档' },
]

const CLIENT_RESPONSE_OPTIONS = [
  { value: 'pending', label: '待反馈' },
  { value: 'ok', label: '接受' },
  { value: 'ng', label: '拒绝' },
]

interface TestTemplate {
  id: string
  name: string
  method?: string
  unit?: string
  schema?: any
}


export default function QuotationPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [data, setData] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false)
  const [approvalModalOpen, setApprovalModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [currentQuotation, setCurrentQuotation] = useState<Quotation | null>(null)
  const [items, setItems] = useState<QuotationItem[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [clientsLoading, setClientsLoading] = useState(false)
  const [testTemplates, setTestTemplates] = useState<TestTemplate[]>([])
  const [form] = Form.useForm()
  const [approvalForm] = Form.useForm()
  const [filters, setFilters] = useState<any>({})

  // 行选择
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [selectedRows, setSelectedRows] = useState<Quotation[]>([])

  // 新功能弹窗
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const [contractModalOpen, setContractModalOpen] = useState(false)
  const [feedbackForm] = Form.useForm()
  const [contractForm] = Form.useForm()

  // 🆕 新功能：驳回对话框状态
  const [rejectModalVisible, setRejectModalVisible] = useState(false)
  const [selectedQuotationForReject, setSelectedQuotationForReject] = useState<Quotation | null>(null)



  const [contractSamples, setContractSamples] = useState<any[]>([])

  // 样品检测项（新）
  const [sampleTestItems, setSampleTestItems] = useState<SampleTestItemData[]>([])
  const [contractSampleTestItems, setContractSampleTestItems] = useState<SampleTestItemData[]>([])

  // 样品操作
  const handleAddSample = () => {
    setSamples([...samples, { name: '', quantity: 1 }])
  }

  const handleUpdateSample = (index: number, field: string, value: any) => {
    const newSamples = [...samples]
    newSamples[index] = { ...newSamples[index], [field]: value }
    setSamples(newSamples)
  }

  const handleRemoveSample = (index: number) => {
    setSamples(samples.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items]
    const item = { ...newItems[index] }
    // @ts-ignore - 动态字段更新
    item[field] = value
    // 重新计算小计
    item.totalPrice = (item.quantity || 1) * (item.unitPrice || 0)
    newItems[index] = item
    setItems(newItems)
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  // 明细项表格列定义
  const itemColumns: ColumnsType<QuotationItem> = [
    {
      title: '检测项目',
      dataIndex: 'serviceItem',
      width: 150,
      render: (value, record, index) => (
        <Select
          showSearch
          optionFilterProp="label"
          options={testTemplates.map(t => ({ value: t.name, label: t.name, method: t.method || '' }))}
          value={value || undefined}
          onChange={(val, option) => {
            updateItem(index, 'serviceItem', val)
            const method = (option as any)?.method || ''
            if (method) {
              updateItem(index, 'methodStandard', method)
            }
          }}
          style={{ width: '100%' }}
          placeholder="选择检测项目"
        />
      ),
    },
    {
      title: '方法/标准',
      dataIndex: 'methodStandard',
      width: 180,
      render: (value, record, index) => (
        <Input
          value={value}
          onChange={(e) => updateItem(index, 'methodStandard', e.target.value)}
          placeholder="如：GB/T 228.1-2021"
        />
      ),
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      width: 80,
      render: (value, record, index) => (
        <InputNumber
          min={1}
          value={value}
          onChange={(val) => updateItem(index, 'quantity', val || 1)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: '单价(元)',
      dataIndex: 'unitPrice',
      width: 100,
      render: (value, record, index) => (
        <InputNumber
          min={0}
          precision={2}
          value={value}
          onChange={(val) => updateItem(index, 'unitPrice', val || 0)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: '小计(元)',
      dataIndex: 'totalPrice',
      width: 100,
      render: (value) => `¥${Number(value || 0).toFixed(2)}`,
    },
    {
      title: '操作',
      width: 60,
      render: (_, record, index) => (
        <Button
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeItem(index)}
        />
      ),
    },
  ]

  // 获取客户列表（仅已审批通过）
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
      const templates = json.list || []
      setTestTemplates(templates)
    } catch (error) {
      console.error('获取检测项目列表失败:', error)
    }
  }

  const [contractItems, setContractItems] = useState<any[]>([])


  const updateContractItem = (index: number, field: string, value: any) => {
    const newItems = [...contractItems]
    const item = { ...newItems[index] }
    // @ts-ignore
    item[field] = value
    item.totalPrice = (item.quantity || 1) * (item.unitPrice || 0)
    newItems[index] = item
    setContractItems(newItems)

    // 自动计算合同总额
    const total = newItems.reduce((sum, i) => sum + (i.totalPrice || 0), 0)
    contractForm.setFieldsValue({ amount: total })

    // Recalculate prepayment amount
    const ratio = contractForm.getFieldValue('prepaymentRatio') || 0
    contractForm.setFieldsValue({
      prepaymentAmount: total ? (total * ratio / 100) : 0
    })
  }

  const removeContractItem = (index: number) => {
    const newItems = contractItems.filter((_, i) => i !== index)
    setContractItems(newItems)
    const total = newItems.reduce((sum, i) => sum + (i.totalPrice || 0), 0)
    contractForm.setFieldsValue({ amount: total })

    // Recalculate prepayment amount
    const ratio = contractForm.getFieldValue('prepaymentRatio') || 0
    contractForm.setFieldsValue({
      prepaymentAmount: total ? (total * ratio / 100) : 0
    })
  }

  const handleAddContractItem = () => {
    setContractItems([...contractItems, { serviceItem: '', methodStandard: '', quantity: 1, unitPrice: 0, totalPrice: 0 }])
  }



  const fetchData = async (p = page, f = filters) => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(p),
      pageSize: '10',
      ...Object.fromEntries(Object.entries(f).filter(([_, v]) => v !== undefined && v !== '')),
    })
    const res = await fetch(`/api/quotation?${params}`)
    const json = await res.json()
    if (json.success && json.data) {
      setData(json.data.list || [])
      setTotal(json.data.total || 0)
    } else {
      if (json.success && json.data) {
        setData(json.data.list || [])
        setTotal(json.data.total || 0)
      } else {
        setData(json.list || [])
        setTotal(json.total || 0)
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
    fetchClients()
    fetchTestTemplates()
  }, [page])

  // ... inside component ...

  const handleAdd = () => {
    setEditingId(null)
    setItems([{ serviceItem: '', methodStandard: '', quantity: 1, unitPrice: 0, totalPrice: 0 }])
    setSampleTestItems([]) // 清空样品检测项
    form.resetFields()
    form.setFieldsValue({
      quotationDate: dayjs(),
      validDays: 30,
      taxRate: 0.06,
    })
    setModalOpen(true)
  }

  const handleEdit = async (record: Quotation) => {
    setEditingId(record.id)
    const safeItems = (record.items || []).map(item => ({
      ...item,
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      totalPrice: Number(item.totalPrice) || 0,
    }))
    setItems(safeItems)

    // 加载样品检测项数据
    try {
      const res = await fetch(`/api/sample-test-item?bizType=quotation&bizId=${record.id}`)
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
      console.error('加载样品检测项失败:', error)
      setSampleTestItems([])
    }

    const formData = {
      ...record,
      clientId: record.clientId || record.client?.id,
      quotationDate: dayjs(record.quotationDate),
      clientReportDeadline: record.clientReportDeadline ? dayjs(record.clientReportDeadline) : null,
      discountAmount: Number((record as any).discountAmount) || 0,
    }
    form.setFieldsValue(formData)
    setModalOpen(true)
  }

  // ... handleView, handleDelete ...

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const submitData = {
      ...values,
      quotationDate: values.quotationDate.toISOString(),
      clientReportDeadline: values.clientReportDeadline?.toISOString() || null,
      items,
      finalAmount: form.getFieldValue('finalAmount'),
    }

    let quotationId = editingId

    if (editingId) {
      await fetch(`/api/quotation/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      })
      message.success('更新成功')
    } else {
      const res = await fetch('/api/quotation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      })
      const json = await res.json()
      quotationId = json.id
      message.success('创建成功')
    }

    // 保存样品检测项数据
    if (quotationId) {
      try {
        const res = await fetch('/api/sample-test-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bizType: 'quotation',
            bizId: quotationId,
            items: sampleTestItems,
          })
        })
        if (!res.ok) {
          const json = await res.json()
          message.error(`保存样品检测项失败: ${json.error?.message || '未知错误'}`)
          return // 不关闭弹窗
        }
      } catch (error) {
        message.error('保存样品检测项失败，请重试')
        return // 不关闭弹窗
      }
    }

    setModalOpen(false)
    fetchData()
  }

  const handleView = (record: Quotation) => {
    setCurrentQuotation(record)
    setViewDrawerOpen(true)
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/quotation/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (res.ok && json.success) {
      message.success('删除成功')
      fetchData()
    } else {
      message.error(json.error?.message || '删除失败')
    }
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

  const handleAddItem = () => {
    setItems([...items, { serviceItem: '', methodStandard: '', quantity: 1, unitPrice: 0, totalPrice: 0 }])
  }

  const handleApproval = async () => {
    const values = await approvalForm.validateFields()
    // 自动附加当前用户作为审批人
    const submitData = {
      ...values,
      approver: session?.user?.id,
      submitterName: session?.user?.name || session?.user?.email || '未知用户'
    }

    const res = await fetch(`/api/quotation/${currentQuotation!.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submitData),
    })

    if (res.ok) {
      message.success('审批提交成功')
      setApprovalModalOpen(false)
      fetchData()
      setViewDrawerOpen(false)
    } else {
      const error = await res.json()
      message.error(error.message || '审批失败')
    }
  }

  const handleClientResponse = async (response: string) => {
    await fetch(`/api/quotation/${currentQuotation!.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientResponse: response }),
    })
    message.success('客户反馈更新成功')
    fetchData()
    setViewDrawerOpen(false)
  }

  // ===== 新功能处理函数 =====

  // 提交审批
  const handleSubmitApproval = async () => {
    if (selectedRows.length !== 1) {
      message.warning('请选择一条记录')
      return
    }

    // 检查用户登录状态
    if (!session?.user?.id) {
      message.error('无法获取用户信息，请刷新页面或重新登录')
      return
    }

    const quotation = selectedRows[0]
    if (quotation.status !== 'draft') {
      message.warning('只有草稿状态可以提交审批')
      return
    }
    const res = await fetch(`/api/quotation/${quotation.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'submit',
        approver: session.user.id,
        submitterName: session.user.name || session.user.email || '未知用户',
        comment: ''
      }),
    })
    if (res.ok) {
      message.success('已提交审批')
      setSelectedRowKeys([])
      setSelectedRows([])
      fetchData()
    } else {
      const error = await res.json()
      message.error(error.message || '提交失败')
    }
  }

  // 生成PDF
  const handleGeneratePDF = () => {
    if (selectedRows.length !== 1) {
      message.warning('请选择一条记录')
      return
    }
    window.open(`/api/quotation/${selectedRows[0].id}/pdf`, '_blank')
  }

  // 归档
  const handleArchive = async () => {
    if (selectedRows.length === 0) {
      message.warning('请选择记录')
      return
    }
    // 检查状态，只有已批准或已拒绝的可以归档
    const invalidRows = selectedRows.filter(row => !['approved', 'rejected'].includes(row.status))
    if (invalidRows.length > 0) {
      const invalidNos = invalidRows.map(r => r.quotationNo).join(', ')
      message.warning(`以下报价单无法归档：${invalidNos}。当前仅支持“已批准”或“已拒绝”状态的单据进行归档。`)
      return
    }

    try {
      for (const row of selectedRows) {
        const res = await fetch(`/api/quotation/${row.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'archived' }),
        })
        if (!res.ok) {
          const error = await res.json()
          message.error(error.message || `归档失败: ${row.quotationNo}`)
          return
        }
      }
      message.success('已归档')
      setSelectedRowKeys([])
      setSelectedRows([])
      fetchData()
    } catch (error) {
      message.error('归档失败，请重试')
      console.error('Archive error:', error)
    }
  }

  // 打开客户反馈弹窗
  const handleOpenFeedback = () => {
    if (selectedRows.length !== 1) {
      message.warning('请选择一条记录')
      return
    }
    feedbackForm.resetFields()
    setFeedbackModalOpen(true)
  }

  // 提交客户反馈
  const handleFeedbackSubmit = async () => {
    const values = await feedbackForm.validateFields()
    await fetch(`/api/quotation/${selectedRows[0].id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientResponse: values.clientResponse,
        status: values.clientResponse === 'ok' ? 'archived' : 'rejected',
      }),
    })
    message.success('客户反馈已保存')
    setFeedbackModalOpen(false)
    setSelectedRowKeys([])
    setSelectedRows([])
    fetchData()
  }

  // 打开生成合同弹窗
  const handleOpenContract = () => {
    if (selectedRows.length !== 1) {
      message.warning('请选择一条报价单')
      return
    }
    const quotation = selectedRows[0]
    if (quotation.status !== 'approved') {
      message.warning('只有已批准的报价单可以生成合同')
      return
    }
    contractForm.resetFields()
    contractForm.setFieldsValue({
      quotationId: quotation.id,
      quotationNo: quotation.quotationNo,
      clientName: quotation.client?.name,
      clientContact: quotation.clientContactPerson,
      clientPhone: quotation.client?.phone,
      clientAddress: quotation.client?.address,
      sampleName: quotation.sampleName,
      amount: quotation.finalAmount,
      contractName: `${quotation.sampleName || '检测'}委托合同`,
      signDate: dayjs(),
      startDate: dayjs(),
      endDate: dayjs().add(1, 'year'),
      prepaymentRatio: 30,
      prepaymentAmount: quotation.finalAmount ? (quotation.finalAmount * 30 / 100) : 0,
    })

    // 初始化合同明细
    setContractItems(quotation.items?.map(item => ({
      serviceItem: item.serviceItem,
      methodStandard: item.methodStandard,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    })) || [])

    // 初始化合同样品
    let initSamples: any[] = []
    if (quotation.quotationSamples && quotation.quotationSamples.length > 0) {
      initSamples = quotation.quotationSamples.map(s => ({
        name: s.name,
        model: s.model,
        material: s.material,
        quantity: s.quantity,
        remark: s.remark
      }))
    } else if (quotation.sampleName) {
      initSamples = [{
        name: quotation.sampleName,
        model: quotation.sampleModel,
        material: quotation.sampleMaterial,
        quantity: quotation.sampleQuantity || 1
      }]
    }
    setContractSamples(initSamples)

    setContractModalOpen(true)
  }

  // 合同样品操作
  const handleAddContractSample = () => {
    setContractSamples([...contractSamples, { name: '', quantity: 1 }])
  }

  const handleUpdateContractSample = (index: number, field: string, value: any) => {
    const newSamples = [...contractSamples]
    newSamples[index] = { ...newSamples[index], [field]: value }
    setContractSamples(newSamples)
  }

  const handleRemoveContractSample = (index: number) => {
    setContractSamples(contractSamples.filter((_, i) => i !== index))
  }

  // 提交生成合同
  const handleContractSubmit = async () => {
    const values = await contractForm.validateFields()
    const contractData = {
      clientId: selectedRows[0].clientId || selectedRows[0].client?.id, // 关键：添加 clientId
      quotationId: values.quotationId,
      contractName: values.contractName,
      clientName: values.clientName,
      clientContact: values.clientContact,
      clientPhone: values.clientPhone,
      clientAddress: values.clientAddress,
      amount: values.amount,
      prepaymentRatio: values.prepaymentRatio,
      prepaymentAmount: values.prepaymentAmount,
      signDate: values.signDate?.toISOString(),
      startDate: values.startDate?.toISOString(),
      endDate: values.endDate?.toISOString(),
      paymentTerms: values.paymentTerms,
      deliveryTerms: values.deliveryTerms,
      items: contractItems,
      samples: contractSamples,
    }
    const res = await fetch('/api/contract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contractData),
    })
    const json = await res.json()
    if (res.ok && (json.success || json.id)) {
      // 复制样品检测项数据到合同
      if (json.id) {
        await fetch('/api/sample-test-item/copy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceBizType: 'quotation',
            sourceBizId: values.quotationId,
            targetBizType: 'contract',
            targetBizId: json.id,
          })
        })
      }

      message.success(`合同创建成功`)
      setContractModalOpen(false)
      router.push('/entrustment/contract')
    } else {
      message.error(json.error?.message || '创建合同失败')
    }
  }

  // 计算金额
  const totalAmount = items.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0)
  const taxAmount = totalAmount * 0.06
  const totalWithTax = totalAmount + taxAmount
  const discountAmount = Number(form.getFieldValue('discountAmount')) || 0
  const finalAmount = totalWithTax - discountAmount

  // 针对单条记录的处理函数
  const handleSubmitApprovalForRecord = async (record: Quotation) => {
    if (!session?.user?.id) {
      message.error('无法获取用户信息，请刷新页面或重新登录')
      return
    }
    if (record.status !== 'draft') {
      message.warning('只有草稿状态可以提交审批')
      return
    }
    const res = await fetch(`/api/quotation/${record.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'submit',
        approver: session.user.id,
        submitterName: session.user.name || session.user.email || '未知用户',
        comment: ''
      }),
    })
    if (res.ok) {
      message.success('已提交审批')
      fetchData()
    } else {
      const error = await res.json()
      message.error(error.message || '提交失败')
    }
  }

  const handleGeneratePDFForRecord = (record: Quotation) => {
    window.open(`/api/quotation/${record.id}/pdf`, '_blank')
  }

  const handleOpenContractForRecord = (record: Quotation) => {
    if (record.status !== 'approved') {
      message.warning('只有已批准的报价单可以生成合同')
      return
    }
    contractForm.resetFields()
    contractForm.setFieldsValue({
      quotationId: record.id,
      quotationNo: record.quotationNo,
      clientName: record.client?.name,
      clientContact: record.clientContactPerson,
      clientPhone: record.client?.phone,
      clientAddress: record.client?.address,
      sampleName: record.sampleName,
      amount: record.finalAmount,
      contractName: `${record.sampleName || '检测'}委托合同`,
      signDate: dayjs(),
      startDate: dayjs(),
      endDate: dayjs().add(1, 'year'),
      prepaymentRatio: 30,
      prepaymentAmount: record.finalAmount ? (record.finalAmount * 30 / 100) : 0,
    })
    // 设置合同明细
    const cItems = (record.items || []).map(item => ({
      serviceItem: item.serviceItem,
      methodStandard: item.methodStandard,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    }))
    setContractItems(cItems)
    // 设置样品
    let samples: any[] = []
    if (record.quotationSamples && record.quotationSamples.length > 0) {
      samples = record.quotationSamples.map(s => ({
        name: s.name,
        model: s.model,
        material: s.material,
        quantity: s.quantity,
      }))
    } else if (record.sampleName) {
      samples = [{
        name: record.sampleName,
        model: record.sampleModel,
        material: record.sampleMaterial,
        quantity: record.sampleQuantity || 1,
      }]
    }
    setContractSamples(samples)
    setContractModalOpen(true)
  }

  const columns: ColumnsType<Quotation> = [
    { title: '报价单号', dataIndex: 'quotationNo', width: 150 },
    {
      title: '咨询单号',
      dataIndex: 'consultationNo',
      width: 140,
      render: (no: string) => no ? (
        <a
          style={{ color: '#1890ff' }}
          onClick={() => router.push(`/entrustment/consultation?id=${no}`)}
        >
          {no}
        </a>
      ) : '-'
    },
    {
      title: '客户名称',
      dataIndex: 'client',
      ellipsis: true,
      render: (client: Client) => client?.name || '-'
    },
    {
      title: '报价金额',
      dataIndex: 'finalAmount',
      width: 120,
      render: (v) => v ? `¥${Number(v).toFixed(2)}` : '-',
    },
    {
      title: '客户反馈',
      dataIndex: 'clientResponse',
      width: 100,
      render: (r: string) => <StatusTag type="quotation_client" status={r} />,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (s: string) => <StatusTag type="quotation" status={s} />,
    },
    {
      title: '报告时间',
      dataIndex: 'clientReportDeadline',
      width: 120,
      render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD') : '-',
    },
    {
      title: '创建日期',
      dataIndex: 'createdAt',
      width: 160,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm:ss'),
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
      render: (_, record) => {
        const canAudit = (
          (record.status === 'pending_sales' && session?.user?.roles?.includes('sales_manager')) ||
          (record.status === 'pending_finance' && session?.user?.roles?.includes('finance')) ||
          (record.status === 'pending_lab' && session?.user?.roles?.includes('lab_director'))
        )

        // 判断是否为审批中状态（任意pending状态）
        const isPending = record.status.startsWith('pending_') || record.status === 'pending'

        return (
          <Space size="small" style={{ whiteSpace: 'nowrap' }}>
            {/* 业务按钮（带文字） */}
            {record.status === 'draft' && (
              <Button size="small" icon={<SendOutlined />} onClick={() => handleSubmitApprovalForRecord(record)}>提交审批</Button>
            )}
            {canAudit && (
              <Button type="primary" size="small" onClick={() => {
                setCurrentQuotation(record)
                approvalForm.resetFields()
                setApprovalModalOpen(true)
              }}>审核</Button>
            )}

            {/* 🆕 新功能：生成委托单按钮（只对approved状态） */}
            <CreateEntrustmentButton
              quotationId={record.id}
              quotationStatus={record.status}
              onSuccess={() => {
                message.success('委托单创建成功')
                fetchData()
              }}
              buttonText="生成委托单"
              icon={<FileTextOutlined />}
            />

            {/* 🆕 新功能：PDF打印按钮（带状态控制，替换原来的生成PDF按钮） */}
            <QuotationPDFButton
              quotationId={record.id}
              quotationStatus={record.status}
              buttonType="default"
              size="small"
              showLabel={true}
            />

            {/* 🆕 新功能：驳回按钮（只对pending状态） */}
            {isPending && (
              <Button
                size="small"
                danger
                onClick={() => {
                  setSelectedQuotationForReject(record)
                  setRejectModalVisible(true)
                }}
              >
                驳回
              </Button>
            )}

            {record.status === 'approved' && (
              <Button size="small" icon={<FolderOutlined />} onClick={() => handleOpenContractForRecord(record)}>生成合同</Button>
            )}

            {/* 通用按钮（仅图标） */}
            <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record)} />
            <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} disabled={record.status !== 'draft'} />
            <Popconfirm title="确认删除" onConfirm={() => handleDelete(record.id)} disabled={record.status !== 'draft'}>
              <Button size="small" danger icon={<DeleteOutlined />} disabled={record.status !== 'draft'} />
            </Popconfirm>
          </Space>
        )
      },
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>报价管理</h2>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增报价</Button>
        </Space>
      </div>

      {/* 筛选条件 */}
      <div style={{ background: '#f5f5f5', padding: 16, marginBottom: 16, borderRadius: 4 }}>
        <Form layout="inline" onFinish={(values) => { setFilters(values); setPage(1); fetchData(1, values) }}>
          <Form.Item name="keyword" label="关键词">
            <Input placeholder="报价单号/客户/联系人" allowClear />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select placeholder="全部" allowClear style={{ width: 140 }}>
              {STATUS_OPTIONS.map(opt => (
                <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="clientResponse" label="客户反馈">
            <Select placeholder="全部" allowClear style={{ width: 120 }}>
              {CLIENT_RESPONSE_OPTIONS.map(opt => (
                <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
              ))}
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
        scroll={{ x: 1300 }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys, rows) => {
            setSelectedRowKeys(keys)
            setSelectedRows(rows)
          },
        }}
        pagination={{ current: page, total, pageSize: 10, onChange: setPage, showSizeChanger: false }}
      />

      {/* 新增/编辑模态框 */}
      <Modal
        title={editingId ? '编辑报价' : '新增报价'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={1000}
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
                <Input placeholder="请输入联系人" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="clientReportDeadline" label="客户报告截止日期">
                <DatePicker style={{ width: '100%' }} placeholder="选择报告截止日期" />
              </Form.Item>
            </Col>
            <Col span={12}>
              {/* 预留空间，可以放其他字段 */}
            </Col>
          </Row>

          {/* 新的样品检测项表格 */}
          <div style={{ marginTop: 16 }}>
            <SampleTestItemTable
              bizType="quotation"
              bizId={editingId || undefined}
              value={sampleTestItems}
              onChange={setSampleTestItems}
            />
          </div>

          <Divider orientationMargin="0">报价明细</Divider>

          <Table
            columns={itemColumns}
            dataSource={items}
            rowKey={(record, index) => record.id || `item-${index}`}
            pagination={false}
            size="small"
            footer={() => (
              <Button type="dashed" onClick={handleAddItem} block icon={<PlusOutlined />}>
                添加明细项
              </Button>
            )}
          />

          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Space direction="vertical" style={{ width: 300 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>报价合计：</span>
                <span>¥{totalAmount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>税额（6%）：</span>
                <span>¥{taxAmount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>含税合计：</span>
                <span>¥{totalWithTax.toFixed(2)}</span>
              </div>
              <Form.Item name="discountAmount" label="优惠金额" style={{ marginBottom: 8 }}>
                <InputNumber
                  min={0}
                  precision={2}
                  placeholder="请输入优惠金额"
                  style={{ width: '100%' }}
                  prefix="¥"
                />
              </Form.Item>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 'bold' }}>
                <span>最终金额：</span>
                <span style={{ color: '#f5222d' }}>¥{finalAmount.toFixed(2)}</span>
              </div>
            </Space>
          </div>

          <Divider orientationMargin="0">其他信息</Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="quotationDate" label="报价日期" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="validDays" label="有效期（天）">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="paymentTerms" label="付款方式">
                <Input placeholder="如：预付50%" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="deliveryTerms" label="交付方式">
                <Input placeholder="如：检测完成后3个工作日内出具报告" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="follower" label="跟单人">
                <UserSelect placeholder="请选择跟单人" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              {editingId && (
                <Form.Item name="status" label="状态">
                  <Select options={STATUS_OPTIONS} />
                </Form.Item>
              )}
            </Col>
          </Row>

          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 查看详情抽屉 */}
      <Drawer
        title="报价详情"
        placement="right"
        width={700}
        open={viewDrawerOpen}
        onClose={() => setViewDrawerOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              {currentQuotation?.status === 'approved' && (
                <>
                  <Button onClick={() => handleClientResponse('ok')}>客户接受</Button>
                  <Button danger onClick={() => handleClientResponse('ng')}>客户拒绝</Button>
                </>
              )}
              {(currentQuotation?.status === 'draft' || currentQuotation?.status === 'pending_sales') && (
                <Button type="primary" onClick={() => { setViewDrawerOpen(false); setApprovalModalOpen(true) }}>
                  提交审批
                </Button>
              )}
            </Space>
            <Button onClick={() => setViewDrawerOpen(false)}>关闭</Button>
          </div>
        }
      >
        {currentQuotation && (
          <Tabs
            items={[
              {
                key: 'detail',
                label: '基本信息',
                children: (
                  <div>
                    <Descriptions column={2} bordered size="small">
                      <Descriptions.Item label="报价单号">{currentQuotation.quotationNo}</Descriptions.Item>
                      <Descriptions.Item label="客户名称">{currentQuotation.client?.name || '-'}</Descriptions.Item>
                      <Descriptions.Item label="联系人">{currentQuotation.clientContactPerson || '-'}</Descriptions.Item>
                      <Descriptions.Item label="联系电话">{currentQuotation.client?.phone || '-'}</Descriptions.Item>
                      <Descriptions.Item label="客户邮箱">{currentQuotation.client?.email || '-'}</Descriptions.Item>
                      <Descriptions.Item label="客户地址">{currentQuotation.client?.address || '-'}</Descriptions.Item>
                      <Descriptions.Item label="创建日期">
                        {dayjs(currentQuotation.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                      </Descriptions.Item>
                      <Descriptions.Item label="有效期">{currentQuotation.validDays}天</Descriptions.Item>
                      <Descriptions.Item label="报价合计">¥{Number(currentQuotation.totalAmount || 0).toFixed(2)}</Descriptions.Item>
                      <Descriptions.Item label="税额">¥{Number(currentQuotation.taxAmount || 0).toFixed(2)}</Descriptions.Item>
                      <Descriptions.Item label="含税合计">¥{Number(currentQuotation.totalWithTax || 0).toFixed(2)}</Descriptions.Item>
                      <Descriptions.Item label="优惠金额">
                        {currentQuotation.discountAmount ? `¥${currentQuotation.discountAmount}` : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="最终金额" style={{ fontWeight: 'bold', color: '#f5222d' }}>
                        ¥{Number(currentQuotation.finalAmount || 0).toFixed(2)}
                      </Descriptions.Item>
                      <Descriptions.Item label="状态">
                        <StatusTag type="quotation" status={currentQuotation.status} />
                      </Descriptions.Item>
                      <Descriptions.Item label="客户反馈">
                        <StatusTag type="quotation_client" status={currentQuotation.clientResponse} />
                      </Descriptions.Item>
                    </Descriptions>

                    <Divider orientationMargin="0">报价明细</Divider>
                    <Table
                      columns={[
                        { title: '检测项目', dataIndex: 'serviceItem' },
                        { title: '方法/标准', dataIndex: 'methodStandard' },
                        { title: '数量', dataIndex: 'quantity' },
                        { title: '单价', dataIndex: 'unitPrice', render: (v) => `¥${v}` },
                        { title: '小计', dataIndex: 'totalPrice', render: (v) => `¥${Number(v || 0).toFixed(2)}` },
                      ]}
                      dataSource={currentQuotation.items}
                      rowKey="id"
                      pagination={false}
                      size="small"
                    />

                    {currentQuotation.paymentTerms && (
                      <>
                        <Divider orientationMargin="0">付款与交付</Divider>
                        <p><strong>付款方式：</strong>{currentQuotation.paymentTerms}</p>
                        {currentQuotation.deliveryTerms && <p><strong>交付方式：</strong>{currentQuotation.deliveryTerms}</p>}
                      </>
                    )}

                    {currentQuotation.remark && (
                      <>
                        <Divider orientationMargin="0">备注</Divider>
                        <p>{currentQuotation.remark}</p>
                      </>
                    )}
                  </div>
                ),
              },
              {
                key: 'approval',
                label: '审批记录',
                children: (
                  <div>
                    <ApprovalTimeline
                      nodes={[
                        { step: 1, name: '销售审批', role: '销售经理' },
                        { step: 2, name: '财务审批', role: '财务经理' }
                      ]}
                      currentStep={
                        currentQuotation.status === 'pending_sales' ? 1
                          : currentQuotation.status === 'pending_finance' ? 2
                            : currentQuotation.status === 'approved' ? 3
                              : 1 // fallback
                      }
                      status={
                        currentQuotation.status === 'approved' ? 'approved'
                          : currentQuotation.status === 'rejected' ? 'rejected'
                            : 'pending'
                      }
                      submitterName={currentQuotation.approvals?.find(r => r.role === 'submitter')?.approver || '申请人'}
                      submittedAt={currentQuotation.createdAt}
                      records={currentQuotation.approvals?.filter(r => r.role !== 'submitter').map(r => ({
                        id: r.id,
                        step: r.level,
                        action: r.action as 'approve' | 'reject',
                        approverId: '', // not available in frontend model
                        approverName: r.approver,
                        comment: r.comment,
                        createdAt: r.timestamp
                      }))}
                    />
                  </div>
                ),
              },
            ]}
          />
        )}
      </Drawer>

      {/* 审批模态框 */}
      {/* 审批模态框 */}
      <Modal
        title="审批"
        open={approvalModalOpen}
        onOk={handleApproval}
        onCancel={() => setApprovalModalOpen(false)}
      >
        <Form form={approvalForm} layout="vertical">
          <Form.Item name="action" label="审批结果" rules={[{ required: true }]} initialValue="approve">
            <Radio.Group>
              <Radio value="approve">通过</Radio>
              <Radio value="reject">拒绝</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="comment" label="审批意见">
            <Input.TextArea rows={4} placeholder="请输入审批意见" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 客户反馈弹窗 */}
      <Modal
        title="客户反馈处理"
        open={feedbackModalOpen}
        onOk={handleFeedbackSubmit}
        onCancel={() => setFeedbackModalOpen(false)}
      >
        <Form form={feedbackForm} layout="vertical">
          <Form.Item
            name="clientResponse"
            label="反馈结果"
            rules={[{ required: true, message: '请选择反馈结果' }]}
          >
            <Radio.Group>
              <Radio value="ok">客户确认OK</Radio>
              <Radio value="ng">客户拒绝(NG)</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="attachmentUrl" label="上传盖章合同">
            <Upload maxCount={1} accept=".pdf,.jpg,.png">
              <Button icon={<UploadOutlined />}>选择合同文件</Button>
            </Upload>
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
              支持PDF、JPG、PNG格式，文件大小不超过10MB
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* 生成合同弹窗 */}
      <Modal
        title="生成委托合同"
        open={contractModalOpen}
        onOk={handleContractSubmit}
        onCancel={() => setContractModalOpen(false)}
        width={900}
        okText="生成"
      >
        <Form form={contractForm} layout="vertical">
          <Form.Item name="quotationId" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="quotationNo" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="clientName" hidden>
            <Input />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="contractName" label="合同名称" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="clientContact" label="联系人" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="clientPhone" label="联系电话" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="clientAddress" label="客户地址">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientationMargin="0">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>报价明细</span>
              <Button type="dashed" size="small" onClick={handleAddContractItem} icon={<PlusOutlined />}>添加项目</Button>
            </div>
          </Divider>

          <Table
            dataSource={contractItems}
            rowKey={(record, index) => index!.toString()}
            pagination={false}
            size="small"
            columns={[
              {
                title: '检测项目',
                dataIndex: 'serviceItem',
                render: (text, record, index) => (
                  <Select
                    showSearch
                    optionFilterProp="label"
                    style={{ width: '100%' }}
                    value={text}
                    onChange={(val, option) => {
                      updateContractItem(index, 'serviceItem', val)
                      const method = (option as any)?.method
                      if (method) updateContractItem(index, 'methodStandard', method)
                    }}
                    options={testTemplates.map(t => ({
                      value: t.name,
                      label: t.name,
                      method: t.schema ? (JSON.parse(typeof t.schema === 'string' ? t.schema : JSON.stringify(t.schema)).header?.methodBasis || t.method) : t.method
                    }))}
                  />
                )
              },
              {
                title: '方法/标准',
                dataIndex: 'methodStandard',
                render: (text, record, index) => (
                  <Input value={text} onChange={e => updateContractItem(index, 'methodStandard', e.target.value)} />
                )
              },
              {
                title: '数量',
                dataIndex: 'quantity',
                width: 80,
                render: (val, record, index) => (
                  <InputNumber min={1} value={val} onChange={v => updateContractItem(index, 'quantity', v)} />
                )
              },
              {
                title: '单价',
                dataIndex: 'unitPrice',
                width: 100,
                render: (val, record, index) => (
                  <InputNumber min={0} value={val} prefix="¥" onChange={v => updateContractItem(index, 'unitPrice', v)} />
                )
              },
              {
                title: '总价',
                dataIndex: 'totalPrice',
                width: 100,
                render: (val) => `¥${Number(val || 0).toFixed(2)}`
              },
              {
                title: '操作',
                width: 60,
                render: (_, record, index) => (
                  <Button danger type="text" icon={<DeleteOutlined />} onClick={() => removeContractItem(index)} />
                )
              }
            ]}
          />

          <Divider orientationMargin="0">合同基本信息</Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="amount" label="合同金额" rules={[{ required: true, message: '请输入合同金额' }]}>
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  prefix="¥"
                  placeholder="请输入合同金额"
                  onChange={(val) => {
                    const ratio = contractForm.getFieldValue('prepaymentRatio') || 0
                    contractForm.setFieldsValue({
                      prepaymentAmount: val ? (val * ratio / 100) : 0,
                    })
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="prepaymentRatio" label="预付款比例（%）">
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={100}
                  placeholder="30"
                  onChange={(val) => {
                    const amount = contractForm.getFieldValue('amount')
                    if (amount) {
                      contractForm.setFieldsValue({
                        prepaymentAmount: amount * (val || 0) / 100,
                      })
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="prepaymentAmount" label="预付款金额">
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  precision={2}
                  prefix="¥"
                  placeholder="自动计算"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="signDate" label="签订日期" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="startDate" label="合同开始日期" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="endDate" label="合同结束日期" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientationMargin="0">合同条款（可选）</Divider>

          <Form.Item name="paymentTerms" label="付款条款">
            <Input.TextArea rows={2} placeholder="留空使用默认条款" />
          </Form.Item>
          <Form.Item name="deliveryTerms" label="交付条款">
            <Input.TextArea rows={2} placeholder="留空使用默认条款" />
          </Form.Item>


        </Form>
      </Modal>

      {/* 🆕 新功能：驳回对话框 */}
      <RejectModal
        visible={rejectModalVisible}
        documentId={selectedQuotationForReject?.id || ''}
        documentType="quotation"
        onSuccess={() => {
          fetchData()
          setSelectedQuotationForReject(null)
        }}
        onCancel={() => {
          setRejectModalVisible(false)
          setSelectedQuotationForReject(null)
        }}
      />
    </div>
  )
}
