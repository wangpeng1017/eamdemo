'use client'

import { useState, useEffect } from 'react'
import { showSuccess, showError } from '@/lib/confirm'
import {
  Table, Button, Space, Tag, Modal, Form, Input, Select, message,
  Card, Row, Col, Statistic, Descriptions, Timeline, Popconfirm
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  SendOutlined, CheckOutlined, CloseOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface ClientReport {
  id: string
  reportNo: string
  projectName: string | null
  clientName: string
  clientAddress: string | null
  sampleName: string
  sampleNo: string | null
  specification: string | null
  sampleQuantity: string | null
  receivedDate: string | null
  testItems: string[] | null
  testStandards: string[] | null
  overallConclusion: string | null
  preparer: string | null
  reviewer: string | null
  approver: string | null
  status: string
  approvalFlow: ApprovalRecord[]
  issuedDate: string | null
  createdAt: string
}

interface ApprovalRecord {
  action: string
  operator: string
  comment: string
  timestamp: string
}

interface Stats {
  [key: string]: number
}

const statusMap: Record<string, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'default' },
  pending_review: { text: '待审核', color: 'processing' },
  pending_approve: { text: '待批准', color: 'warning' },
  approved: { text: '已批准', color: 'success' },
  issued: { text: '已发放', color: 'cyan' },
}

const actionTextMap: Record<string, string> = {
  submit: '提交审核',
  review: '审核通过',
  approve: '批准通过',
  issue: '发放报告',
  reject: '驳回',
}

export default function ClientReportPage() {
  const [data, setData] = useState<ClientReport[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [stats, setStats] = useState<Stats>({})
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [keyword, setKeyword] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [approvalOpen, setApprovalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [currentReport, setCurrentReport] = useState<ClientReport | null>(null)
  const [approvalAction, setApprovalAction] = useState<string>('')

  const [form] = Form.useForm()
  const [approvalForm] = Form.useForm()

  const fetchData = async (p = page) => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(p),
      pageSize: '10',
    })
    if (statusFilter) params.append('status', statusFilter)
    if (keyword) params.append('keyword', keyword)

    const res = await fetch(`/api/report/client?${params}`)
    const json = await res.json()
    if (json.success) {
      setData(json.data.list)
      setTotal(json.data.total)
      setStats(json.data.stats || {})
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [page, statusFilter])

  const handleSearch = () => {
    setPage(1)
    fetchData(1)
  }

  const handleAdd = () => {
    setEditingId(null)
    form.resetFields()
    setModalOpen(true)
  }

  const handleEdit = (record: ClientReport) => {
    setEditingId(record.id)
    form.setFieldsValue({
      ...record,
      receivedDate: record.receivedDate ? dayjs(record.receivedDate).format('YYYY-MM-DD HH:mm:ss') : null,
    })
    setModalOpen(true)
  }

  const handleView = async (id: string) => {
    const res = await fetch(`/api/report/client/${id}`)
    const json = await res.json()
    if (json.success) {
      setCurrentReport(json.data)
      setDetailOpen(true)
    }
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/report/client/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (json.success) {
      showSuccess('删除成功')
      fetchData()
    } else {
      showError(json.error?.message || '删除失败')
    }
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const url = editingId ? `/api/report/client/${editingId}` : '/api/report/client'
    const method = editingId ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    const json = await res.json()

    if (json.success) {
      showSuccess(editingId ? '更新成功' : '创建成功')
      setModalOpen(false)
      fetchData()
    } else {
      showError(json.error?.message || '操作失败')
    }
  }

  const openApprovalModal = (record: ClientReport, action: string) => {
    setCurrentReport(record)
    setApprovalAction(action)
    approvalForm.resetFields()
    setApprovalOpen(true)
  }

  const handleApproval = async () => {
    if (!currentReport) return

    const values = await approvalForm.validateFields()
    const res = await fetch(`/api/report/client/${currentReport.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: approvalAction,
        operator: values.operator,
        comment: values.comment,
      }),
    })
    const json = await res.json()

    if (json.success) {
      showSuccess('操作成功')
      setApprovalOpen(false)
      fetchData()
    } else {
      showError(json.error?.message || '操作失败')
    }
  }

  const getActions = (record: ClientReport) => {
    const actions = []

    actions.push(
      <Button key="view" size="small" icon={<EyeOutlined />} onClick={() => handleView(record.id)} />
    )

    if (record.status === 'draft') {
      actions.push(
        <Button key="edit" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />,
        <Button
          key="submit"
          size="small"
          type="primary"
          icon={<SendOutlined />}
          onClick={() => openApprovalModal(record, 'submit')}
        >
          提交
        </Button>,
        <Popconfirm key="delete" title="确认删除?" onConfirm={() => handleDelete(record.id)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      )
    }

    if (record.status === 'pending_review') {
      actions.push(
        <Button
          key="review"
          size="small"
          type="primary"
          icon={<CheckOutlined />}
          onClick={() => openApprovalModal(record, 'review')}
        >
          审核
        </Button>,
        <Button
          key="reject1"
          size="small"
          danger
          icon={<CloseOutlined />}
          onClick={() => openApprovalModal(record, 'reject')}
        >
          驳回
        </Button>
      )
    }

    if (record.status === 'pending_approve') {
      actions.push(
        <Button
          key="approve"
          size="small"
          type="primary"
          icon={<CheckOutlined />}
          onClick={() => openApprovalModal(record, 'approve')}
        >
          批准
        </Button>,
        <Button
          key="reject2"
          size="small"
          danger
          icon={<CloseOutlined />}
          onClick={() => openApprovalModal(record, 'reject')}
        >
          驳回
        </Button>
      )
    }

    if (record.status === 'approved') {
      actions.push(
        <Button
          key="issue"
          size="small"
          type="primary"
          icon={<SendOutlined />}
          onClick={() => openApprovalModal(record, 'issue')}
        >
          发放
        </Button>
      )
    }

    return <Space wrap style={{ whiteSpace: 'nowrap' }}>{actions}</Space>
  }

  const columns: ColumnsType<ClientReport> = [
    { title: '报告编号', dataIndex: 'reportNo', width: 150 },
    { title: '客户名称', dataIndex: 'clientName', ellipsis: true },
    { title: '样品名称', dataIndex: 'sampleName', ellipsis: true },
    { title: '检测项目', dataIndex: 'projectName', ellipsis: true },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag>,
    },
    { title: '编制人', dataIndex: 'preparer', width: 80 },
    {
      title: '创建时间', dataIndex: 'createdAt', width: 120,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作', fixed: 'right',
      render: (_, record) => getActions(record),
    },
  ]

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card size="small" onClick={() => setStatusFilter(null)} style={{ cursor: 'pointer' }}>
            <Statistic title="全部" value={Object.values(stats).reduce((a, b) => a + b, 0)} />
          </Card>
        </Col>
        {Object.entries(statusMap).map(([key, { text }]) => (
          <Col span={4} key={key}>
            <Card
              size="small"
              onClick={() => setStatusFilter(key)}
              style={{ cursor: 'pointer', borderColor: statusFilter === key ? '#1890ff' : undefined }}
            >
              <Statistic title={text} value={stats[key] || 0} />
            </Card>
          </Col>
        ))}
      </Row>

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space style={{ whiteSpace: 'nowrap' }}>
          <Input.Search
            placeholder="搜索报告编号/客户/样品"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onSearch={handleSearch}
            style={{ width: 300 }}
          />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增报告
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ current: page, total, onChange: setPage }}
        scroll={{ x: 1200 }}
      />

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingId ? '编辑报告' : '新增报告'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={800}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="clientName" label="客户名称" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="clientAddress" label="客户地址">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="sampleName" label="样品名称" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sampleNo" label="样品编号">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="specification" label="规格型号">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sampleQuantity" label="样品数量">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="projectName" label="检测项目">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="preparer" label="编制人">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="overallConclusion" label="总体结论">
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title="报告详情"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={800}
      >
        {currentReport && (
          <>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="报告编号">{currentReport.reportNo}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusMap[currentReport.status]?.color}>
                  {statusMap[currentReport.status]?.text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="客户名称">{currentReport.clientName}</Descriptions.Item>
              <Descriptions.Item label="客户地址">{currentReport.clientAddress || '-'}</Descriptions.Item>
              <Descriptions.Item label="样品名称">{currentReport.sampleName}</Descriptions.Item>
              <Descriptions.Item label="样品编号">{currentReport.sampleNo || '-'}</Descriptions.Item>
              <Descriptions.Item label="规格型号">{currentReport.specification || '-'}</Descriptions.Item>
              <Descriptions.Item label="样品数量">{currentReport.sampleQuantity || '-'}</Descriptions.Item>
              <Descriptions.Item label="检测项目">{currentReport.projectName || '-'}</Descriptions.Item>
              <Descriptions.Item label="编制人">{currentReport.preparer || '-'}</Descriptions.Item>
              <Descriptions.Item label="审核人">{currentReport.reviewer || '-'}</Descriptions.Item>
              <Descriptions.Item label="批准人">{currentReport.approver || '-'}</Descriptions.Item>
              <Descriptions.Item label="总体结论" span={2}>
                {currentReport.overallConclusion || '-'}
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 24 }}>
              <h4>审批流程</h4>
              <Timeline
                items={currentReport.approvalFlow?.map((item) => ({
                  children: (
                    <div>
                      <strong>{actionTextMap[item.action] || item.action}</strong>
                      <span style={{ marginLeft: 8, color: '#999' }}>
                        {item.operator} - {dayjs(item.timestamp).format('YYYY-MM-DD HH:mm')}
                      </span>
                      {item.comment && <div style={{ color: '#666' }}>{item.comment}</div>}
                    </div>
                  ),
                })) || []
              }
              />
            </div>
          </>
        )}
      </Modal>

      {/* 审批弹窗 */}
      <Modal
        title={actionTextMap[approvalAction] || '操作'}
        open={approvalOpen}
        onOk={handleApproval}
        onCancel={() => setApprovalOpen(false)}
      >
        <Form form={approvalForm} layout="vertical">
          <Form.Item
            name="operator"
            label="操作人"
            rules={[{ required: ['review', 'approve'].includes(approvalAction) }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="comment"
            label="备注"
            rules={[{ required: approvalAction === 'reject', message: '驳回时必须填写原因' }]}
          >
            <Input.TextArea rows={3} placeholder={approvalAction === 'reject' ? '请填写驳回原因' : '可选'} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
