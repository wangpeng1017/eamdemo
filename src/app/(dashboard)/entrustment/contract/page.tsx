'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Space, Modal, Form, Input, InputNumber, Select, DatePicker, message, Drawer, Tag, Row, Col, Divider, Popconfirm, Tabs, Descriptions } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, FileTextOutlined, DownloadOutlined, FileAddOutlined, FilePdfOutlined } from '@ant-design/icons'
import { StatusTag } from '@/components/StatusTag'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useRouter } from 'next/navigation'
import { exportContractPDF } from '@/lib/exportContractPDF'

interface ContractSample {
  name: string
  model?: string
  material?: string
  quantity: number
  remark?: string
}

interface Contract {
  id: string
  contractNo: string
  quotationId?: string | null
  quotationNo?: string | null
  clientName: string | null
  clientContact?: string | null
  clientPhone?: string | null
  clientAddress?: string | null
  amount: number | null
  sampleName?: string | null
  sampleModel?: string | null
  sampleMaterial?: string | null
  sampleQuantity?: number | null
  prepaymentAmount?: number | null
  prepaymentRatio?: number | null
  signDate: string | null
  startDate: string | null
  endDate: string | null
  paymentTerms?: string | null
  deliveryTerms?: string | null
  qualityTerms?: string | null
  confidentialityTerms?: string | null
  breachTerms?: string | null
  disputeTerms?: string | null
  otherTerms?: string | null
  attachmentUrl?: string | null
  remark?: string | null
  status: string
  createdAt: string
  items?: ContractItem[]
  contractSamples?: ContractSample[]
}

interface ContractItem {
  id?: string
  serviceItem: string
  methodStandard: string
  quantity: number
  unitPrice: number
  totalPrice: number
  sort?: number
}

interface Client {
  id: string
  name: string
  shortName?: string
  contact?: string
  phone?: string
  email?: string
  address?: string
}

const STATUS_OPTIONS = [
  { value: 'draft', label: '草稿' },
  { value: 'signed', label: '已签订' },
  { value: 'executing', label: '执行中' },
  { value: 'completed', label: '已完成' },
  { value: 'terminated', label: '已终止' },
]

export default function ContractPage() {
  const router = useRouter()
  const [data, setData] = useState<Contract[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [currentContract, setCurrentContract] = useState<Contract | null>(null)
  const [form] = Form.useForm()
  const [filters, setFilters] = useState<any>({})
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [clientsLoading, setClientsLoading] = useState(false)

  const [contractItems, setContractItems] = useState<ContractItem[]>([])
  const [testTemplates, setTestTemplates] = useState<any[]>([])
  const [samples, setSamples] = useState<ContractSample[]>([])

  const handleAddSample = () => {
    setSamples([...samples, { name: '', quantity: 1 }])
  }

  const handleUpdateSample = (index: number, field: keyof ContractSample, value: any) => {
    const newSamples = [...samples]
    newSamples[index] = { ...newSamples[index], [field]: value }
    setSamples(newSamples)
  }

  const handleRemoveSample = (index: number) => {
    setSamples(samples.filter((_, i) => i !== index))
  }

  const sampleColumns: ColumnsType<ContractSample> = [
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

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...contractItems]
    const item = { ...newItems[index] }
    // @ts-ignore
    item[field] = value
    item.totalPrice = (item.quantity || 1) * (item.unitPrice || 0)
    newItems[index] = item
    setContractItems(newItems)

    // 自动计算合同总额
    const total = newItems.reduce((sum, i) => sum + (i.totalPrice || 0), 0)
    form.setFieldsValue({ amount: total })
    // Recalculate prepayment amount
    const ratio = form.getFieldValue('prepaymentRatio') || 0
    form.setFieldsValue({
      prepaymentAmount: total ? (total * ratio / 100) : 0
    })
  }

  const removeItem = (index: number) => {
    const newItems = contractItems.filter((_, i) => i !== index)
    setContractItems(newItems)
    const total = newItems.reduce((sum, i) => sum + (i.totalPrice || 0), 0)
    form.setFieldsValue({ amount: total })
    // Recalculate prepayment amount
    const ratio = form.getFieldValue('prepaymentRatio') || 0
    form.setFieldsValue({
      prepaymentAmount: total ? (total * ratio / 100) : 0
    })
  }

  const handleAddItem = () => {
    setContractItems([...contractItems, { serviceItem: '', methodStandard: '', quantity: 1, unitPrice: 0, totalPrice: 0 }])
  }

  // 获取检测项目列表
  const fetchTestTemplates = async () => {
    try {
      const res = await fetch('/api/test-template?pageSize=1000')
      const json = await res.json()
      const templates = (json.success && json.data?.list) || json.list || []
      setTestTemplates(templates)
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
    const res = await fetch(`/api/contract?${params}`)
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

  useEffect(() => { fetchData(); fetchClients(); fetchTestTemplates() }, [page])

  const handleAdd = () => {
    setEditingId(null)
    form.resetFields()
    form.setFieldsValue({
      signDate: dayjs(),
      prepaymentRatio: 30,
    })
    setContractItems([]) // Reset items
    setSamples([{ name: '', quantity: 1 }])
    setModalOpen(true)
  }

  // 客户选择变化时自动填充联系人、电话、地址
  const handleClientChange = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    if (client) {
      form.setFieldsValue({
        clientName: client.name,
        clientContact: client.contact || '',
        clientPhone: client.phone || '',
        clientAddress: client.address || '',
      })
    }
  }

  const handleEdit = (record: Contract) => {
    setEditingId(record.id)
    const formData = {
      ...record,
      signDate: record.signDate ? dayjs(record.signDate) : null,
      startDate: record.startDate ? dayjs(record.startDate) : null,
      endDate: record.endDate ? dayjs(record.endDate) : null,
    }
    // 回填明细
    setContractItems((record.items || []).map(item => ({
      ...item,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
    })))

    // 回填样品
    let initSamples: ContractSample[] = []
    if (record.contractSamples && record.contractSamples.length > 0) {
      initSamples = record.contractSamples.map(s => ({
        name: s.name,
        model: s.model || undefined,
        material: s.material || undefined,
        quantity: s.quantity || 1,
        remark: s.remark || undefined
      }))
    } else if (record.sampleName) {
      // 兼容旧数据
      const qty = record.sampleQuantity ? Number(record.sampleQuantity) : 1
      initSamples = [{
        name: record.sampleName,
        model: record.sampleModel || undefined,
        material: record.sampleMaterial || undefined,
        quantity: isNaN(qty) ? 1 : qty
      }]
    }
    setSamples(initSamples)

    form.setFieldsValue(formData)
    setModalOpen(true)
  }

  const handleView = (record: Contract) => {
    setCurrentContract(record)
    setViewDrawerOpen(true)
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/contract/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (res.ok && json.success) {
      message.success('删除成功')
      fetchData()
    } else {
      message.error(json.error?.message || '删除失败')
    }
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const data = {
      ...values,
      signDate: values.signDate?.toISOString(),
      startDate: values.startDate?.toISOString(),
      endDate: values.endDate?.toISOString(),
      items: contractItems,
      samples: samples,
    }
    const url = editingId ? `/api/contract/${editingId}` : '/api/contract'
    const method = editingId ? 'PUT' : 'POST'
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    message.success(editingId ? '更新成功' : '创建成功')
    setModalOpen(false)
    fetchData()
  }

  const handleStatusChange = async (status: string) => {
    await fetch(`/api/contract/${currentContract!.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    message.success('状态更新成功')
    fetchData()
    setViewDrawerOpen(false)
  }

  const handleGeneratePDF = () => {
    if (selectedRowKeys.length !== 1) {
      message.warning('请选择一条合同记录')
      return
    }
    const contract = data.find(c => c.id === selectedRowKeys[0])
    if (!contract) return

    window.open(`/api/contract/${contract.id}/pdf`, '_blank')
  }


  const handleGenerateEntrustment = async () => {
    if (selectedRowKeys.length !== 1) {
      message.warning('请选择一条合同记录')
      return
    }
    const contract = data.find(c => c.id === selectedRowKeys[0])
    if (!contract) return

    // 获取报价单检测项目
    let testProjects: { name: string; method: string }[] = []
    if (contract.quotationId) {
      try {
        const res = await fetch(`/api/quotation/${contract.quotationId}`)
        const json = await res.json()
        if (json.success && json.data?.items) {
          testProjects = json.data.items.map((item: { serviceItem: string; methodStandard: string }) => ({
            name: item.serviceItem,
            method: item.methodStandard,
          }))
        }
      } catch (e) {
        console.error('获取报价单失败:', e)
      }
    }

    const params = new URLSearchParams({
      contractNo: contract.contractNo,
      clientName: contract.clientName || '',
      contactPerson: contract.clientContact || '',
      contactPhone: contract.clientPhone || '',
      clientAddress: contract.clientAddress || '',
    })

    // 如果有检测项目，通过 URL 参数传递
    if (testProjects.length > 0) {
      params.set('projects', JSON.stringify(testProjects))
    }

    // Pass samples via URL
    if (contract.contractSamples && contract.contractSamples.length > 0) {
      params.set('samples', JSON.stringify(contract.contractSamples))
    } else if (contract.sampleName) {
      // Fallback for single sample
      params.set('samples', JSON.stringify([{
        name: contract.sampleName,
        model: contract.sampleModel,
        material: contract.sampleMaterial,
        quantity: contract.sampleQuantity || 1
      }]))
    }

    router.push(`/entrustment/list?${params.toString()}`)
    setSelectedRowKeys([])
  }

  const columns: ColumnsType<Contract> = [
    { title: '合同编号', dataIndex: 'contractNo', width: 150 },
    {
      title: '报价单号',
      dataIndex: 'quotationNo',
      width: 140,
      render: (no: string) => no ? (
        <a style={{ color: '#1890ff' }}>{no}</a>
      ) : '-'
    },
    { title: '客户名称', dataIndex: 'clientName', ellipsis: true },
    {
      title: '联系人/电话',
      width: 140,
      render: (_, record) => (
        <div>
          <div>{record.clientContact || '-'}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{record.clientPhone || '-'}</div>
        </div>
      )
    },
    {
      title: '合同金额',
      dataIndex: 'amount',
      width: 120,
      render: (v) => v ? `¥${v.toLocaleString()}` : '-',
    },
    {
      title: '预付款比例',
      dataIndex: 'prepaymentRatio',
      width: 110,
      render: (v) => v ? `${v}%` : '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '合同期限',
      key: 'period',
      width: 160,
      render: (_, record) => {
        const start = record.startDate ? dayjs(record.startDate).format('MM-DD') : '-'
        const end = record.endDate ? dayjs(record.endDate).format('YYYY-MM-DD HH:mm:ss') : '-'
        return `${start} ~ ${end}`
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s: string) => <StatusTag type="contract" status={s} />,
    },
    {
      title: '操作',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record)}/>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="确认删除" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>合同管理</h2>
        <Space>
          <Button icon={<FilePdfOutlined />} disabled={selectedRowKeys.length !== 1} onClick={handleGeneratePDF}>
            生成PDF
          </Button>
          <Button icon={<FileAddOutlined />} disabled={selectedRowKeys.length !== 1} onClick={handleGenerateEntrustment}>
            生成委托单
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增合同</Button>
        </Space>
      </div>

      {/* 筛选条件 */}
      <div style={{ background: '#f5f5f5', padding: 16, marginBottom: 16, borderRadius: 4 }}>
        <Form layout="inline" onFinish={(values) => { setFilters(values); setPage(1); fetchData(1, values) }}>
          <Form.Item name="keyword" label="关键词">
            <Input placeholder="合同编号/客户名称" allowClear />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select placeholder="全部" allowClear style={{ width: 120 }}>
              {STATUS_OPTIONS.map(opt => (
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
        scroll={{ x: 1200 }}
        pagination={{ current: page, total, pageSize: 10, onChange: setPage, showSizeChanger: false }}
        rowSelection={{
          type: 'radio',
          selectedRowKeys,
          onChange: (selectedKeys) => setSelectedRowKeys(selectedKeys),
        }}
      />

      {/* 新增/编辑模态框 */}
      <Modal
        title={editingId ? '编辑合同' : '新增合同'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={900}
        footer={[
          <Button key="cancel" onClick={() => setModalOpen(false)}>取消</Button>,
          <Button key="submit" type="primary" onClick={handleSubmit}>{editingId ? '更新' : '创建'}</Button>,
        ]}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="clientId" label="客户名称" rules={[{ required: true, message: '请选择客户' }]}>
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
              <Form.Item name="clientName" hidden>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="clientContact" label="联系人" rules={[{ required: true, message: '请输入联系人' }]}>
                <Input placeholder="请输入联系人" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="clientPhone" label="联系电话" rules={[{ required: true, message: '请输入联系电话' }]}>
                <Input placeholder="请输入联系电话" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="clientAddress" label="客户地址">
                <Input placeholder="请输入客户地址" />
              </Form.Item>
            </Col>
          </Row>



          <Divider orientationMargin="0">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>报价明细</span>
              <Button type="dashed" size="small" onClick={handleAddItem} icon={<PlusOutlined />}>添加项目</Button>
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
                      updateItem(index, 'serviceItem', val)
                      const method = (option as any)?.method
                      if (method) updateItem(index, 'methodStandard', method)
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
                  <Input value={text} onChange={e => updateItem(index, 'methodStandard', e.target.value)} />
                )
              },
              {
                title: '数量',
                dataIndex: 'quantity',
                width: 80,
                render: (val, record, index) => (
                  <InputNumber min={1} value={val} onChange={v => updateItem(index, 'quantity', v)} />
                )
              },
              {
                title: '单价',
                dataIndex: 'unitPrice',
                width: 100,
                render: (val, record, index) => (
                  <InputNumber min={0} value={val} prefix="¥" onChange={v => updateItem(index, 'unitPrice', v)} />
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
                  <Button danger type="text" icon={<DeleteOutlined />} onClick={() => removeItem(index)} />
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
                    const ratio = form.getFieldValue('prepaymentRatio') || 0
                    form.setFieldsValue({
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
                  placeholder="如：30"
                  onChange={(val) => {
                    const amount = form.getFieldValue('amount') || 0
                    form.setFieldsValue({
                      prepaymentAmount: amount ? (amount * (val || 0) / 100) : 0,
                    })
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
                  readOnly
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="signDate" label="签订日期" rules={[{ required: true, message: '请选择签订日期' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="startDate" label="合同开始日期" rules={[{ required: true, message: '请选择开始日期' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="endDate" label="合同结束日期" rules={[{ required: true, message: '请选择结束日期' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          {editingId && (
            <Form.Item name="status" label="合同状态">
              <Select options={STATUS_OPTIONS} />
            </Form.Item>
          )}

          <Divider orientationMargin="0">
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

          <Divider orientationMargin="0">合同条款</Divider>

          <Form.Item name="paymentTerms" label="付款条款">
            <Input.TextArea
              rows={2}
              placeholder="例如：合同签订后预付30%，检测完成后支付剩余70%"
            />
          </Form.Item>

          <Form.Item name="deliveryTerms" label="交付条款">
            <Input.TextArea
              rows={2}
              placeholder="例如：检测完成后5个工作日内出具检测报告，报告以电子版和纸质版形式交付"
            />
          </Form.Item>

          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 查看详情抽屉 */}
      <Drawer
        title="合同详情"
        placement="right"
        width={700}
        open={viewDrawerOpen}
        onClose={() => setViewDrawerOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Space>
              {currentContract?.status === 'signed' && (
                <Button type="primary" onClick={() => handleStatusChange('executing')}>开始执行</Button>
              )}
              {currentContract?.status === 'executing' && (
                <Button type="primary" onClick={() => handleStatusChange('completed')}>标记为完成</Button>
              )}
              {!['draft', 'completed', 'terminated'].includes(currentContract?.status || '') && (
                <Button danger onClick={() => handleStatusChange('terminated')}>终止合同</Button>
              )}
            </Space>
            <Button onClick={() => setViewDrawerOpen(false)}>关闭</Button>
          </div>
        }
      >
        {currentContract && (
          <Tabs
            items={[
              {
                key: 'basic',
                label: '基本信息',
                children: (
                  <div>
                    <Descriptions column={2} bordered size="small">
                      <Descriptions.Item label="合同编号">{currentContract.contractNo}</Descriptions.Item>
                      <Descriptions.Item label="客户名称">{currentContract.clientName}</Descriptions.Item>
                      <Descriptions.Item label="明细项数">共 {currentContract.items?.length || 0} 项</Descriptions.Item>
                      <Descriptions.Item label="合计金额">¥{Number(currentContract.amount || 0).toLocaleString()}</Descriptions.Item>
                      <Descriptions.Item label="联系人">{currentContract.clientContact}</Descriptions.Item>
                      <Descriptions.Item label="联系电话">{currentContract.clientPhone}</Descriptions.Item>
                      <Descriptions.Item label="客户地址" span={2}>{currentContract.clientAddress || '-'}</Descriptions.Item>
                      <Descriptions.Item label="合同金额" style={{ fontWeight: 'bold', color: '#f5222d' }}>
                        ¥{currentContract.amount?.toLocaleString()}
                      </Descriptions.Item>
                      <Descriptions.Item label="预付款比例">{currentContract.prepaymentRatio}%</Descriptions.Item>
                      <Descriptions.Item label="预付款金额">
                        ¥{currentContract.prepaymentAmount?.toLocaleString()}
                      </Descriptions.Item>
                      <Descriptions.Item label="签订日期">
                        {currentContract.signDate ? dayjs(currentContract.signDate).format('YYYY-MM-DD') : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="合同开始日期">
                        {currentContract.startDate ? dayjs(currentContract.startDate).format('YYYY-MM-DD') : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="合同结束日期">
                        {currentContract.endDate ? dayjs(currentContract.endDate).format('YYYY-MM-DD') : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="状态">
                        <StatusTag type="contract" status={currentContract.status} />
                      </Descriptions.Item>
                      <Descriptions.Item label="创建日期">
                        {dayjs(currentContract.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                      </Descriptions.Item>
                    </Descriptions>

                    {currentContract.attachmentUrl && (
                      <>
                        <Divider orientationMargin="0">附件</Divider>
                        <Button icon={<FileTextOutlined />}>
                          <a href={currentContract.attachmentUrl} target="_blank" rel="noopener noreferrer">
                            查看盖章合同
                          </a>
                        </Button>
                      </>
                    )}
                  </div>
                ),
              },
              {
                key: 'samples',
                label: '样品信息',
                children: (
                  <Table
                    dataSource={
                      currentContract.contractSamples && currentContract.contractSamples.length > 0
                        ? currentContract.contractSamples
                        : currentContract.sampleName
                          ? [{
                            name: currentContract.sampleName,
                            model: currentContract.sampleModel,
                            material: currentContract.sampleMaterial,
                            quantity: currentContract.sampleQuantity || 1
                          }]
                          : []
                    }
                    rowKey={(record, index) => index?.toString() || '0'}
                    pagination={false}
                    size="small"
                    locale={{ emptyText: '暂无样品信息' }}
                    columns={[
                      { title: '样品名称', dataIndex: 'name', key: 'name' },
                      { title: '规格型号', dataIndex: 'model', key: 'model', render: v => v || '-' },
                      { title: '材质', dataIndex: 'material', key: 'material', render: v => v || '-' },
                      { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 80 },
                      { title: '备注', dataIndex: 'remark', key: 'remark', render: v => v || '-' },
                    ]}
                  />
                )
              },
              {
                key: 'items',
                label: '报价明细',
                children: (
                  <Table
                    dataSource={currentContract.items || []}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    columns={[
                      { title: '检测项目', dataIndex: 'serviceItem' },
                      { title: '方法/标准', dataIndex: 'methodStandard' },
                      { title: '数量', dataIndex: 'quantity', width: 80 },
                      { title: '单价', dataIndex: 'unitPrice', width: 100, render: v => `¥${Number(v).toFixed(2)}` },
                      { title: '总价', dataIndex: 'totalPrice', width: 100, render: v => `¥${Number(v).toFixed(2)}` },
                    ]}
                  />
                )
              },
              {
                key: 'terms',
                label: '合同条款',
                children: (
                  <div>
                    {currentContract.paymentTerms && (
                      <>
                        <h4 style={{ marginBottom: 8 }}>付款条款</h4>
                        <p style={{ marginBottom: 16, background: '#f5f5f5', padding: 12 }}>{currentContract.paymentTerms}</p>
                      </>
                    )}
                    {currentContract.deliveryTerms && (
                      <>
                        <h4 style={{ marginBottom: 8 }}>交付条款</h4>
                        <p style={{ marginBottom: 16, background: '#f5f5f5', padding: 12 }}>{currentContract.deliveryTerms}</p>
                      </>
                    )}
                    {currentContract.qualityTerms && (
                      <>
                        <h4 style={{ marginBottom: 8 }}>质量条款</h4>
                        <p style={{ marginBottom: 16, background: '#f5f5f5', padding: 12 }}>{currentContract.qualityTerms}</p>
                      </>
                    )}
                    {currentContract.confidentialityTerms && (
                      <>
                        <h4 style={{ marginBottom: 8 }}>保密条款</h4>
                        <p style={{ marginBottom: 16, background: '#f5f5f5', padding: 12 }}>{currentContract.confidentialityTerms}</p>
                      </>
                    )}
                    {currentContract.breachTerms && (
                      <>
                        <h4 style={{ marginBottom: 8 }}>违约责任</h4>
                        <p style={{ marginBottom: 16, background: '#f5f5f5', padding: 12 }}>{currentContract.breachTerms}</p>
                      </>
                    )}
                    {currentContract.disputeTerms && (
                      <>
                        <h4 style={{ marginBottom: 8 }}>争议解决</h4>
                        <p style={{ marginBottom: 16, background: '#f5f5f5', padding: 12 }}>{currentContract.disputeTerms}</p>
                      </>
                    )}
                    {currentContract.otherTerms && (
                      <>
                        <h4 style={{ marginBottom: 8 }}>其他条款</h4>
                        <p style={{ marginBottom: 16, background: '#f5f5f5', padding: 12 }}>{currentContract.otherTerms}</p>
                      </>
                    )}
                    {!currentContract.paymentTerms && !currentContract.deliveryTerms && !currentContract.qualityTerms &&
                      !currentContract.confidentialityTerms && !currentContract.breachTerms && !currentContract.disputeTerms && !currentContract.otherTerms && (
                        <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>暂无合同条款</div>
                      )}
                  </div>
                ),
              },
            ]}
          />
        )}
      </Drawer>
    </div >
  )
}
