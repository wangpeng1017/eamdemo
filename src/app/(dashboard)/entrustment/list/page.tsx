// @file: 检测委托单管理页面
// @input: /api/entrustment, /api/contract, /api/user, /api/device
// @output: 委托单CRUD、分配任务、分包、生成外部链接
// @pos: 委托流程末端页 - 合同签订后创建委托单
// ⚠️ 更新我时，请同步更新本注释及 entrustment/_INDEX.md

'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { showSuccess, showError } from '@/lib/confirm'
import { Table, Button, Space, Modal, Form, Input, InputNumber, DatePicker, Select, message, Row, Col, Divider, Popconfirm, Tag, Radio, Drawer, Tabs, Descriptions } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, MinusCircleOutlined, TeamOutlined, ShareAltOutlined, EyeOutlined, ArrowLeftOutlined, PrinterOutlined } from '@ant-design/icons'
import EntrustmentPrint from '@/components/business/EntrustmentPrint'
import type { PrintData } from '@/components/business/EntrustmentPrint'
import { StatusTag } from '@/components/StatusTag'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { exportToExcel } from '@/hooks/useExport'
import { copyToClipboard } from '@/lib/utils/format'
import { useRouter, useSearchParams } from 'next/navigation'
import type { User, Device, Supplier, Client, Contract } from '@prisma/client'

// 类型定义
interface EntrustmentProject {
  id: string
  // ... existing EntrustmentProject ...
  name: string
  testItems: string[] | null
  method: string | null
  standard: string | null
  status: string
  assignTo: string | null
  subcontractor: string | null
  subcontractAssignee: string | null
  deviceId: string | null
  deadline: string | null
}

interface Sample {
  id: string
  sampleNo: string
  name: string
  type: string | null
  specification: string | null
  material: string | null
  quantity: string | null
  status: string
}

interface Entrustment {
  id: string
  entrustmentNo: string
  contractNo: string | null
  clientId: string | null
  clientName: string | null
  contactPerson: string | null
  sampleDate: string | null
  followerId: string | null
  followerUser?: { id: string; name: string } | null
  sampleName: string | null
  sampleModel: string | null
  sampleMaterial: string | null
  sampleQuantity: number | null
  isSampleReturn: boolean
  sourceType: string | null
  status: string
  createdAt: string
  projects: EntrustmentProject[]
  samples: Sample[]
  client?: {
    id?: string
    name?: string
    phone?: string
    contact?: string
  }
  contract?: {
    id: string
    contractNo: string
    contractName: string | null
    partyACompany: string | null
    clientReportDeadline: string | null
    sampleName?: string | null
    sampleModel?: string | null
    sampleMaterial?: string | null
    sampleQuantity?: number | null
  }
  quotation?: {
    id: string
    quotationNo: string
    clientReportDeadline: string | null
    followerId: string | null
    followerUser?: { id: string; name: string } | null
    items?: QuotationItem[]
  }
}
// The original Device, Supplier, Client, Contract interfaces are now replaced by Prisma types.
// interface Device {
//   id: string
//   name: string
//   deviceNo: string
// }

// interface Supplier {
//   id: string
//   name: string
//   code: string
// }

// interface Client {
//   id: string
//   name: string
//   shortName: string | null
//   contact: string | null
// }

interface Quotation {
  id: string
  quotationNo: string
  clientReportDeadline: string | null
  followerId: string | null
  followerUser?: { id: string; name: string } | null
  items?: QuotationItem[]
}

interface QuotationItem {
  sampleName: string | null
  serviceItem: string
}

// The original Contract interface is now replaced by Prisma type.
// interface Contract {
//   id: string
//   contractNo: string
//   contractName: string | null
//   partyACompany: string | null
//   clientId?: string
//   clientContact?: string
//   salesPerson?: string
//   sampleName?: string
//   sampleModel?: string
//   sampleMaterial?: string
//   sampleQuantity?: number
//   contractSamples?: { name: string; model?: string; material?: string; quantity: number; remark?: string }[]
// }

export default function EntrustmentListPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // 引入 useMessage 钩子
  const [messageApi, contextHolder] = message.useMessage()
  const [modal, modalContextHolder] = Modal.useModal() // 补充 Modal 的 Hook

  // 本地封装提示函数，确保 Context 正确
  const showSuccessMsg = (content: string) => messageApi.success(content)
  const showErrorMsg = (content: string) => messageApi.error(content)

  // 基础状态
  const [data, setData] = useState<Entrustment[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [generatingLink, setGeneratingLink] = useState<string | null>(null)
  const [printData, setPrintData] = useState<PrintData | null>(null)
  const [showPrint, setShowPrint] = useState(false)
  const printRef = React.useRef<HTMLDivElement>(null)

  // 查看抽屉状态
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false)
  const [currentEntrustment, setCurrentEntrustment] = useState<Entrustment | null>(null)

  // 行选择
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [selectedRows, setSelectedRows] = useState<Entrustment[]>([])

  // 分配弹窗状态
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [subcontractModalOpen, setSubcontractModalOpen] = useState(false)
  const [currentProject, setCurrentProject] = useState<{ entrustmentId: string; project: EntrustmentProject } | null>(null)
  const [assignForm] = Form.useForm()
  const [subcontractForm] = Form.useForm()

  // 下拉选项数据
  const [users, setUsers] = useState<User[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [testTemplates, setTestTemplates] = useState<any[]>([])

  // 展开行控制
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([])

  // 获取委托单列表
  // 获取样品名称：优先从 Sample 表，否则从 Contract/Quotation
  const getSampleName = () => {
    if (!currentEntrustment) return '-'
    if (currentEntrustment.samples && currentEntrustment.samples.length > 0) {
      return currentEntrustment.samples.map(s => s.name).join(', ')
    }
    if (currentEntrustment.contract?.sampleName) {
      return currentEntrustment.contract.sampleName
    }
    if (currentEntrustment.quotation?.items && currentEntrustment.quotation.items.length > 0) {
      const names = currentEntrustment.quotation.items.map(item => item.sampleName).filter(Boolean)
      return names.length > 0 ? names.join(', ') : '-'
    }
    return '-'
  }


  const getSampleModel = () => {
    if (!currentEntrustment) return '-'
    if (currentEntrustment.samples && currentEntrustment.samples.length > 0) {
      return currentEntrustment.samples.map(s => s.specification || '-').join(', ')
    }
    if (currentEntrustment.contract?.sampleModel) {
      return currentEntrustment.contract.sampleModel
    }
    return '-'
  }


  const getSampleMaterial = () => {
    if (!currentEntrustment) return '-'
    if (currentEntrustment.samples && currentEntrustment.samples.length > 0) {
      return currentEntrustment.samples.map(s => s.material || '-').join(', ')
    }
    if (currentEntrustment.contract?.sampleMaterial) {
      return currentEntrustment.contract.sampleMaterial
    }
    return '-'
  }


  const getSampleQuantity = () => {
    if (!currentEntrustment) return '-'
    if (currentEntrustment.samples && currentEntrustment.samples.length > 0) {
      return currentEntrustment.samples.map(s => s.quantity || '-').join(', ')
    }
    if (currentEntrustment.contract?.sampleQuantity) {
      return currentEntrustment.contract.sampleQuantity.toString()
    }
    return '-'
  }


  const fetchData = async (p = page) => {
    setLoading(true)
    const res = await fetch(`/api/entrustment?page=${p}&pageSize=10`)
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

  // 获取下拉选项数据
  const fetchOptions = async () => {
    const [usersRes, devicesRes, suppliersRes, clientsRes, contractsRes, templatesRes] = await Promise.all([
      fetch('/api/user?pageSize=1000'),
      fetch('/api/device/list?pageSize=1000'),
      fetch('/api/supplier?pageSize=1000'),
      fetch('/api/client?pageSize=1000'),
      fetch('/api/contract?pageSize=1000'),
      fetch('/api/test-template?pageSize=1000'),
    ])
    const [usersJson, devicesJson, suppliersJson, clientsJson, contractsJson, templatesJson] = await Promise.all([
      usersRes.json(),
      devicesRes.json(),
      suppliersRes.json(),
      clientsRes.json(),
      contractsRes.json(),
      templatesRes.json(),
    ])

    const getUsers = (json: any) => (json.success && json.data?.list) || json.list || []

    setUsers(getUsers(usersJson))
    setDevices(getUsers(devicesJson))
    setSuppliers(getUsers(suppliersJson))
    setClients(getUsers(clientsJson))
    setContracts(getUsers(contractsJson))
    setTestTemplates(getUsers(templatesJson))
  }

  useEffect(() => {
    fetchData()
    fetchOptions()
  }, [page])

  useEffect(() => {
    const contractNo = searchParams.get('contractNo')
    const clientName = searchParams.get('clientName')

    if (contractNo || clientName) {
      const params = new URLSearchParams(searchParams.toString())
      router.replace(`/entrustment/list/create?${params.toString()}`)
    }
  }, [searchParams])

  // 新增委托单
  const handleAdd = () => {
    router.push('/entrustment/list/create')
  }

  // 查看委托单
  const handleView = (record: Entrustment) => {
    setCurrentEntrustment(record)
    setViewDrawerOpen(true)
  }

  // 编辑委托单
  const handleEdit = (record: Entrustment) => {
    router.push(`/entrustment/list/edit/${record.id}`)
  }

  // 删除委托单
  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/entrustment/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (res.ok && json.success) {
      showSuccessMsg('删除成功')
      fetchData()
    } else {
      showErrorMsg(json.error?.message || '删除失败')
    }
  }

  // 打印委托单
  const handlePrint = async (record: Entrustment) => {
    try {
      // 获取完整委托单数据（含 sampleTestItem）
      const [entRes, testRes] = await Promise.all([
        fetch(`/api/entrustment/${record.id}`),
        fetch(`/api/sample-test-item?bizType=entrustment&bizId=${record.id}`),
      ])
      const entJson = await entRes.json()
      const testJson = await testRes.json()
      const ent = entJson.data || entJson
      const testItems = testJson.data || []

      const pd: PrintData = {
        entrustmentNo: ent.entrustmentNo,
        clientName: ent.clientName || ent.client?.name || '',
        contactPerson: ent.contactPerson || '',
        contactPhone: ent.contactPhone || ent.client?.phone || '',
        contactFax: ent.contactFax || '',
        contactEmail: ent.contactEmail || '',
        clientAddress: ent.clientAddress || '',
        invoiceTitle: ent.invoiceTitle || '',
        taxId: ent.taxId || '',
        serviceScope: ent.serviceScope || '',
        reportLanguage: ent.reportLanguage || 'cn',
        urgencyLevel: ent.urgencyLevel || 'normal',
        reportCopies: ent.reportCopies || 1,
        reportDelivery: ent.reportDelivery || '',
        acceptSubcontract: ent.acceptSubcontract !== false,
        isSampleReturn: ent.isSampleReturn || false,
        testType: ent.testType || '',
        oemFactory: ent.oemFactory || '',
        sampleDeliveryMethod: ent.sampleDeliveryMethod || '',
        specialRequirements: ent.specialRequirements || '',
        samples: (ent.samples || []).map((s: any) => ({
          name: s.name || '',
          partNo: s.partNo || '',
          material: s.material || '',
          color: s.color || '',
          weight: s.weight || '',
          supplier: s.supplier || '',
          oem: s.oem || '',
          quantity: s.quantity || 1,
          sampleCondition: s.sampleCondition || '',
          remark: s.remark || '',
        })),
        componentTests: testItems.filter((t: any) => t.testCategory !== 'material'),
        materialTests: testItems.filter((t: any) => t.testCategory === 'material'),
      }

      setPrintData(pd)
      setShowPrint(true)

      // 延迟后触发打印
      setTimeout(() => {
        window.print()
      }, 500)
    } catch (e) {
      console.error('打印准备失败:', e)
      showErrorMsg('准备打印数据失败')
    }
  }

  const handleGenerateExternalLink = async (record: Entrustment) => {
    setGeneratingLink(record.id)
    try {
      const res = await fetch(`/api/entrustment/${record.id}/external-link`, {
        method: 'POST',
      })
      const json = await res.json()
      if (res.ok && json.success) {
        const link = json.data.link

        // 尝试复制，但无论成功与否都弹窗展示，确保用户能看到链接
        const success = await copyToClipboard(link)
        if (success) {
          showSuccessMsg('外部链接已生成并复制到剪贴板')
        }

        // 使用 Modal 展示链接，解决 HTTP 环境下无法复制的问题，并提供明确反馈
        modal.success({
          title: '外部链接生成成功',
          content: (
            <div>
              <p>链接地址：</p>
              <Input.TextArea value={link} readOnly autoSize={{ minRows: 2, maxRows: 6 }} />
              <p style={{ marginTop: 8, color: '#999', fontSize: 12 }}>如果未自动复制，请手动复制上方链接。</p>
            </div>
          ),
          okText: '关闭',
          width: 500,
          centered: true
        })

      } else {
        showErrorMsg(json.error?.message || '生成外部链接失败')
      }
    } catch (e) {
      console.error('生成外部链接异常:', e)
      showErrorMsg('生成外部链接失败')
    } finally {
      setGeneratingLink(null)
    }
  }

  // 打开分配弹窗
  const handleAssign = (entrustmentId: string, project: EntrustmentProject) => {
    setCurrentProject({ entrustmentId, project })
    assignForm.resetFields()
    // 回显已有数据
    if (project.status === 'assigned') {
      assignForm.setFieldsValue({
        assignTo: project.assignTo,
        deviceId: project.deviceId,
        deadline: project.deadline ? dayjs(project.deadline) : undefined
      })
    }
    setAssignModalOpen(true)
  }

  // 打开分包弹窗
  const handleSubcontract = (entrustmentId: string, project: EntrustmentProject) => {
    setCurrentProject({ entrustmentId, project })
    subcontractForm.resetFields()
    if (project.status === 'subcontracted') {
      subcontractForm.setFieldsValue({
        subcontractor: project.subcontractor,
        subcontractAssignee: project.subcontractAssignee,
        deadline: project.deadline ? dayjs(project.deadline) : undefined
      })
    }
    setSubcontractModalOpen(true)
  }

  // 提交分配
  const handleAssignSubmit = async () => {
    if (!currentProject) return
    try {
      const values = await assignForm.validateFields()
      const res = await fetch(`/api/entrustment/${currentProject.entrustmentId}/projects/${currentProject.project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'assigned',
          ...values,
          deadline: values.deadline ? values.deadline.format('YYYY-MM-DD') : null
        })
      })
      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess('任务分配成功')
        setAssignModalOpen(false)
        fetchData()
      } else {
        showError(json.error?.message || '分配失败')
      }
    } catch (e) {
      console.error(e)
    }
  }

  // 提交分包
  const handleSubcontractSubmit = async () => {
    if (!currentProject) return
    try {
      const values = await subcontractForm.validateFields()
      const res = await fetch(`/api/entrustment/${currentProject.entrustmentId}/projects/${currentProject.project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'subcontracted',
          ...values,
          deadline: values.deadline ? values.deadline.format('YYYY-MM-DD') : null
        })
      })
      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess('分包成功')
        setSubcontractModalOpen(false)
        fetchData()
      } else {
        showError(json.error?.message || '分包失败')
      }
    } catch (e) {
      console.error(e)
    }
  }


  // 检测项目子表格列
  const projectColumns: ColumnsType<EntrustmentProject> = [
    { title: '项目名称', dataIndex: 'name', width: 150 },
    {
      title: '检测项目',
      dataIndex: 'testItems',
      width: 200,
      render: (items: string | string[] | null) => {
        if (!items) return '-'
        try {
          const arr = typeof items === 'string' ? JSON.parse(items) : items
          return Array.isArray(arr) ? arr.join(', ') : '-'
        } catch {
          return typeof items === 'string' ? items : '-'
        }
      }
    },
    { title: '检测方法', dataIndex: 'method', width: 150 },
    { title: '判定标准', dataIndex: 'standard', width: 150 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s: string, record: EntrustmentProject) => {
        if (s === 'assigned') {
          return <Tag color="processing">已分配: {record.assignTo}</Tag>
        }
        if (s === 'subcontracted') {
          return <Tag color="warning">已分包: {record.subcontractor}</Tag>
        }
        return <StatusTag type="project" status={s} />
      }
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      render: (_, record) => {
        // 从父级获取 entrustmentId
        const entrustment = data.find(d => d.projects?.some(p => p.id === record.id))
        if (!entrustment) return null

        return (
          <Space size="small" style={{ whiteSpace: 'nowrap' }}>
            <Button
              size="small"
              type="link"
              icon={<TeamOutlined />}
              disabled={record.status === 'completed' || record.status === 'subcontracted'}
              onClick={() => handleAssign(entrustment.id, record)}
            >
              {record.status === 'assigned' ? '重新分配' : '分配'}
            </Button>
            <Button
              size="small"
              type="link"
              icon={<ShareAltOutlined />}
              disabled={record.status === 'completed' || record.status === 'assigned'}
              onClick={() => handleSubcontract(entrustment.id, record)}
            >
              {record.status === 'subcontracted' ? '重新分包' : '分包'}
            </Button>
          </Space>
        )
      }
    }
  ]

  // 展开行渲染
  const expandedRowRender = (record: Entrustment) => {
    return (
      <Table
        rowKey="id"
        columns={projectColumns}
        dataSource={record.projects || []}
        pagination={false}
        size="small"
        style={{ margin: '0 -8px' }}
      />
    )
  }

  // 主表格列
  const columns: ColumnsType<Entrustment> = [
    {
      title: '委托编号',
      dataIndex: 'entrustmentNo',
      width: 150,
      render: (no: string) => <a style={{ color: '#1890ff' }}>{no}</a>
    },
    {
      title: '报价单号',
      dataIndex: 'quotation',
      width: 150,
      render: (quotation: any) => quotation ? (
        <a
          style={{ color: '#1890ff', cursor: 'pointer' }}
          onClick={() => router.push(`/entrustment/quotation?keyword=${encodeURIComponent(quotation.quotationNo)}`)}
        >
          {quotation.quotationNo}
        </a>
      ) : '-'
    },
    {
      title: '委托单位',
      dataIndex: 'clientName',
      width: 150,
      ellipsis: true,
      render: (text, record) => record.client?.name || text || '-'
    },
    {
      title: '样品名称',
      dataIndex: 'samples',
      width: 120,
      ellipsis: true,
      render: (samples: Sample[]) => {
        if (!samples || samples.length === 0) return '-'
        return samples.map(s => s.name).join(', ')
      }
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD HH:mm:ss') : '-'
    },
    {
      title: '报告时间',
      dataIndex: 'clientReportDeadline',
      width: 120,
      render: (t: string) => {
        if (!t) return '-'
        const deadline = dayjs(t)
        const now = dayjs()
        const daysUntil = deadline.diff(now, 'day')

        let color = '#52c41a' // 绿色 - 正常
        if (daysUntil < 0) color = '#f5222d' // 红色 - 过期
        else if (daysUntil <= 7) color = '#fa8c16' // 橙色 - 7天内

        return <span style={{ color, fontWeight: daysUntil < 0 ? 'bold' : 'normal' }}>{deadline.format('YYYY-MM-DD')}</span>
      },
    },
    {
      title: '检测项目',
      dataIndex: 'projects',
      width: 100,
      render: (projects: EntrustmentProject[], record: Entrustment) => (
        <a
          style={{ color: '#1890ff' }}
          onClick={() => {
            if (expandedRowKeys.includes(record.id)) {
              setExpandedRowKeys(expandedRowKeys.filter(k => k !== record.id))
            } else {
              setExpandedRowKeys([...expandedRowKeys, record.id])
            }
          }}
        >
          {projects?.length || 0}个项目
        </a>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: string) => <StatusTag type="entrustment" status={s} />
    },
    { title: '跟单人', dataIndex: ['followerUser', 'name'], width: 80 },
    {
      title: '关联合同',
      dataIndex: 'contractNo',
      width: 140,
      render: (no: string) => no ? (
        <a
          style={{ color: '#1890ff', cursor: 'pointer' }}
          onClick={() => router.push(`/entrustment/contract?keyword=${encodeURIComponent(no)}`)}
        >
          {no}
        </a>
      ) : '-'
    },
    {
      title: '联系人/电话',
      width: 140,
      render: (_, record) => (
        <div>
          <div>{record.contactPerson || '-'}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{record.client?.phone || '-'}</div>
        </div>
      )
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      onCell: () => ({ style: { whiteSpace: 'nowrap' as const } }),
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' as const } }),
      render: (_: any, record: Entrustment) => (
        <Space size="small" style={{ whiteSpace: 'nowrap' }}>
          {/* 业务按钮（带文字） */}
          {record.status === 'pending' && (
            <Button
              size="small"
              icon={<ShareAltOutlined />}
              onClick={() => handleGenerateExternalLink(record)}
              loading={generatingLink === record.id}
            >
              生成外部链接
            </Button>
          )}
          {/* 通用按钮（仅图标） */}
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record)} />
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Button size="small" icon={<PrinterOutlined />} onClick={() => handlePrint(record)} title="打印" />
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div>
      {contextHolder}
      {modalContextHolder}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>检测委托单管理</h2>
        <Space style={{ whiteSpace: 'nowrap' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新建委托</Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        scroll={{ x: 1650 }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys, rows) => {
            setSelectedRowKeys(keys)
            setSelectedRows(rows as Entrustment[])
          },
        }}
        expandable={{
          expandedRowRender,
          expandedRowKeys,
          onExpandedRowsChange: (keys) => setExpandedRowKeys(keys as string[]),
          expandRowByClick: false,
        }}
        pagination={{
          current: page,
          total,
          pageSize: 10,
          onChange: setPage,
          showSizeChanger: false,
        }}
      />

      {/* 查看抽屉 */}
      <Drawer
        title="委托单详情"
        placement="right"
        width={800}
        open={viewDrawerOpen}
        onClose={() => setViewDrawerOpen(false)}
      >
        {currentEntrustment && (
          <Tabs
            defaultActiveKey="basic"
            items={[
              {
                key: 'basic',
                label: '基本信息',
                children: (
                  <div>
                    <Descriptions title="委托信息" column={2} bordered size="small">
                      <Descriptions.Item label="委托编号">{currentEntrustment.entrustmentNo}</Descriptions.Item>
                      <Descriptions.Item label="合同编号">{currentEntrustment.contractNo || '-'}</Descriptions.Item>
                      <Descriptions.Item label="报价单号">{(currentEntrustment as any).quotationNo || '-'}</Descriptions.Item>
                      <Descriptions.Item label="委托单位">
                        {currentEntrustment.client?.name || currentEntrustment.clientName || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="联系人">{currentEntrustment.contactPerson || '-'}</Descriptions.Item>
                      <Descriptions.Item label="联系电话">{(currentEntrustment as any).contactPhone || currentEntrustment.client?.phone || '-'}</Descriptions.Item>
                      <Descriptions.Item label="联系邮箱">{(currentEntrustment as any).contactEmail || '-'}</Descriptions.Item>
                      <Descriptions.Item label="客户地址">{(currentEntrustment as any).clientAddress || '-'}</Descriptions.Item>
                      <Descriptions.Item label="跟单人">{currentEntrustment.followerUser?.name || '-'}</Descriptions.Item>
                      <Descriptions.Item label="报告截止日期">
                        {(currentEntrustment as any).clientReportDeadline ? dayjs((currentEntrustment as any).clientReportDeadline).format('YYYY-MM-DD') : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="状态">
                        <StatusTag type="entrustment" status={currentEntrustment.status} />
                      </Descriptions.Item>
                      <Descriptions.Item label="来源类型">{currentEntrustment.sourceType || '-'}</Descriptions.Item>
                      <Descriptions.Item label="创建时间">
                        {dayjs(currentEntrustment.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                      </Descriptions.Item>
                    </Descriptions>

                    <Divider />

                    <Descriptions title="服务信息" column={2} bordered size="small">
                      <Descriptions.Item label="认证范围">{(currentEntrustment as any).serviceScope || '-'}</Descriptions.Item>
                      <Descriptions.Item label="紧急程度">
                        {{
                          normal: '常规',
                          express: '加急',
                          double: '特急',
                          urgent: '紧急',
                        }[(currentEntrustment as any).urgencyLevel as string] || (currentEntrustment as any).urgencyLevel || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="报告语言">
                        {{
                          cn: '中文',
                          en: '英文',
                          cn_en: '中英文',
                        }[(currentEntrustment as any).reportLanguage as string] || (currentEntrustment as any).reportLanguage || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="报告份数">{(currentEntrustment as any).reportCopies || 1}</Descriptions.Item>
                      <Descriptions.Item label="报告交付方式">
                        {{
                          courier: '快递',
                          electronic: '电子版',
                          pickup: '自取',
                        }[(currentEntrustment as any).reportDelivery as string] || (currentEntrustment as any).reportDelivery || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="接受分包">{(currentEntrustment as any).acceptSubcontract !== false ? '是' : '否'}</Descriptions.Item>
                    </Descriptions>

                    <Divider />

                    <Descriptions title="样品信息" column={2} bordered size="small">
                      <Descriptions.Item label="样品名称">
                        {getSampleName()}
                      </Descriptions.Item>
                      <Descriptions.Item label="样品型号">
                        {getSampleModel()}
                      </Descriptions.Item>
                      <Descriptions.Item label="样品材质">
                        {getSampleMaterial()}
                      </Descriptions.Item>
                      <Descriptions.Item label="样品数量">
                        {getSampleQuantity()}
                      </Descriptions.Item>
                      <Descriptions.Item label="样品退回">
                        {currentEntrustment.isSampleReturn ? '是' : '否'}
                      </Descriptions.Item>
                      <Descriptions.Item label="到样日期">
                        {currentEntrustment.sampleDate ? dayjs(currentEntrustment.sampleDate).format('YYYY-MM-DD') : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="送样方式">
                        {{
                          customer: '客户送样',
                          logistics: '物流邮寄',
                          agency: '代理取样',
                          other: '其他',
                        }[(currentEntrustment as any).sampleDeliveryMethod as string] || (currentEntrustment as any).sampleDeliveryMethod || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="试验类型">
                        {{
                          DV: 'DV试验',
                          PV: 'PV试验',
                          DV_PV: 'DV+PV试验',
                          pilot: '中试',
                          annual: '年度检测',
                        }[(currentEntrustment as any).testType as string] || (currentEntrustment as any).testType || '-'}
                      </Descriptions.Item>
                    </Descriptions>

                    {(currentEntrustment as any).specialRequirements && (
                      <>
                        <Divider />
                        <Descriptions title="特殊要求" column={1} bordered size="small">
                          <Descriptions.Item label="特殊要求">{(currentEntrustment as any).specialRequirements}</Descriptions.Item>
                        </Descriptions>
                      </>
                    )}
                  </div>
                )
              },
              {
                key: 'projects',
                label: '检测项目',
                children: (
                  <Table
                    rowKey="id"
                    columns={projectColumns}
                    dataSource={currentEntrustment.projects || []}
                    pagination={false}
                    size="small"
                  />
                )
              }
            ]}
          />
        )}
      </Drawer>

      {/* 分配弹窗 */}
      <Modal
        title="分配检测任务"
        open={assignModalOpen}
        onOk={handleAssignSubmit}
        onCancel={() => setAssignModalOpen(false)}
        width={500}
      >
        <Form form={assignForm} layout="vertical">
          <Form.Item name="assignTo" label="检测人员" rules={[{ required: true, message: '请选择检测人员' }]}>
            <Select
              showSearch
              placeholder="选择检测人员"
              optionFilterProp="label"
              options={users.map(u => ({ value: u.name, label: u.name }))}
            />
          </Form.Item>
          <Form.Item name="deadline" label="截止日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 分包弹窗 */}
      <Modal
        title="外包分配"
        open={subcontractModalOpen}
        onOk={handleSubcontractSubmit}
        onCancel={() => setSubcontractModalOpen(false)}
        width={500}
      >
        <Form form={subcontractForm} layout="vertical">
          <Form.Item name="subcontractor" label="外包供应商" rules={[{ required: true, message: '请选择外包供应商' }]}>
            <Select
              showSearch
              placeholder="选择外包供应商"
              optionFilterProp="label"
              options={suppliers.map(s => ({ value: s.name, label: `${s.code} - ${s.name}` }))}
            />
          </Form.Item>
          <Form.Item name="subcontractAssignee" label="检测人员" rules={[{ required: true, message: '请选择检测人员' }]}>
            <Select
              showSearch
              placeholder="选择检测人员"
              optionFilterProp="label"
              options={users.map(u => ({ value: u.name, label: u.name }))}
            />
          </Form.Item>
          <Form.Item name="deadline" label="截止日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 打印隐藏区域 */}
      {showPrint && printData && (
        <div id="entrustment-print-wrapper" style={{ position: 'fixed', top: '-9999px', left: '-9999px' }}>
          <EntrustmentPrint ref={printRef} data={printData} />
        </div>
      )}
    </div>
  )
}
