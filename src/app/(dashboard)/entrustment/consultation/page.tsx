'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Space, Modal, Form, Input, Select, DatePicker, message, Drawer, Tag, Row, Col, Radio, InputNumber, Divider } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, HistoryOutlined, FileTextOutlined } from '@ant-design/icons'
import { StatusTag } from '@/components/StatusTag'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface Consultation {
  id: string
  consultationNo: string
  clientCompany: string | null
  contactPerson: string | null
  contactPhone: string | null
  clientEmail?: string | null
  clientAddress?: string | null
  sampleName?: string | null
  sampleModel?: string | null
  sampleMaterial?: string | null
  estimatedQuantity?: string | null
  testItems?: string[]
  testPurpose?: string | null
  expectedDeadline?: string | null
  clientRequirements?: string | null
  budgetRange?: string | null
  feasibility?: string | null
  feasibilityNote?: string | null
  estimatedPrice?: number | null
  follower?: string | null
  sampleInfo?: string | null
  testRequirements?: string | null
  status: string
  createdAt: string
  followUps?: ConsultationFollowUp[]
}

interface ConsultationFollowUp {
  id: string
  date: string
  type: string
  content: string
  nextAction?: string
  operator: string
}

const FEASIBILITY_OPTIONS = [
  { value: 'feasible', label: '可行' },
  { value: 'difficult', label: '困难' },
  { value: 'infeasible', label: '不可行' },
]

const TEST_ITEM_OPTIONS = [
  { value: '机械性能测试', label: '机械性能测试' },
  { value: '化学成分分析', label: '化学成分分析' },
  { value: '金相检验', label: '金相检验' },
  { value: '无损检测', label: '无损检测' },
  { value: '尺寸测量', label: '尺寸测量' },
  { value: '盐雾试验', label: '盐雾试验' },
  { value: '硬度测试', label: '硬度测试' },
  { value: '拉伸试验', label: '拉伸试验' },
  { value: '冲击试验', label: '冲击试验' },
  { value: '弯曲试验', label: '弯曲试验' },
]

const FOLLOWUP_TYPE_OPTIONS = [
  { value: 'phone', label: '电话' },
  { value: 'email', label: '邮件' },
  { value: 'visit', label: '拜访' },
  { value: 'other', label: '其他' },
]

export default function ConsultationPage() {
  const [data, setData] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [followUpDrawerOpen, setFollowUpDrawerOpen] = useState(false)
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [currentConsultation, setCurrentConsultation] = useState<Consultation | null>(null)
  const [followUps, setFollowUps] = useState<ConsultationFollowUp[]>([])
  const [followUpLoading, setFollowUpLoading] = useState(false)
  const [form] = Form.useForm()
  const [followUpForm] = Form.useForm()
  const [filters, setFilters] = useState<any>({})

  const fetchData = async (p = page, f = filters) => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(p),
      pageSize: '10',
      ...Object.fromEntries(Object.entries(f).filter(([_, v]) => v !== undefined && v !== '')),
    })
    const res = await fetch(`/api/consultation?${params}`)
    const json = await res.json()
    setData(json.list)
    setTotal(json.total)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [page])

  const handleAdd = () => {
    setEditingId(null)
    form.resetFields()
    setModalOpen(true)
  }

  const handleEdit = (record: Consultation) => {
    setEditingId(record.id)
    const formData = {
      ...record,
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

  const handleFollowUps = async (record: Consultation) => {
    setCurrentConsultation(record)
    setFollowUpDrawerOpen(true)
    await fetchFollowUps(record.id)
  }

  const fetchFollowUps = async (id: string) => {
    setFollowUpLoading(true)
    const res = await fetch(`/api/consultation/${id}/follow-ups`)
    const json = await res.json()
    setFollowUps(json)
    setFollowUpLoading(false)
  }

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条咨询记录吗？',
      onOk: async () => {
        await fetch(`/api/consultation/${id}`, { method: 'DELETE' })
        message.success('删除成功')
        fetchData()
      },
    })
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const submitData = {
      ...values,
      expectedDeadline: values.expectedDeadline ? values.expectedDeadline.toISOString() : null,
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

  const handleAddFollowUp = async () => {
    const values = await followUpForm.validateFields()
    await fetch(`/api/consultation/${currentConsultation!.id}/follow-ups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...values,
        date: values.date.toISOString(),
      }),
    })
    message.success('跟进记录添加成功')
    followUpForm.resetFields()
    fetchFollowUps(currentConsultation!.id)
  }

  const handleDeleteFollowUp = async (followUpId: string) => {
    await fetch(`/api/consultation/${currentConsultation!.id}/follow-ups/${followUpId}`, {
      method: 'DELETE',
    })
    message.success('删除成功')
    fetchFollowUps(currentConsultation!.id)
  }

  const handleStatusChange = async (status: string) => {
    await fetch(`/api/consultation/${currentConsultation!.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    message.success('状态更新成功')
    fetchData()
    setViewDrawerOpen(false)
  }

  const columns: ColumnsType<Consultation> = [
    { title: '咨询单号', dataIndex: 'consultationNo', width: 150 },
    { title: '客户公司', dataIndex: 'clientCompany', ellipsis: true },
    { title: '联系人', dataIndex: 'contactPerson', width: 100 },
    { title: '联系电话', dataIndex: 'contactPhone', width: 130 },
    {
      title: '跟进人',
      dataIndex: 'follower',
      width: 100,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s: string) => <StatusTag type="consultation" status={s} />
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 120,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD')
    },
    {
      title: '操作',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record)}>查看</Button>
          <Button size="small" icon={<HistoryOutlined />} onClick={() => handleFollowUps(record)}>跟进</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
        </Space>
      )
    }
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>委托咨询管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增咨询</Button>
      </div>

      {/* 筛选条件 */}
      <div style={{ background: '#f5f5f5', padding: 16, marginBottom: 16, borderRadius: 4 }}>
        <Form layout="inline" onFinish={(values) => { setFilters(values); setPage(1); fetchData(1, values) }}>
          <Form.Item name="keyword" label="关键词">
            <Input placeholder="咨询单号/客户/联系人" allowClear />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select placeholder="全部" allowClear style={{ width: 120 }}>
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
        scroll={{ x: 1400 }}
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
              <Form.Item name="clientCompany" label="客户公司" rules={[{ required: true, message: '请输入客户公司' }]}>
                <Input placeholder="请输入客户公司名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="contactPerson" label="联系人" rules={[{ required: true, message: '请输入联系人' }]}>
                <Input placeholder="请输入联系人姓名" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="contactPhone" label="联系电话" rules={[{ required: true, message: '请输入联系电话' }]}>
                <Input placeholder="请输入联系电话" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="clientEmail" label="客户邮箱">
                <Input placeholder="请输入客户邮箱" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="clientAddress" label="客户地址">
            <Input placeholder="请输入客户地址" />
          </Form.Item>

          <Divider orientationMargin="0">样品信息</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="sampleName" label="样品名称">
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
              <Form.Item name="sampleMaterial" label="样品材质">
                <Input placeholder="请输入样品材质" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="estimatedQuantity" label="预估数量">
                <Input placeholder="请输入预估数量" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="testItems" label="检测项目（多选）">
            <Select mode="multiple" options={TEST_ITEM_OPTIONS} placeholder="请选择检测项目" />
          </Form.Item>

          <Form.Item name="testPurpose" label="检测目的">
            <Input.TextArea rows={2} placeholder="请输入检测目的" />
          </Form.Item>

          <Divider orientationMargin="0">其他信息</Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="expectedDeadline" label="期望交付日期">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="follower" label="跟进人">
                <Input placeholder="请输入跟进人" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="budgetRange" label="预算范围">
                <Input placeholder="例如：5000-10000元" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="estimatedPrice" label="预估报价">
                <InputNumber style={{ width: '100%' }} min={0} precision={2} placeholder="请输入预估报价" />
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

          <Form.Item name="clientRequirements" label="客户要求">
            <Input.TextArea rows={3} placeholder="请输入客户的特殊要求" />
          </Form.Item>

          {editingId && (
            <Form.Item name="status" label="状态">
              <Select>
                <Select.Option value="following">跟进中</Select.Option>
                <Select.Option value="quoted">已报价</Select.Option>
                <Select.Option value="rejected">已拒绝</Select.Option>
                <Select.Option value="closed">已关闭</Select.Option>
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* 查看详情抽屉 */}
      <Drawer
        title="咨询详情"
        placement="right"
        width={600}
        open={viewDrawerOpen}
        onClose={() => setViewDrawerOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Space>
              {currentConsultation?.status === 'following' && (
                <>
                  <Button onClick={() => handleStatusChange('quoted')}>标记为已报价</Button>
                  <Button onClick={() => handleStatusChange('rejected')}>标记为已拒绝</Button>
                </>
              )}
              <Button danger onClick={() => handleStatusChange('closed')}>关闭咨询</Button>
            </Space>
            <Button type="primary" onClick={() => { setViewDrawerOpen(false); setFollowUpDrawerOpen(true); fetchFollowUps(currentConsultation!.id) }}>
              查看跟进记录
            </Button>
          </div>
        }
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

      {/* 跟进记录抽屉 */}
      <Drawer
        title="跟进记录"
        placement="right"
        width={500}
        open={followUpDrawerOpen}
        onClose={() => setFollowUpDrawerOpen(false)}
      >
        <div style={{ marginBottom: 16 }}>
          <Form form={followUpForm} layout="vertical" onFinish={handleAddFollowUp}>
            <Form.Item name="date" label="跟进日期" rules={[{ required: true }]} initialValue={dayjs()}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="type" label="跟进方式" rules={[{ required: true }]}>
              <Select options={FOLLOWUP_TYPE_OPTIONS} placeholder="请选择" />
            </Form.Item>
            <Form.Item name="content" label="跟进内容" rules={[{ required: true }]}>
              <Input.TextArea rows={4} placeholder="请输入跟进内容" />
            </Form.Item>
            <Form.Item name="nextAction" label="后续计划">
              <Input placeholder="请输入后续计划" />
            </Form.Item>
            <Form.Item name="operator" label="跟进人" rules={[{ required: true }]} initialValue="当前用户">
              <Input />
            </Form.Item>
            <Button type="primary" htmlType="submit" block>添加跟进记录</Button>
          </Form>
        </div>

        <Divider />

        <div>
          <h4>历史跟进记录</h4>
          {followUpLoading ? (
            <div style={{ textAlign: 'center', padding: 20 }}>加载中...</div>
          ) : followUps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>暂无跟进记录</div>
          ) : (
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {followUps.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: '#f5f5f5',
                    padding: 12,
                    borderRadius: 4,
                    marginBottom: 12
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Tag color={item.type === 'visit' ? 'blue' : item.type === 'phone' ? 'green' : 'orange'}>
                      {FOLLOWUP_TYPE_OPTIONS.find(o => o.value === item.type)?.label}
                    </Tag>
                    <span style={{ fontSize: 12, color: '#999' }}>
                      {dayjs(item.date).format('YYYY-MM-DD')}
                    </span>
                  </div>
                  <div style={{ marginBottom: 8 }}>{item.content}</div>
                  {item.nextAction && (
                    <div style={{ fontSize: 12, color: '#666' }}>
                      <strong>后续计划：</strong>{item.nextAction}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                    跟进人：{item.operator}
                  </div>
                  <Button
                    size="small"
                    danger
                    type="link"
                    style={{ padding: 0, marginTop: 8 }}
                    onClick={() => handleDeleteFollowUp(item.id)}
                  >
                    删除
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Drawer>
    </div>
  )
}

// 详情展示组件
function Descriptions({ title, data }: { title: string; data: Consultation }) {
  const items = [
    { label: '咨询单号', value: data.consultationNo },
    { label: '客户公司', value: data.clientCompany },
    { label: '联系人', value: data.contactPerson },
    { label: '联系电话', value: data.contactPhone },
    { label: '客户邮箱', value: data.clientEmail },
    { label: '客户地址', value: data.clientAddress },
    { label: '样品名称', value: data.sampleName },
    { label: '规格型号', value: data.sampleModel },
    { label: '样品材质', value: data.sampleMaterial },
    { label: '预估数量', value: data.estimatedQuantity },
    { label: '检测项目', value: data.testItems?.join(', ') },
    { label: '检测目的', value: data.testPurpose },
    { label: '期望交付日期', value: data.expectedDeadline ? dayjs(data.expectedDeadline).format('YYYY-MM-DD') : '-' },
    { label: '预算范围', value: data.budgetRange },
    { label: '预估报价', value: data.estimatedPrice ? `¥${data.estimatedPrice}` : '-' },
    { label: '可行性评估', value: <StatusTag type="feasibility" status={data.feasibility} /> },
    { label: '可行性说明', value: data.feasibilityNote },
    { label: '客户要求', value: data.clientRequirements },
    { label: '跟进人', value: data.follower },
    { label: '状态', value: <StatusTag type="consultation" status={data.status} /> },
    { label: '创建时间', value: dayjs(data.createdAt).format('YYYY-MM-DD HH:mm:ss') },
  ]

  const relevantItems = title === '基本信息'
    ? items.slice(0, 7)
    : title === '样品信息'
      ? items.slice(7, 13)
      : items.slice(13)

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
