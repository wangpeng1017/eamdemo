'use client'

import { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, List, Tag, Typography, Space, Button, message, Modal, Input } from 'antd'
import {
  FileTextOutlined,
  ExperimentOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  AuditOutlined,
  ProjectOutlined,
  ArrowRightOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import dayjs from "dayjs"

const { Text } = Typography

interface DashboardStats {
  pendingEntrustments: number
  testingSamples: number
  pendingReports: number
  completedThisMonth: number
  pendingApprovals: number
  myTasks: number
}

interface ApprovalItem {
  id: string
  bizType: string
  bizId: string
  currentStep: number
  status: string
  submitterName: string
  submittedAt: string
  quotation?: { quotationNo: string; subtotal: string; taxTotal: string }
  contract?: { contractNo: string; contractAmount: string }
  client?: { name: string; shortName: string }
}

interface TaskItem {
  id: string
  taskNo: string
  sampleName: string
  status: string
  dueDate: string
  sample?: { sampleNo: string; name: string }
  assignedTo?: { id: string; name: string }
  createdAt: string
}

export default function DashboardPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [stats, setStats] = useState<DashboardStats>({
    pendingEntrustments: 0,
    testingSamples: 0,
    pendingReports: 0,
    completedThisMonth: 0,
    pendingApprovals: 0,
    myTasks: 0,
  })
  const [approvals, setApprovals] = useState<ApprovalItem[]>([])
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)

  // 通过弹窗状态
  const [approveModalOpen, setApproveModalOpen] = useState(false)
  const [approveItemId, setApproveItemId] = useState('')
  const [approveLoading, setApproveLoading] = useState(false)

  // 驳回弹窗状态
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectItemId, setRejectItemId] = useState('')
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    if (session?.user) {
      fetchDashboardData()
    }
  }, [session])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const [statsRes, approvalsRes, tasksRes] = await Promise.all([
        fetch('/api/statistics/dashboard'),
        fetch('/api/dashboard/approvals'),
        fetch('/api/dashboard/my-tasks'),
      ])

      const [statsData, approvalsData, tasksData] = await Promise.all([
        statsRes.json(),
        approvalsRes.json(),
        tasksRes.json(),
      ])

      if (statsData.success) {
        setStats(statsData.data || statsData)
      }

      if (approvalsData.success) {
        setApprovals(approvalsData.data?.list || [])
      }

      if (tasksData.success) {
        setTasks(tasksData.data?.list || [])
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (instanceId: string, action: 'approve' | 'reject', comment: string = '') => {
    try {
      const res = await fetch(`/api/approval/${instanceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          approverId: session?.user?.id,
          approverName: session?.user?.name || '审批人',
          comment,
        }),
      })
      if (res.ok) {
        message.success(action === 'approve' ? '审批通过' : '已驳回')
        fetchDashboardData()
      } else {
        const data = await res.json()
        message.error(data.error || '操作失败')
      }
    } catch {
      message.error('操作失败')
    }
  }

  const getBizTypeTag = (bizType: string) => {
    const typeMap: Record<string, { color: string; text: string }> = {
      quotation: { color: 'blue', text: '报价单' },
      contract: { color: 'green', text: '合同' },
      client: { color: 'orange', text: '客户' },
    }
    const info = typeMap[bizType] || { color: 'default', text: bizType }
    return <Tag color={info.color}>{info.text}</Tag>
  }

  const getStepText = (step: number) => {
    const stepMap: Record<number, string> = {
      1: '销售审批',
      2: '财务审批',
      3: '实验室审批',
    }
    return stepMap[step] || `第${step}级`
  }

  const getTaskStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: 'default',
      '进行中': 'processing',
      '已完成': 'success',
    }
    return colorMap[status] || 'default'
  }

  const getTaskStatusText = (status: string) => {
    const textMap: Record<string, string> = {
      pending: '待开始',
    }
    return textMap[status] || status
  }

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>工作台</h2>

      {/* 关键指标 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title="待处理委托"
              value={loading ? 0 : stats.pendingEntrustments}
              prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title="待审批"
              value={loading ? 0 : stats.pendingApprovals}
              prefix={<AuditOutlined style={{ color: '#faad14' }} />}
              loading={loading}
              valueStyle={stats.pendingApprovals > 0 ? { color: '#faad14' } : undefined}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title="我的任务"
              value={loading ? 0 : stats.myTasks}
              prefix={<ProjectOutlined style={{ color: '#722ed1' }} />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title="检测中样品"
              value={loading ? 0 : stats.testingSamples}
              prefix={<ExperimentOutlined style={{ color: '#13c2c2' }} />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title="待审核报告"
              value={loading ? 0 : stats.pendingReports}
              prefix={<ClockCircleOutlined style={{ color: '#ff4d4f' }} />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title="本月完成"
              value={loading ? 0 : stats.completedThisMonth}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        {/* 待审批 */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <AuditOutlined />
                <span>待审批</span>
                {approvals.length > 0 && (
                  <Tag color="warning">{approvals.length}</Tag>
                )}
              </Space>
            }
            extra={<Link href="/approval">查看全部</Link>}
          >
            {approvals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                暂无待审批事项
              </div>
            ) : (
              <List
                dataSource={approvals.slice(0, 5)}
                renderItem={(item) => {
                  // 根据业务类型生成详情链接
                  const getDetailPath = () => {
                    switch (item.bizType) {
                      case 'quotation':
                        return `/entrustment/quotation`
                      case 'contract':
                        return `/entrustment/contract`
                      case 'client':
                        return `/entrustment/client`
                      default:
                        return null
                    }
                  }
                  const detailPath = getDetailPath()

                  return (
                    <List.Item
                      actions={[
                        <Button
                          key="approve"
                          type="primary"
                          size="small"
                          icon={<CheckOutlined />}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (!session?.user?.id) {
                              message.error('请先登录')
                              return
                            }
                            setApproveItemId(item.id)
                            setApproveModalOpen(true)
                          }}
                        >
                          通过
                        </Button>,
                        <Button
                          key="reject"
                          size="small"
                          danger
                          icon={<CloseOutlined />}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (!session?.user?.id) {
                              message.error('请先登录')
                              return
                            }
                            setRejectItemId(item.id)
                            setRejectReason('')
                            setRejectModalOpen(true)
                          }}
                        >
                          驳回
                        </Button>,
                      ]}
                    >
                      <List.Item.Meta
                        title={
                          <Space>
                            {getBizTypeTag(item.bizType)}
                            {detailPath ? (
                              <Link href={detailPath} style={{ color: '#1890ff' }}>
                                {item.quotation?.quotationNo ||
                                  item.contract?.contractNo ||
                                  item.client?.name ||
                                  item.bizId.substring(0, 8)}
                              </Link>
                            ) : (
                              <Text strong>
                                {item.quotation?.quotationNo ||
                                  item.contract?.contractNo ||
                                  item.client?.name ||
                                  item.bizId.substring(0, 8)}
                              </Text>
                            )}
                          </Space>
                        }
                        description={
                          <Space size="small" wrap>
                            <Text type="secondary">
                              {item.submitterName} 提交
                            </Text>
                            <Tag color="processing">{getStepText(item.currentStep)}</Tag>
                            {item.submittedAt && (
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {new Date(item.submittedAt).toLocaleString('zh-CN', {
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </Text>
                            )}
                          </Space>
                        }
                      />
                    </List.Item>
                  )
                }}
              />
            )}
          </Card>
        </Col>

        {/* 我的任务 */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <ProjectOutlined />
                <span>我的任务</span>
                {tasks.length > 0 && (
                  <Tag color="purple">{tasks.length}</Tag>
                )}
              </Space>
            }
            extra={<Link href="/task/my">查看全部</Link>}
          >
            {tasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                暂无待处理任务
              </div>
            ) : (
              <List
                dataSource={tasks.slice(0, 5)}
                renderItem={(item) => (
                  <List.Item
                    style={{ cursor: 'pointer' }}
                    onClick={() => router.push(`/task/data/${item.id}`)}
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          <Text strong>{item.taskNo}</Text>
                          <Tag color={getTaskStatusColor(item.status)}>
                            {getTaskStatusText(item.status)}
                          </Tag>
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={0}>
                          <Text type="secondary">
                            样品: {item.sample?.name || item.sampleName || '-'}
                          </Text>
                          {item.createdAt && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              创建时间: {dayjs(item.createdAt).format("YYYY-MM-DD HH:mm:ss")}
                            </Text>
                          )}
                          {item.dueDate && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              截止时间: {dayjs(item.dueDate).format("YYYY-MM-DD HH:mm:ss")}
                            </Text>
                          )}
                        </Space>
                      }
                    />
                    <ArrowRightOutlined style={{ color: '#999' }} />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* 通过确认弹窗 */}
      <Modal
        title="确认审批通过"
        open={approveModalOpen}
        confirmLoading={approveLoading}
        onOk={async () => {
          setApproveLoading(true)
          try {
            await handleApprove(approveItemId, 'approve')
            setApproveModalOpen(false)
          } finally {
            setApproveLoading(false)
          }
        }}
        onCancel={() => setApproveModalOpen(false)}
        okText="确认通过"
        cancelText="取消"
      >
        <p>确认后将进入下一环节或完成审批。</p>
      </Modal>

      <Modal
        title="驳回审批"
        open={rejectModalOpen}
        onOk={async () => {
          if (!rejectReason.trim()) {
            message.error('请输入驳回原因')
            return
          }
          await handleApprove(rejectItemId, 'reject', rejectReason)
          setRejectModalOpen(false)
        }}
        onCancel={() => setRejectModalOpen(false)}
      >
        <Input.TextArea
          rows={4}
          placeholder="请输入驳回原因"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>
    </div>
  )
}
