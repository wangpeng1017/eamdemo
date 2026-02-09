'use client'

import { useState, useEffect } from 'react'
import { showSuccess, showError } from '@/lib/confirm'
import {
  Table, Button, Space, Tag, Modal, Form, Input, Select,
  Card, Row, Col, Statistic, Descriptions, Timeline, Popconfirm, Drawer, Tabs
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  SendOutlined, PrinterOutlined
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
  const [data, setData] = useState<ClientReport[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [stats, setStats] = useState<Stats>({})
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [keyword, setKeyword] = useState('')

  // 提交审批弹窗
  const [submitModalOpen, setSubmitModalOpen] = useState(false)
  const [currentReport, setCurrentReport] = useState<ClientReport | null>(null)
  const [submitForm] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  // 查看抽屉
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false)

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
    router.push('/report/client/create')
  }

  const handleEdit = (record: ClientReport) => {
    router.push(`/report/client/edit/${record.id}`)
  }

  const handleView = (record: ClientReport) => {
    setCurrentReport(record)
    setViewDrawerOpen(true)
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

  // 打印
  const handlePrint = (record: ClientReport) => {
    window.open(`/report/client/${record.id}`, '_blank')
  }

  // 提交审批
  const handleSubmitApproval = (record: ClientReport) => {
    setCurrentReport(record)
    submitForm.resetFields()
    setSubmitModalOpen(true)
  }

  const handleSubmitConfirm = async () => {
    if (!currentReport) return
    setSubmitting(true)
    try {
      const values = await submitForm.validateFields()
      const res = await fetch(`/api/report/client/${currentReport.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          operator: values.operator,
          comment: values.comment,
        }),
      })
      const json = await res.json()
      if (json.success) {
        showSuccess('提交审批成功')
        setSubmitModalOpen(false)
        fetchData()
      } else {
        showError(json.error?.message || '提交审批失败')
      }
    } catch (error: any) {
      showError(error.message || '提交审批失败')
    } finally {
      setSubmitting(false)
    }
  }

  const getActions = (record: ClientReport) => {
    const actions = []

    // 查看
    actions.push(
      <Button key="view" size="small" icon={<EyeOutlined />} onClick={() => handleView(record)} />
    )

    // 编辑（草稿可编辑）
    if (record.status === 'draft') {
      actions.push(
        <Button key="edit" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
      )
    }

    // 提交审批（草稿可提交）
    if (record.status === 'draft') {
      actions.push(
        <Button
          key="submit"
          size="small"
          type="primary"
          ghost
          icon={<SendOutlined />}
          onClick={() => handleSubmitApproval(record)}
        >
          提交审批
        </Button>
      )
    }

    // 打印
    actions.push(
      <Button key="print" size="small" icon={<PrinterOutlined />} onClick={() => handlePrint(record)}>
        打印
      </Button>
    )

    // 删除（草稿可删除）
    if (record.status === 'draft') {
      actions.push(
        <Popconfirm key="delete" title="确认删除?" onConfirm={() => handleDelete(record.id)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      )
    }

    return <Space size="small" style={{ whiteSpace: 'nowrap' }}>{actions}</Space>
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
      title: '操作', fixed: 'right', width: 300,
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' as const } }),
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

      {/* 查看抽屉（带审批记录Tab） */}
      <Drawer
        title="报告详情"
        placement="right"
        width={800}
        open={viewDrawerOpen}
        onClose={() => setViewDrawerOpen(false)}
      >
        {currentReport && (
          <Tabs
            defaultActiveKey="basic"
            items={[
              {
                key: 'basic',
                label: '基本信息',
                children: (
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
                    <Descriptions.Item label="创建时间">
                      {dayjs(currentReport.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                    </Descriptions.Item>
                    <Descriptions.Item label="总体结论" span={2}>
                      {currentReport.overallConclusion || '-'}
                    </Descriptions.Item>
                  </Descriptions>
                )
              },
              {
                key: 'approval',
                label: '审批记录',
                children: (
                  <div>
                    {currentReport.approvalFlow?.length > 0 ? (
                      <Timeline
                        items={currentReport.approvalFlow.map((item) => ({
                          color: item.action === 'reject' ? 'red' : 'green',
                          children: (
                            <div>
                              <strong>{actionTextMap[item.action] || item.action}</strong>
                              <span style={{ marginLeft: 8, color: '#999' }}>
                                {item.operator} - {dayjs(item.timestamp).format('YYYY-MM-DD HH:mm')}
                              </span>
                              {item.comment && <div style={{ color: '#666' }}>{item.comment}</div>}
                            </div>
                          ),
                        }))}
                      />
                    ) : (
                      <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>暂无审批记录</div>
                    )}
                  </div>
                )
              }
            ]}
          />
        )}
      </Drawer>

      {/* 提交审批弹窗 */}
      <Modal
        title="提交审批"
        open={submitModalOpen}
        onOk={handleSubmitConfirm}
        onCancel={() => setSubmitModalOpen(false)}
        confirmLoading={submitting}
        okText="确认提交"
        cancelText="取消"
      >
        <Form form={submitForm} layout="vertical">
          <Form.Item name="operator" label="操作人">
            <Input placeholder="请填写操作人" />
          </Form.Item>
          <Form.Item name="comment" label="审批意见">
            <Input.TextArea rows={3} placeholder="选填，可以填写审批意见" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
