// @file: 委托单管理页面
// @input: /api/entrustment, /api/contract, /api/user, /api/device
// @output: 委托单CRUD、分配任务、分包、生成外部链接
// @pos: 委托流程末端页 - 合同签订后创建委托单
// ⚠️ 更新我时，请同步更新本注释及 entrustment/_INDEX.md

'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Space, Modal, Form, Input, InputNumber, DatePicker, Select, message, Row, Col, Divider, Popconfirm, Tag, Radio } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, MinusCircleOutlined, TeamOutlined, ShareAltOutlined, EyeOutlined } from '@ant-design/icons'
import { StatusTag } from '@/components/StatusTag'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { exportToExcel } from '@/hooks/useExport'
import { useRouter, useSearchParams } from 'next/navigation'

// 类型定义
interface EntrustmentSample {
  name: string
  model?: string
  material?: string
  quantity: number
  remark?: string
}

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
  deviceId: string | null
  deadline: string | null
}

interface Entrustment {
  id: string
  entrustmentNo: string
  contractNo: string | null
  clientId: string | null
  clientName: string | null
  contactPerson: string | null
  sampleDate: string | null
  follower: string | null
  sampleName: string | null
  sampleModel: string | null
  sampleMaterial: string | null
  sampleQuantity: number | null
  isSampleReturn: boolean
  sourceType: string | null
  status: string
  createdAt: string
  projects: EntrustmentProject[]
  samples?: { id: string; name: string; type?: string; specification?: string; material?: string; quantity: string }[] // Add samples from include
  client?: {
    phone?: string
  }
}

interface User {
  id: string
  name: string
  username: string
}

interface Device {
  id: string
  name: string
  deviceNo: string
}

interface Supplier {
  id: string
  name: string
  code: string
}

interface Client {
  id: string
  name: string
  shortName: string | null
  contact: string | null
}

interface Contract {
  id: string
  contractNo: string
  contractName: string | null
  partyACompany: string | null
  clientId?: string
  clientContact?: string
  salesPerson?: string
  sampleName?: string
  sampleModel?: string
  sampleMaterial?: string
  sampleQuantity?: number
  contractSamples?: { name: string; model?: string; material?: string; quantity: number; remark?: string }[]
}

export default function EntrustmentListPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [data, setData] = useState<Entrustment[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form] = Form.useForm()

  const [samples, setSamples] = useState<EntrustmentSample[]>([])

  const handleAddSample = () => {
    setSamples([...samples, { name: '', quantity: 1 }])
  }

  const handleUpdateSample = (index: number, field: keyof EntrustmentSample, value: any) => {
    const newSamples = [...samples]
    newSamples[index] = { ...newSamples[index], [field]: value }
    setSamples(newSamples)
  }

  const handleRemoveSample = (index: number) => {
    setSamples(samples.filter((_, i) => i !== index))
  }

  const sampleColumns: ColumnsType<EntrustmentSample> = [
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
  const [testTemplates, setTestTemplates] = useState<any[]>([]) // 新增：检测项目列表

  // 展开行控制
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([])

  // 获取委托单列表
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
      fetch('/api/test-template?pageSize=1000'), // 新增：加载检测项目
    ])
    const [usersJson, devicesJson, suppliersJson, clientsJson, contractsJson, templatesJson] = await Promise.all([
      usersRes.json(),
      devicesRes.json(),
      suppliersRes.json(),
      clientsRes.json(),
      contractsRes.json(),
      templatesRes.json(),
    ])

    // 修复数据解析路径：json.data.list
    const getUsers = (json: any) => (json.success && json.data?.list) || json.list || []

    setUsers(getUsers(usersJson))
    setDevices(getUsers(devicesJson))
    setSuppliers(getUsers(suppliersJson))
    setClients(getUsers(clientsJson))
    setContracts(getUsers(contractsJson))
    setTestTemplates(getUsers(templatesJson))
  }

  // 合同选择联动
  const handleContractChange = (contractId: string) => {
    // contractId 可能是 ID (从 Select 选中) 或 No (从 URL 参数)
    // 这里的 contracts 是所有加载的合同列表
    // 优先尝试按 ID 查找，如果找不到尝试按 No 查找
    const contract = contracts.find(c => c.id === contractId) || contracts.find(c => c.contractNo === contractId)

    if (contract) {
      // 尝试根据合同所关联的客户ID找到客户信息
      const client = clients.find(c => c.name === contract.partyACompany) || clients.find(c => c.id === contract.clientId)

      form.setFieldsValue({
        clientName: contract.partyACompany || client?.name,
        clientId: contract.clientId || client?.id,
        contactPerson: contract.clientContact || client?.contact,
        // 自动填充跟单人 (使用合同创建人作为跟单人)
        follower: contract.salesPerson || undefined,
        // 自动填充送样时间为当前日期
        sampleDate: dayjs(),

        // 自动填充样品信息
        sampleName: contract.sampleName,
        sampleModel: contract.sampleModel,
        sampleMaterial: contract.sampleMaterial,
        sampleQuantity: contract.sampleQuantity,
      })

      // 自动填充样品列表
      if ((contract as any).contractSamples && (contract as any).contractSamples.length > 0) {
        setSamples((contract as any).contractSamples.map((s: any) => ({
          name: s.name,
          model: s.model,
          material: s.material,
          quantity: s.quantity,
          remark: s.remark
        })))
      } else if (contract.sampleName) {
        setSamples([{
          name: contract.sampleName,
          model: contract.sampleModel || undefined,
          material: contract.sampleMaterial || undefined,
          quantity: contract.sampleQuantity || 1
        }])
      }

      if (contract.salesPerson) {
        message.success(`已自动关联跟单人: ${contract.salesPerson}`)
      }
    }
  }

  useEffect(() => {
    fetchData()
    fetchOptions()
  }, [page])

  // 处理从合同页面传递的参数
  useEffect(() => {
    const contractNo = searchParams.get('contractNo')
    const clientName = searchParams.get('clientName')
    const contactPerson = searchParams.get('contactPerson')
    const contactPhone = searchParams.get('contactPhone')
    const clientAddress = searchParams.get('clientAddress')
    const projectsParam = searchParams.get('projects')

    // 解析检测项目
    let projects: { name?: string; method?: string; testItems?: string[] }[] = [{}]
    if (projectsParam) {
      try {
        const parsed = JSON.parse(projectsParam)
        if (Array.isArray(parsed) && parsed.length > 0) {
          projects = parsed.map((p: { name?: string; method?: string }) => ({
            name: p.name || '',
            method: p.method || '',
            testItems: [],
          }))
        }
      } catch (e) {
        console.error('解析检测项目失败:', e)
      }
    }

    if (contractNo || clientName) {
      // 自动填充并打开新建抽屉
      setEditingId(null)
      form.resetFields()
      form.setFieldsValue({
        contractNo,
        clientName,
        contactPerson,
        contactPhone,
        clientAddress,
        isSampleReturn: false,
        projects,
      })

      // 解析样品信息
      const samplesParam = searchParams.get('samples')
      if (samplesParam) {
        try {
          const parsedSamples = JSON.parse(samplesParam)
          if (Array.isArray(parsedSamples) && parsedSamples.length > 0) {
            setSamples(parsedSamples.map((s: any) => ({
              name: s.name,
              model: s.model,
              material: s.material,
              quantity: s.quantity,
              remark: s.remark
            })))
          }
        } catch (e) {
          console.error('解析样品信息失败:', e)
        }
      }

      setModalOpen(true)

      // 清除 URL 参数
      router.replace('/entrustment/list', { scroll: false })
    }
  }, [searchParams])

  // 新增委托单
  const handleAdd = () => {
    setEditingId(null)
    setSamples([{ name: '', quantity: 1 }])
    form.resetFields()
    form.setFieldsValue({ isSampleReturn: false, projects: [{}] })
    setModalOpen(true)
  }

  // 编辑委托单
  const handleEdit = (record: Entrustment) => {
    setEditingId(record.id)
    const formData = {
      ...record,
      sampleDate: record.sampleDate ? dayjs(record.sampleDate) : undefined,
      projects: record.projects?.length > 0 ? record.projects.map(p => ({
        ...p,
        testItems: p.testItems || [],
        deadline: p.deadline ? dayjs(p.deadline) : undefined,
      })) : [{}],
    }

    // 回填样品
    if (record.samples && record.samples.length > 0) {
      setSamples(record.samples.map(s => ({
        name: s.name,
        model: s.specification, // Sample model has specification
        material: s.material,
        quantity: s.quantity ? parseInt(s.quantity) : 1,
      })))
    } else if (record.sampleName) {
      setSamples([{
        name: record.sampleName,
        model: record.sampleModel || undefined,
        material: record.sampleMaterial || undefined,
        quantity: record.sampleQuantity || 1
      }])
    } else {
      setSamples([{ name: '', quantity: 1 }])
    }

    form.setFieldsValue(formData)
    setModalOpen(true)
  }

  // 删除委托单
  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/entrustment/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (res.ok && json.success) {
      message.success('删除成功')
      fetchData()
    } else {
      message.error(json.error?.message || '删除失败')
    }
  }

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const submitData = {
        ...values,
        sampleDate: values.sampleDate?.toISOString() || null,
        projects: values.projects?.filter((p: any) => p.name).map((p: any) => ({
          name: p.name,
          method: p.method || null,
          testItems: p.testItems || [],
          deadline: p.deadline?.toISOString() || null,
        })) || [],
        samples: samples,
      }

      const url = editingId ? `/api/entrustment/${editingId}` : '/api/entrustment'
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      })

      if (res.ok) {
        message.success(editingId ? '更新成功' : '创建成功')
        setModalOpen(false)
        fetchData()
      } else {
        const errorData = await res.json().catch(() => ({}))
        message.error(errorData.error || errorData.message || `操作失败(${res.status})`)
      }
    } catch (err: any) {
      console.error('提交失败:', err)
      message.error(err.message || '提交失败')
    }
  }

  // 打开分配弹窗
  const handleAssign = (entrustmentId: string, project: EntrustmentProject) => {
    setCurrentProject({ entrustmentId, project })
    assignForm.resetFields()
    assignForm.setFieldsValue({
      assignTo: project.assignTo,
      deviceId: project.deviceId,
      deadline: project.deadline ? dayjs(project.deadline) : undefined,
    })
    setAssignModalOpen(true)
  }

  // 打开分包弹窗
  const handleSubcontract = (entrustmentId: string, project: EntrustmentProject) => {
    setCurrentProject({ entrustmentId, project })
    subcontractForm.resetFields()
    subcontractForm.setFieldsValue({
      subcontractor: project.subcontractor,
      deadline: project.deadline ? dayjs(project.deadline) : undefined,
    })
    setSubcontractModalOpen(true)
  }

  // 提交分配
  const handleAssignSubmit = async () => {
    if (!currentProject) return
    const values = await assignForm.validateFields()

    const res = await fetch(`/api/entrustment/${currentProject.entrustmentId}/projects/${currentProject.project.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignTo: values.assignTo,
        deviceId: values.deviceId,
        deadline: values.deadline?.toISOString(),
        status: 'assigned',
      })
    })

    if (res.ok) {
      message.success('分配成功')
      setAssignModalOpen(false)
      fetchData()
    } else {
      message.error('分配失败')
    }
  }

  // 提交分包
  const handleSubcontractSubmit = async () => {
    if (!currentProject) return
    const values = await subcontractForm.validateFields()

    const res = await fetch(`/api/entrustment/${currentProject.entrustmentId}/projects/${currentProject.project.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subcontractor: values.subcontractor,
        subcontractAssignee: values.subcontractAssignee,
        deadline: values.deadline?.toISOString(),
        status: 'subcontracted',
      })
    })

    if (res.ok) {
      message.success('分包成功')
      setSubcontractModalOpen(false)
      fetchData()
    } else {
      message.error('分包失败')
    }
  }

  // 生成外部链接
  const handleGenerateExternalLink = async (record: Entrustment) => {
    console.log('[ExternalLink] Called with record:', record.id, record.entrustmentNo, record.status)
    try {
      message.loading({ content: '正在生成外部链接...', key: 'externalLink' })

      const res = await fetch(`/api/entrustment/${record.id}/external-link`, {
        method: 'POST',
      })

      console.log('[ExternalLink] Response status:', res.status)
      const json = await res.json()
      console.log('[ExternalLink] Response json:', json)

      if (json.success) {
        const link = json.data.link
        message.destroy('externalLink')

        // 始终显示 Modal 弹窗，让用户可以看到并复制链接
        Modal.success({
          title: '外部链接已生成',
          content: (
            <div>
              <p>请复制以下链接发送给客户：</p>
              <Input.TextArea
                value={link}
                autoSize
                readOnly
                style={{ marginTop: 8 }}
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              />
              <p style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
                有效期：7天（点击链接可全选）
              </p>
            </div>
          ),
          okText: '关闭',
          width: 500,
        })

        // 尝试复制到剪贴板（静默操作，不影响弹窗显示）
        try {
          await navigator.clipboard.writeText(link)
          message.success({ content: '链接已复制到剪贴板', duration: 2 })
        } catch (clipboardError) {
          // 剪贴板 API 在 HTTP 环境下可能失败，忽略错误
          console.log('[ExternalLink] Clipboard API failed:', clipboardError)
        }
      } else {
        message.error({ content: json.message || '生成失败', key: 'externalLink' })
      }
    } catch (error) {
      console.error('[ExternalLink] Error:', error)
      message.error({ content: '生成外部链接失败', key: 'externalLink' })
    }
  }

  // 检测项目子表格列
  const projectColumns: ColumnsType<EntrustmentProject> = [
    { title: '项目名称', dataIndex: 'name', width: 150 },
    {
      title: '检测参数',
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
      render: (s: string) => {
        if (s === 'assigned') {
          const record = data.find(d => d.projects?.some(p => p.status === s))
          const project = record?.projects?.find(p => p.status === s)
          return <Tag color="processing">已分配: {project?.assignTo}</Tag>
        }
        if (s === 'subcontracted') {
          const record = data.find(d => d.projects?.some(p => p.status === s))
          const project = record?.projects?.find(p => p.status === s)
          return <Tag color="warning">已分包: {project?.subcontractor}</Tag>
        }
        return <StatusTag type="project" status={s} />
      }
    },
    {
      title: '操作',
      width: 100,
      render: (_, record) => {
        // 从父级获取 entrustmentId
        const entrustment = data.find(d => d.projects?.some(p => p.id === record.id))
        if (!entrustment) return null

        return (
          <Space size="small">
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
    { title: '委托单位', dataIndex: 'clientName', width: 150, ellipsis: true },
    { title: '样品名称', dataIndex: 'sampleName', ellipsis: true },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD HH:mm:ss') : '-'
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
    { title: '跟单人', dataIndex: 'follower', width: 80 },
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
      render: (_: any, record: Entrustment) => (
        <Space size="small" style={{ whiteSpace: 'nowrap' }}>
          {/* 业务按钮（带文字） */}
          {record.status === 'pending' && (
            <Button size="small" icon={<ShareAltOutlined />} onClick={() => handleGenerateExternalLink(record)}>生成外部链接</Button>
          )}
          {/* 通用按钮（仅图标） */}
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleEdit(record)} />
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>委托单管理</h2>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新建委托</Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        scroll={{ x: 1200 }}
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

      {/* 新建/编辑委托单弹窗 */}
      <Modal
        title={editingId ? '编辑委托单' : '新建委托单'}
        width={800}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setModalOpen(false)}>取消</Button>,
          <Button key="submit" type="primary" onClick={handleSubmit}>保存</Button>,
        ]}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        <Form form={form} layout="vertical">
          <Divider orientation="left" orientationMargin="0">基本信息</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="entrustmentNo" label="委托编号">
                <Input disabled placeholder="自动生成" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="contractNo" label="合同编号">
                <Select
                  showSearch
                  optionFilterProp="children"
                  onChange={(value) => {
                    // value 可能是 ID 或 No，这取决于 Select.Option 的 value
                    // 下面 map 中 value 是 c.id
                    handleContractChange(value)
                  }}
                >
                  {contracts.map(c => (
                    <Select.Option key={c.id} value={c.id}>{c.contractNo} - {c.contractName}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="clientName" label="委托单位" rules={[{ required: true, message: '请输入委托单位' }]}>
                <Select
                  showSearch
                  allowClear
                  placeholder="选择或输入客户"
                  optionFilterProp="label"
                  options={clients.map(c => ({ value: c.name, label: c.name }))}
                  onChange={(value) => {
                    const client = clients.find(c => c.name === value)
                    if (client) {
                      form.setFieldsValue({
                        clientId: client.id,
                        contactPerson: client.contact
                      })
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="contactPerson" label="联系人">
                <Input placeholder="请输入联系人" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="sampleDate" label="送样时间" rules={[{ required: true, message: '请选择送样时间' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="follower" label="跟单人" rules={[{ required: true, message: '请选择跟单人' }]}>
                <Select
                  showSearch
                  allowClear
                  placeholder="选择跟单人"
                  optionFilterProp="label"
                  options={users.map(u => ({ value: u.name, label: u.name }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" orientationMargin="0">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>样品信息</span>
              <Button type="dashed" size="small" onClick={handleAddSample} icon={<PlusOutlined />}>添加样品</Button>
            </div>
          </Divider>

          <Table
            rowKey={(r, i) => i || 0}
            columns={sampleColumns}
            dataSource={samples}
            pagination={false}
            size="small"
            bordered
            locale={{ emptyText: '暂无样品' }}
            style={{ marginBottom: 16 }}
          />

          <Form.Item name="isSampleReturn" label="是否退样">
            <Radio.Group>
              <Radio value={true}>是</Radio>
              <Radio value={false}>否</Radio>
            </Radio.Group>
          </Form.Item>

          <Divider orientation="left" orientationMargin="0">检测项目管理</Divider>

          <Form.List name="projects">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <div key={key} style={{ background: '#fafafa', padding: 16, marginBottom: 16, borderRadius: 4, position: 'relative' }}>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          {...restField}
                          name={[name, 'name']}
                          label="检测项目"
                          rules={[{ required: true, message: '请选择检测项目' }]}
                        >
                          <Select
                            showSearch
                            allowClear
                            placeholder="选择检测项目"
                            optionFilterProp="label"
                            options={testTemplates.map((t: any) => ({
                              value: t.name,
                              label: t.name,
                              method: t.schema ? (JSON.parse(typeof t.schema === 'string' ? t.schema : JSON.stringify(t.schema)).header?.methodBasis || t.method) : t.method
                            }))}
                            onChange={async (val, option) => {
                              // 自动填充对应的方法/标准
                              const method = (option as any)?.method || ''
                              const projects = form.getFieldValue('projects') || []
                              if (projects[name]) {
                                projects[name].method = method

                                // 自动查找并关联模版
                                if (method) {
                                  try {
                                    const templateRes = await fetch(`/api/test-template/by-method?method=${encodeURIComponent(method)}`)
                                    const templateJson = await templateRes.json()
                                    if (templateJson.success && templateJson.data.list.length > 0) {
                                      const matchedTemplate = templateJson.data.list[0]
                                      projects[name].testTemplateId = matchedTemplate.code
                                      message.success(`✅ 已自动关联模版：${matchedTemplate.name}`)
                                    }
                                  } catch (e) {
                                    console.error('查找模版失败:', e)
                                  }
                                }

                                form.setFieldsValue({ projects: [...projects] })
                              }
                            }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          {...restField}
                          name={[name, 'method']}
                          label="方法/标准"
                        >
                          <Input placeholder="如: GB/T 228.1-2021" />
                        </Form.Item>
                      </Col>
                      <Form.Item
                        {...restField}
                        name={[name, 'testTemplateId']}
                        hidden
                        style={{ margin: 0 }}
                      >
                        <Input />
                      </Form.Item>
                    </Row>
                    {fields.length > 1 && (
                      <Button
                        type="link"
                        danger
                        icon={<MinusCircleOutlined />}
                        onClick={() => remove(name)}
                        style={{ position: 'absolute', top: 8, right: 8 }}
                      >
                        删除
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  添加检测项目
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

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
          <Form.Item name="deviceId" label="检测设备">
            <Select
              showSearch
              allowClear
              placeholder="选择检测设备"
              optionFilterProp="label"
              options={devices.map(d => ({ value: d.id, label: `${d.deviceNo} - ${d.name}` }))}
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
    </div>
  )
}
