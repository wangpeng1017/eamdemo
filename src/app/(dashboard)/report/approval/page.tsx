'use client'

import { useState, useEffect } from 'react'
import { showSuccess, showError } from '@/lib/confirm'
import {
  Table, Button, Space, Tag, Modal, Form, Input, message,
  Card, Row, Col, Statistic, Tabs, Descriptions, Timeline
} from 'antd'
import { CheckOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface ClientReport {
  id: string
  reportNo: string
  projectName: string | null
  clientName: string
  sampleName: string
  preparer: string | null
  reviewer: string | null
  approver: string | null
  status: string
  approvalFlow: ApprovalRecord[]
  createdAt: string
}

interface TestReport {
  id: string
  reportNo: string
  projectName: string | null
  clientName: string | null
  sampleName: string | null
  tester: string | null
  reviewer: string | null
  approver: string | null
  status: string
  createdAt: string
}

interface ApprovalRecord {
  action: string
  operator: string
  comment: string
  timestamp: string
}

const clientStatusMap: Record<string, { text: string; color: string }> = {
  pending_review: { text: '待审核', color: 'processing' },
  pending_approve: { text: '待批准', color: 'warning' },
}

const testStatusMap: Record<string, { text: string; color: string }> = {
  reviewing: { text: '审核中', color: 'processing' },
}

const actionTextMap: Record<string, string> = {
  submit: '提交审核',
  review: '审核通过',
  approve: '批准通过',
  issue: '发放报告',
  reject: '驳回',
}

export default function ReportApprovalPage() {
  const [activeTab, setActiveTab] = useState('client_review')
  const [clientData, setClientData] = useState<ClientReport[]>([])
  const [testData, setTestData] = useState<TestReport[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({
    clientReview: 0,
    clientApprove: 0,
    testReview: 0,
  })

  const [detailOpen, setDetailOpen] = useState(false)
  const [approvalOpen, setApprovalOpen] = useState(false)
  const [currentReport, setCurrentReport] = useState<ClientReport | null>(null)
  const [approvalAction, setApprovalAction] = useState<string>('')
  const [reportType, setReportType] = useState<'client' | 'test'>('client')

  const [approvalForm] = Form.useForm()

  const fetchClientData = async (status: string) => {
    setLoading(true)
    const res = await fetch(`/api/report/client?status=${status}&pageSize=100`)
    const json = await res.json()
    if (json.success) {
      setClientData(json.data.list)
    }
    setLoading(false)
  }

  const fetchTestData = async () => {
    setLoading(true)
    const res = await fetch(`/api/test-report?status=reviewing&pageSize=100`)
    const json = await res.json()
    if (json.success !== false) {
      setTestData(json.list || [])
    }
    setLoading(false)
  }

  const fetchStats = async () => {
    // 获取客户报告统计
    const clientRes = await fetch('/api/report/client?pageSize=1')
    const clientJson = await clientRes.json()
    if (clientJson.success) {
      setStats(prev => ({
        ...prev,
        clientReview: clientJson.data.stats?.pending_review || 0,
        clientApprove: clientJson.data.stats?.pending_approve || 0,
      }))
    }

    // 获取检测报告统计
    const testRes = await fetch('/api/test-report?status=reviewing&pageSize=1')
    const testJson = await testRes.json()
    setStats(prev => ({
      ...prev,
      testReview: testJson.total || 0,
    }))
  }

  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    if (activeTab === 'client_review') {
      fetchClientData('pending_review')
    } else if (activeTab === 'client_approve') {
      fetchClientData('pending_approve')
    } else if (activeTab === 'test_review') {
      fetchTestData()
    }
  }, [activeTab])

  const handleView = async (id: string, type: 'client' | 'test') => {
    if (type === 'client') {
      const res = await fetch(`/api/report/client/${id}`)
      const json = await res.json()
      if (json.success) {
        setCurrentReport(json.data)
        setReportType('client')
        setDetailOpen(true)
      }
    }
  }

  const openApprovalModal = (record: ClientReport | TestReport, action: string, type: 'client' | 'test') => {
    setCurrentReport(record as ClientReport)
    setApprovalAction(action)
    setReportType(type)
    approvalForm.resetFields()
    setApprovalOpen(true)
  }

  const handleApproval = async () => {
    if (!currentReport) return

    const values = await approvalForm.validateFields()
    const url = reportType === 'client'
      ? `/api/report/client/${currentReport.id}`
      : `/api/test-report/${currentReport.id}`

    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: approvalAction,
        operator: values.operator,
        comment: values.comment,
      }),
    })
    const json = await res.json()

    if (json.success !== false) {
      showSuccess('操作成功')
      setApprovalOpen(false)
      fetchStats()
      // 刷新当前列表
      if (activeTab === 'client_review') {
        fetchClientData('pending_review')
      } else if (activeTab === 'client_approve') {
        fetchClientData('pending_approve')
      } else if (activeTab === 'test_review') {
        fetchTestData()
      }
    } else {
      showError(json.error?.message || '操作失败')
    }
  }

  const clientColumns: ColumnsType<ClientReport> = [
    { title: '报告编号', dataIndex: 'reportNo', width: 150 },
    { title: '客户名称', dataIndex: 'clientName', ellipsis: true },
    { title: '样品名称', dataIndex: 'sampleName', ellipsis: true },
    { title: '检测项目', dataIndex: 'projectName', ellipsis: true },
    { title: '编制人', dataIndex: 'preparer', width: 80 },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (s: string) => <Tag color={clientStatusMap[s]?.color}>{clientStatusMap[s]?.text}</Tag>,
    },
    {
      title: '提交时间', dataIndex: 'createdAt', width: 120,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作', fixed: 'right',
      render: (_, record) => (
        <Space style={{ whiteSpace: 'nowrap' }}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record.id, 'client')}/>
          <Button
            size="small"
            type="primary"
            icon={<CheckOutlined />}
            onClick={() => openApprovalModal(record, activeTab === 'client_review' ? 'review' : 'approve', 'client')}
          >
            {activeTab === 'client_review' ? '审核' : '批准'}
          </Button>
          <Button
            size="small"
            danger
            icon={<CloseOutlined />}
            onClick={() => openApprovalModal(record, 'reject', 'client')}
          >
            驳回
          </Button>
        </Space>
      ),
    },
  ]

  const testColumns: ColumnsType<TestReport> = [
    { title: '报告编号', dataIndex: 'reportNo', width: 150 },
    { title: '客户名称', dataIndex: 'clientName', ellipsis: true },
    { title: '样品名称', dataIndex: 'sampleName', ellipsis: true },
    { title: '检测项目', dataIndex: 'projectName', ellipsis: true },
    { title: '检测人', dataIndex: 'tester', width: 80 },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (s: string) => <Tag color={testStatusMap[s]?.color || 'default'}>{testStatusMap[s]?.text || s}</Tag>,
    },
    {
      title: '创建时间', dataIndex: 'createdAt', width: 120,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作', fixed: 'right',
      render: (_, record) => (
        <Space style={{ whiteSpace: 'nowrap' }}>
          <Button
            size="small"
            type="primary"
            icon={<CheckOutlined />}
            onClick={() => openApprovalModal(record, 'approve', 'test')}
          >
            通过
          </Button>
          <Button
            size="small"
            danger
            icon={<CloseOutlined />}
            onClick={() => openApprovalModal(record, 'reject', 'test')}
          >
            驳回
          </Button>
        </Space>
      ),
    },
  ]

  const tabItems = [
    {
      key: 'client_review',
      label: (
        <span>
          客户报告待审核
          {stats.clientReview > 0 && (
            <Tag color="red" style={{ marginLeft: 8 }}>{stats.clientReview}</Tag>
          )}
        </span>
      ),
      children: (
        <Table
          rowKey="id"
          columns={clientColumns}
          dataSource={clientData}
          loading={loading}
          pagination={false}
          scroll={{ x: 1000 }}
        />
      ),
    },
    {
      key: 'client_approve',
      label: (
        <span>
          客户报告待批准
          {stats.clientApprove > 0 && (
            <Tag color="orange" style={{ marginLeft: 8 }}>{stats.clientApprove}</Tag>
          )}
        </span>
      ),
      children: (
        <Table
          rowKey="id"
          columns={clientColumns}
          dataSource={clientData}
          loading={loading}
          pagination={false}
          scroll={{ x: 1000 }}
        />
      ),
    },
    {
      key: 'test_review',
      label: (
        <span>
          检测报告待审核
          {stats.testReview > 0 && (
            <Tag color="blue" style={{ marginLeft: 8 }}>{stats.testReview}</Tag>
          )}
        </span>
      ),
      children: (
        <Table
          rowKey="id"
          columns={testColumns}
          dataSource={testData}
          loading={loading}
          pagination={false}
          scroll={{ x: 1000 }}
        />
      ),
    },
  ]

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="客户报告待审核"
              value={stats.clientReview}
              valueStyle={{ color: stats.clientReview > 0 ? '#cf1322' : undefined }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="客户报告待批准"
              value={stats.clientApprove}
              valueStyle={{ color: stats.clientApprove > 0 ? '#fa8c16' : undefined }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="检测报告待审核"
              value={stats.testReview}
              valueStyle={{ color: stats.testReview > 0 ? '#1890ff' : undefined }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>

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
                <Tag color={clientStatusMap[currentReport.status]?.color}>
                  {clientStatusMap[currentReport.status]?.text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="客户名称">{currentReport.clientName}</Descriptions.Item>
              <Descriptions.Item label="样品名称">{currentReport.sampleName}</Descriptions.Item>
              <Descriptions.Item label="检测项目">{currentReport.projectName || '-'}</Descriptions.Item>
              <Descriptions.Item label="编制人">{currentReport.preparer || '-'}</Descriptions.Item>
            </Descriptions>

            {currentReport.approvalFlow && currentReport.approvalFlow.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h4>审批流程</h4>
                <Timeline
                  items={currentReport.approvalFlow.map((item) => ({
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
              </div>
            )}
          </>
        )}
      </Modal>

      {/* 审批弹窗 */}
      <Modal
        title={approvalAction === 'reject' ? '驳回' : approvalAction === 'review' ? '审核' : '批准'}
        open={approvalOpen}
        onOk={handleApproval}
        onCancel={() => setApprovalOpen(false)}
      >
        <Form form={approvalForm} layout="vertical">
          <Form.Item name="operator" label="操作人" rules={[{ required: true }]}>
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
