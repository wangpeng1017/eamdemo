// @file: 检测委托单管理页面
// @input: /api/entrustment, /api/contract, /api/user, /api/device
// @output: 委托单CRUD、分配任务、分包、生成外部链接
// @pos: 委托流程末端页 - 合同签订后创建委托单
// ⚠️ 更新我时，请同步更新本注释及 entrustment/_INDEX.md

'use client'

import { useState, useEffect } from 'react'
import { showSuccess, showError } from '@/lib/confirm'
import { Table, Button, Space, Modal, Form, Input, InputNumber, DatePicker, Select, message, Row, Col, Divider, Popconfirm, Tag, Radio } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, MinusCircleOutlined, TeamOutlined, ShareAltOutlined, EyeOutlined } from '@ant-design/icons'
import { StatusTag } from '@/components/StatusTag'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { exportToExcel } from '@/hooks/useExport'
import { useRouter, useSearchParams } from 'next/navigation'

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
  const [modalOpen, setModalOpen] = useState(false) // Keeping it for Assign/Subcontract modals? No, those have their own states. This was for Create/Edit.
  // Wait, I should verify assignModalOpen logic. It uses assignForm.
  // The state I removed was 'modalOpen' (create/edit).
  // I should remove 'modalOpen', 'editingId', 'form', 'sampleTestItems'.
  // But wait! assignForm/subcontractForm use Form.useForm().
  // And I see `const [form] = Form.useForm()` was likely for the create/edit modal.
  // So I can remove `form`.
  // Assign modal uses `assignForm`.
  // Subcontract modal uses `subcontractForm`.
  // SampleTestItemTable was used in Create/Edit modal. So `sampleTestItems` state can be removed.

  // Cleaned up states:
  const [data, setData] = useState<Entrustment[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)


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

  // 获取委托单列表 (fetchData logic remains)
  // fetchOptions remains

  // (Removed handleContractChange logic as it is moved to dedicated page)

  useEffect(() => {
    fetchData()
    fetchOptions()
  }, [page])

  // 处理从合同页面传递的参数 - Redirect to create page if params exist
  useEffect(() => {
    const contractNo = searchParams.get('contractNo')
    const clientName = searchParams.get('clientName')

    if (contractNo || clientName) {
      // Redirect to create page with current search params
      const params = new URLSearchParams(searchParams.toString())
      router.replace(`/entrustment/list/create?${params.toString()}`)
    }
  }, [searchParams])

  // 新增委托单
  const handleAdd = () => {
    router.push('/entrustment/list/create')
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
      showSuccess('删除成功')
      fetchData()
    } else {
      showError(json.error?.message || '删除失败')
    }
  }

  const handleGenerateExternalLink = (record: Entrustment) => {
    const link = `${window.location.origin}/entrustment/external/${record.id}`
    navigator.clipboard.writeText(link)
    showSuccess('外部链接已复制到剪贴板')
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
        // subcontractor field in form matches standard?
      })
    }
    setSubcontractModalOpen(true)
  }

  // 提交分配
  const handleAssignSubmit = async () => {
    if (!currentProject) return
    try {
      const values = await assignForm.validateFields()
      const res = await fetch(`/api/entrustment/${currentProject.entrustmentId}/project/${currentProject.project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign',
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
      const res = await fetch(`/api/entrustment/${currentProject.entrustmentId}/project/${currentProject.project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subcontract',
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
