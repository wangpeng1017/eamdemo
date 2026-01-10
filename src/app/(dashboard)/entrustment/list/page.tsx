'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Space, Modal, Form, Input, InputNumber, DatePicker, Select, message, Drawer, Row, Col, Divider, Popconfirm, Tag, Dropdown, Radio } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, MinusCircleOutlined, TeamOutlined, ShareAltOutlined, DownOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { StatusTag } from '@/components/StatusTag'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { exportToExcel } from '@/hooks/useExport'
import { useRouter, useSearchParams } from 'next/navigation'

// 类型定义
interface EntrustmentProject {
  id: string
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
}

// 检测参数选项
const TEST_ITEM_OPTIONS = [
  { value: '拉伸强度', label: '拉伸强度' },
  { value: '断面收缩率', label: '断面收缩率' },
  { value: '断后伸长率', label: '断后伸长率' },
  { value: '硬度测试', label: '硬度测试' },
  { value: '金相分析', label: '金相分析' },
  { value: '化学成分分析', label: '化学成分分析' },
  { value: '盐雾试验', label: '盐雾试验' },
  { value: '冲击试验', label: '冲击试验' },
  { value: '弯曲试验', label: '弯曲试验' },
  { value: '抗压强度', label: '抗压强度' },
]

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

  // 行选择
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [selectedRows, setSelectedRows] = useState<Entrustment[]>([])

  // 分配弹窗状态
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [subcontractModalOpen, setSubcontractModalOpen] = useState(false)
  const [currentProject, setCurrentProject] = useState<{ entrustmentId: string; project: EntrustmentProject } | null>(null)
  const [assignForm] = Form.useForm()
  const [subcontractForm] = Form.useForm()

  // 批量分配弹窗
  const [batchAssignModalOpen, setBatchAssignModalOpen] = useState(false)
  const [batchAssignForm] = Form.useForm()

  // 下拉选项数据
  const [users, setUsers] = useState<User[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])

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
    const [usersRes, devicesRes, suppliersRes, clientsRes, contractsRes] = await Promise.all([
      fetch('/api/user?pageSize=100'),
      fetch('/api/device/list?pageSize=100'),
      fetch('/api/supplier?pageSize=100'),
      fetch('/api/client?pageSize=100'),
      fetch('/api/contract?pageSize=100'),
    ])
    const [usersJson, devicesJson, suppliersJson, clientsJson, contractsJson] = await Promise.all([
      usersRes.json(),
      devicesRes.json(),
      suppliersRes.json(),
      clientsRes.json(),
      contractsRes.json(),
    ])
    setUsers(usersJson.list || [])
    setDevices(devicesJson.list || [])
    setSuppliers(suppliersJson.list || [])
    setClients(clientsJson.list || [])
    setContracts(contractsJson.list || [])
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
        projects: [{}],
      })
      setModalOpen(true)

      // 清除 URL 参数
      router.replace('/entrustment/list', { scroll: false })
    }
  }, [searchParams])

  // 新增委托单
  const handleAdd = () => {
    setEditingId(null)
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
    form.setFieldsValue(formData)
    setModalOpen(true)
  }

  // 删除委托单
  const handleDelete = async (id: string) => {
    await fetch(`/api/entrustment/${id}`, { method: 'DELETE' })
    message.success('删除成功')
    fetchData()
  }

  // 提交表单
  const handleSubmit = async () => {
    const values = await form.validateFields()
    const submitData = {
      ...values,
      sampleDate: values.sampleDate?.toISOString(),
      projects: values.projects?.filter((p: any) => p.name).map((p: any) => ({
        ...p,
        testItems: p.testItems || [],
        deadline: p.deadline?.toISOString(),
      })),
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
      message.error('操作失败')
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

  // ===== 批量操作 =====

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的记录')
      return
    }

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 条记录吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await Promise.all(
            selectedRowKeys.map((id) =>
              fetch(`/api/entrustment/${id}`, { method: 'DELETE' })
            )
          )
          message.success(`成功删除 ${selectedRowKeys.length} 条记录`)
          setSelectedRowKeys([])
          setSelectedRows([])
          fetchData()
        } catch (error) {
          message.error('批量删除失败')
        }
      },
    })
  }

  // 批量分配
  const handleBatchAssign = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要分配的委托单')
      return
    }
    batchAssignForm.resetFields()
    setBatchAssignModalOpen(true)
  }

  // 提交批量分配
  const handleBatchAssignSubmit = async () => {
    const values = await batchAssignForm.validateFields()

    try {
      let successCount = 0
      for (const entrustment of selectedRows) {
        for (const project of entrustment.projects || []) {
          if (project.status === 'pending') {
            const res = await fetch(
              `/api/entrustment/${entrustment.id}/projects/${project.id}`,
              {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  assignTo: values.assignTo,
                  deviceId: values.deviceId,
                  deadline: values.deadline?.toISOString(),
                  status: 'assigned',
                }),
              }
            )
            if (res.ok) successCount++
          }
        }
      }

      message.success(`成功分配 ${successCount} 个项目`)
      setBatchAssignModalOpen(false)
      setSelectedRowKeys([])
      setSelectedRows([])
      fetchData()
    } catch (error) {
      message.error('批量分配失败')
    }
  }

  // 批量导出
  const handleBatchExport = () => {
    if (selectedRows.length === 0) {
      message.warning('请选择要导出的记录')
      return
    }

    // 展开数据，每个项目一行
    const exportData = selectedRows.flatMap((entrustment) =>
      (entrustment.projects || []).map((project) => ({
        委托编号: entrustment.entrustmentNo,
        委托单位: entrustment.clientName || '',
        样品名称: entrustment.sampleName || '',
        检测项目: project.name,
        检测参数: (project.testItems || []).join(', '),
        检测方法: project.method || '',
        检测标准: project.standard || '',
        分配人: project.assignTo || '',
        状态: project.status,
      }))
    )

    exportToExcel(exportData, `委托单导出-${dayjs().format('YYYY-MM-DD-HHmmss')}`)
    setSelectedRowKeys([])
    setSelectedRows([])
  }

  // 生成外部链接
  const handleGenerateExternalLink = async (record: Entrustment) => {
    try {
      message.loading({ content: '正在生成外部链接...', key: 'externalLink' })

      const res = await fetch(`/api/entrustment/${record.id}/external-link`, {
        method: 'POST',
      })

      const json = await res.json()

      if (json.success) {
        const link = json.data.link
        // 尝试复制链接到剪贴板
        try {
          await navigator.clipboard.writeText(link)
          message.success({ content: '外部链接已生成并复制到剪贴板', key: 'externalLink', duration: 3 })
        } catch (clipboardError) {
          // 剪贴板 API 在 HTTP 环境下可能失败，显示弹窗让用户手动复制
          message.destroy('externalLink')
          Modal.info({
            title: '外部链接已生成',
            content: (
              <div>
                <p>请复制以下链接发送给客户：</p>
                <Input.TextArea value={link} autoSize readOnly style={{ marginTop: 8 }} />
                <p style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
                  有效期：7天
                </p>
              </div>
            ),
            okText: '关闭',
            width: 500,
          })
        }
      } else {
        message.error({ content: json.message || '生成失败', key: 'externalLink' })
      }
    } catch (error) {
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
      width: 150,
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
    { title: '委托单位', dataIndex: 'clientName', ellipsis: true },
    { title: '样品名称', dataIndex: 'sampleName', ellipsis: true },
    {
      title: '订单时间',
      dataIndex: 'sampleDate',
      width: 110,
      render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD') : '-'
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
      title: '操作',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button size="small" type="link" onClick={() => handleEdit(record)}>编辑</Button>
          <Button
            size="small"
            type="link"
            icon={<ShareAltOutlined />}
            onClick={() => handleGenerateExternalLink(record)}
          >
            外部链接
          </Button>
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" type="link" danger>删除</Button>
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
          {selectedRowKeys.length > 0 && (
            <>
              <Dropdown menu={{
                items: [
                  { key: 'delete', label: '批量删除', danger: true, onClick: handleBatchDelete },
                  { key: 'assign', label: '批量分配', onClick: handleBatchAssign },
                  { key: 'export', label: '批量导出', onClick: handleBatchExport },
                ] as MenuProps['items']
              }}>
                <Button icon={<DownOutlined />}>
                  批量操作 ({selectedRowKeys.length})
                </Button>
              </Dropdown>
            </>
          )}
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

      {/* 新建/编辑委托单抽屉 */}
      <Drawer
        title={editingId ? '编辑委托单' : '新建委托单'}
        placement="right"
        width={700}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        extra={
          <Space>
            <Button onClick={() => setModalOpen(false)}>取消</Button>
            <Button type="primary" onClick={handleSubmit}>保存</Button>
          </Space>
        }
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
                  allowClear
                  placeholder="选择关联合同"
                  options={contracts.map(c => ({ value: c.contractNo, label: `${c.contractNo} - ${c.partyACompany || c.contractName}` }))}
                />
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
              <Form.Item name="follower" label="跟进人" rules={[{ required: true, message: '请输入跟进人' }]}>
                <Select
                  showSearch
                  allowClear
                  placeholder="选择跟进人"
                  optionFilterProp="label"
                  options={users.map(u => ({ value: u.name, label: u.name }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" orientationMargin="0">样品信息</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="sampleName" label="样品名称" rules={[{ required: true, message: '请输入样品名称' }]}>
                <Input placeholder="请输入样品名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sampleModel" label="规格型号">
                <Input placeholder="请输入规格型号" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="sampleMaterial" label="材质牌号">
                <Input placeholder="请输入材质牌号" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sampleQuantity" label="样品数量">
                <InputNumber style={{ width: '100%' }} min={1} placeholder="请输入数量" />
              </Form.Item>
            </Col>
          </Row>

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
                          label="项目名称"
                          rules={[{ required: true, message: '请输入项目名称' }]}
                        >
                          <Input placeholder="请输入项目名称" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          {...restField}
                          name={[name, 'testItems']}
                          label="检测参数"
                        >
                          <Select
                            mode="multiple"
                            placeholder="选择检测参数"
                            options={TEST_ITEM_OPTIONS}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          {...restField}
                          name={[name, 'method']}
                          label="检测方法"
                        >
                          <Input placeholder="如: GB/T 228.1-2021" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          {...restField}
                          name={[name, 'standard']}
                          label="判定标准"
                        >
                          <Input placeholder="如: GB 17691-2018" />
                        </Form.Item>
                      </Col>
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
          <Form.Item name="deadline" label="截止日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 批量分配模态框 */}
      <Modal
        title="批量分配"
        open={batchAssignModalOpen}
        onOk={handleBatchAssignSubmit}
        onCancel={() => setBatchAssignModalOpen(false)}
      >
        <Form form={batchAssignForm} layout="vertical">
          <Form.Item name="assignTo" label="分配给" rules={[{ required: true, message: '请选择检测人员' }]}>
            <Select
              showSearch
              placeholder="选择检测人员"
              optionFilterProp="label"
              options={users.map(u => ({ value: u.name, label: u.name }))}
            />
          </Form.Item>
          <Form.Item name="deviceId" label="设备">
            <Select
              allowClear
              placeholder="选择设备"
              optionFilterProp="label"
              options={devices.map(d => ({ value: d.id, label: `${d.deviceNo} - ${d.name}` }))}
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
