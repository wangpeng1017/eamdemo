'use client'

import { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, List, Tag, Progress, Typography, Space, Button } from 'antd'
import {
  FileTextOutlined,
  ExperimentOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const { Text } = Typography

interface DashboardStats {
  pendingEntrustments: number
  testingSamples: number
  pendingReports: number
  completedThisMonth: number
}

interface TodoItem {
  id: string
  type: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  link: string
}

interface RecentItem {
  id: string
  type: 'entrustment' | 'quotation' | 'contract'
  no: string
  client?: string
  status: string
  createdAt: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    pendingEntrustments: 0,
    testingSamples: 0,
    pendingReports: 0,
    completedThisMonth: 0,
  })
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // 并行获取所有数据
      const [statsRes, todosRes, recentRes] = await Promise.all([
        fetch('/api/statistics/dashboard'),
        fetch('/api/todo?status=pending&pageSize=5'),
        fetch('/api/recent-activities?pageSize=5'),
      ])

      const [statsData, todosData, recentData] = await Promise.all([
        statsRes.json(),
        todosRes.json(),
        recentRes.json(),
      ])

      if (statsData.success) {
        setStats(statsData.data || statsData)
      }

      if (todosData.success) {
        setTodos(todosData.data?.list || todosData.list || [])
      }

      if (recentData.success) {
        setRecentItems(recentData.data?.list || recentData.list || [])
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      // 使用模拟数据
      setStats({
        pendingEntrustments: 12,
        testingSamples: 28,
        pendingReports: 5,
        completedThisMonth: 156,
      })
    } finally {
      setLoading(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'error'
      case 'medium':
        return 'warning'
      case 'low':
        return 'default'
      default:
        return 'default'
    }
  }

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high':
        return '高'
      case 'medium':
        return '中'
      case 'low':
        return '低'
      default:
        return '-'
    }
  }

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: 'default',
      in_progress: 'processing',
      completed: 'success',
      approved: 'success',
      rejected: 'error',
    }
    return colorMap[status] || 'default'
  }

  const getStatusText = (status: string) => {
    const textMap: Record<string, string> = {
      pending: '待处理',
      in_progress: '进行中',
      completed: '已完成',
      approved: '已批准',
      rejected: '已拒绝',
    }
    return textMap[status] || status
  }

  const getTypeText = (type: string) => {
    const textMap: Record<string, string> = {
      entrustment: '委托单',
      quotation: '报价单',
      contract: '合同',
      approval: '审批',
      task: '任务',
    }
    return textMap[type] || type
  }

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>工作台</h2>

      {/* 关键指标 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="待处理委托"
              value={loading ? 0 : stats.pendingEntrustments}
              prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="检测中样品"
              value={loading ? 0 : stats.testingSamples}
              prefix={<ExperimentOutlined style={{ color: '#faad14' }} />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="待审核报告"
              value={loading ? 0 : stats.pendingReports}
              prefix={<ClockCircleOutlined style={{ color: '#ff4d4f' }} />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
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
        {/* 待办事项 */}
        <Col xs={24} lg={12}>
          <Card
            title="待办事项"
            extra={<Link href="/todo">查看全部</Link>}
          >
            {todos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                暂无待办事项
              </div>
            ) : (
              <List
                dataSource={todos}
                renderItem={(item) => (
                  <List.Item
                    style={{ cursor: 'pointer' }}
                    onClick={() => router.push(item.link)}
                  >
                    <List.Item.Meta
                      avatar={
                        <Tag color={getPriorityColor(item.priority)}>
                          {getPriorityText(item.priority)}
                        </Tag>
                      }
                      title={
                        <Space>
                          <Text>{item.title}</Text>
                          <Tag color="blue">{getTypeText(item.type)}</Tag>
                        </Space>
                      }
                      description={
                        <Text type="secondary" ellipsis>
                          {item.description}
                        </Text>
                      }
                    />
                    <ArrowRightOutlined style={{ color: '#999' }} />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        {/* 最近活动 */}
        <Col xs={24} lg={12}>
          <Card title="最近活动">
            {recentItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                暂无活动记录
              </div>
            ) : (
              <List
                dataSource={recentItems}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Space>
                          <Text strong>{item.no}</Text>
                          <Tag color={getStatusColor(item.status)}>
                            {getStatusText(item.status)}
                          </Tag>
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={0}>
                          {item.client && (
                            <Text type="secondary">{item.client}</Text>
                          )}
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {item.createdAt}
                          </Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* 快速操作 */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24}>
          <Card title="快速操作">
            <Space wrap>
              <Button type="primary" icon={<FileTextOutlined />} onClick={() => router.push('/entrustment/consultation')}>
                新建咨询
              </Button>
              <Button icon={<FileTextOutlined />} onClick={() => router.push('/entrustment/quotation')}>
                新建报价
              </Button>
              <Button icon={<ExperimentOutlined />} onClick={() => router.push('/sample')}>
                样品登记
              </Button>
              <Button icon={<UserOutlined />} onClick={() => router.push('/approval')}>
                待我审批
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
