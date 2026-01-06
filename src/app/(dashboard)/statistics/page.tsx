'use client'

import { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, Table, Progress, Tabs } from 'antd'
import {
  FileTextOutlined,
  ExperimentOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  ToolOutlined,
  DollarOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

interface Stats {
  entrustmentCount: number
  sampleCount: number
  taskCount: number
  reportCount: number
  pendingEntrustments: number
  testingSamples: number
  pendingReports: number
  completedThisMonth: number
  monthlyTrend?: Array<{
    month: string
    entrustments: number
    samples: number
    reports: number
  }>
  topClients?: Array<{ clientName: string; count: number }>
  sampleStatusDist?: Array<{ status: string; count: number }>
  taskStatusDist?: Array<{ status: string; count: number }>
  assigneeStats?: Array<{ assignee: string; count: number }>
  financeStats?: {
    totalReceivable: number
    totalReceived: number
    monthReceived: number
    yearReceived: number
    pendingInvoice: number
  }
  deviceStats?: Array<{ status: string; count: number }>
}

const sampleStatusText: Record<string, string> = {
  received: '已收样',
  testing: '检测中',
  completed: '已完成',
  returned: '已归还',
  destroyed: '已销毁',
}

const taskStatusText: Record<string, string> = {
  pending: '待开始',
  in_progress: '进行中',
  completed: '已完成',
  transferred: '已转交',
}

const deviceStatusText: Record<string, string> = {
  Running: '运行中',
  Maintenance: '维护中',
  Idle: '空闲',
  Scrapped: '已报废',
}

export default function StatisticsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/statistics?type=full')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStats(data.data)
        } else {
          setStats(data)
        }
        setLoading(false)
      })
  }, [])

  const trendColumns: ColumnsType<{ month: string; entrustments: number; samples: number; reports: number }> = [
    { title: '月份', dataIndex: 'month', width: 100 },
    { title: '委托数', dataIndex: 'entrustments', width: 80 },
    { title: '样品数', dataIndex: 'samples', width: 80 },
    { title: '报告数', dataIndex: 'reports', width: 80 },
    {
      title: '趋势',
      key: 'trend',
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <div style={{ width: record.entrustments * 3, height: 16, background: '#1890ff', borderRadius: 2 }} />
        </div>
      ),
    },
  ]

  const clientColumns: ColumnsType<{ clientName: string; count: number }> = [
    { title: '排名', key: 'rank', width: 60, render: (_, __, i) => i + 1 },
    { title: '客户名称', dataIndex: 'clientName', ellipsis: true },
    { title: '委托数', dataIndex: 'count', width: 80 },
    {
      title: '占比',
      key: 'percent',
      width: 150,
      render: (_, record) => {
        const total = stats?.topClients?.reduce((a, b) => a + b.count, 0) || 1
        const percent = Math.round((record.count / total) * 100)
        return <Progress percent={percent} size="small" />
      },
    },
  ]

  const assigneeColumns: ColumnsType<{ assignee: string; count: number }> = [
    { title: '排名', key: 'rank', width: 60, render: (_, __, i) => i + 1 },
    { title: '人员', dataIndex: 'assignee' },
    { title: '任务数', dataIndex: 'count', width: 80 },
    {
      title: '工作量',
      key: 'workload',
      width: 150,
      render: (_, record) => {
        const max = Math.max(...(stats?.assigneeStats?.map((a) => a.count) || [1]))
        const percent = Math.round((record.count / max) * 100)
        return <Progress percent={percent} size="small" strokeColor="#52c41a" />
      },
    },
  ]

  const tabItems = [
    {
      key: 'entrustment',
      label: '委托统计',
      children: (
        <Row gutter={16}>
          <Col span={12}>
            <Card title="月度委托趋势（近6个月）" size="small">
              <Table
                rowKey="month"
                columns={trendColumns}
                dataSource={stats?.monthlyTrend || []}
                pagination={false}
                size="small"
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="客户委托排行 Top 10" size="small">
              <Table
                rowKey="clientName"
                columns={clientColumns}
                dataSource={stats?.topClients || []}
                pagination={false}
                size="small"
              />
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'sample',
      label: '样品统计',
      children: (
        <Row gutter={16}>
          <Col span={12}>
            <Card title="样品状态分布" size="small">
              {stats?.sampleStatusDist?.map((item) => {
                const total = stats.sampleStatusDist?.reduce((a, b) => a + b.count, 0) || 1
                const percent = Math.round((item.count / total) * 100)
                return (
                  <div key={item.status} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>{sampleStatusText[item.status] || item.status}</span>
                      <span>{item.count} ({percent}%)</span>
                    </div>
                    <Progress percent={percent} showInfo={false} strokeColor="#52c41a" />
                  </div>
                )
              })}
            </Card>
          </Col>
          <Col span={12}>
            <Card title="样品月度接收趋势" size="small">
              <Table
                rowKey="month"
                columns={[
                  { title: '月份', dataIndex: 'month' },
                  { title: '接收数量', dataIndex: 'samples' },
                  {
                    title: '趋势',
                    key: 'trend',
                    render: (_, record) => (
                      <div style={{ width: record.samples * 5, height: 16, background: '#52c41a', borderRadius: 2 }} />
                    ),
                  },
                ]}
                dataSource={stats?.monthlyTrend || []}
                pagination={false}
                size="small"
              />
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'task',
      label: '任务统计',
      children: (
        <Row gutter={16}>
          <Col span={12}>
            <Card title="任务状态分布" size="small">
              {stats?.taskStatusDist?.map((item) => {
                const total = stats.taskStatusDist?.reduce((a, b) => a + b.count, 0) || 1
                const percent = Math.round((item.count / total) * 100)
                const colors: Record<string, string> = {
                  pending: '#faad14',
                  in_progress: '#1890ff',
                  completed: '#52c41a',
                  transferred: '#722ed1',
                }
                return (
                  <div key={item.status} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>{taskStatusText[item.status] || item.status}</span>
                      <span>{item.count} ({percent}%)</span>
                    </div>
                    <Progress percent={percent} showInfo={false} strokeColor={colors[item.status] || '#1890ff'} />
                  </div>
                )
              })}
            </Card>
          </Col>
          <Col span={12}>
            <Card title="人员任务量排行 Top 10" size="small">
              <Table
                rowKey="assignee"
                columns={assigneeColumns}
                dataSource={stats?.assigneeStats || []}
                pagination={false}
                size="small"
              />
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'finance',
      label: '财务统计',
      children: (
        <Row gutter={16}>
          <Col span={24}>
            <Row gutter={16}>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="应收总额"
                    value={Number(stats?.financeStats?.totalReceivable || 0)}
                    precision={2}
                    prefix="¥"
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="已收总额"
                    value={Number(stats?.financeStats?.totalReceived || 0)}
                    precision={2}
                    prefix="¥"
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="本月收款"
                    value={Number(stats?.financeStats?.monthReceived || 0)}
                    precision={2}
                    prefix="¥"
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="本年收款"
                    value={Number(stats?.financeStats?.yearReceived || 0)}
                    precision={2}
                    prefix="¥"
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
            </Row>
            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col span={12}>
                <Card title="收款完成率" size="small">
                  <Progress
                    type="circle"
                    percent={Math.round(
                      ((Number(stats?.financeStats?.totalReceived) || 0) /
                        (Number(stats?.financeStats?.totalReceivable) || 1)) *
                        100
                    )}
                    format={(percent) => `${percent}%`}
                  />
                  <div style={{ marginTop: 16 }}>
                    <p>待收金额：¥{(Number(stats?.financeStats?.totalReceivable || 0) - Number(stats?.financeStats?.totalReceived || 0)).toLocaleString()}</p>
                    <p>待开票数：{stats?.financeStats?.pendingInvoice || 0}</p>
                  </div>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="设备状态分布" size="small">
                  {stats?.deviceStats?.map((item) => {
                    const total = stats.deviceStats?.reduce((a, b) => a + b.count, 0) || 1
                    const percent = Math.round((item.count / total) * 100)
                    const colors: Record<string, string> = {
                      Running: '#52c41a',
                      Maintenance: '#faad14',
                      Idle: '#1890ff',
                      Scrapped: '#ff4d4f',
                    }
                    return (
                      <div key={item.status} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span>{deviceStatusText[item.status] || item.status}</span>
                          <span>{item.count} ({percent}%)</span>
                        </div>
                        <Progress percent={percent} showInfo={false} strokeColor={colors[item.status] || '#1890ff'} />
                      </div>
                    )
                  })}
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>
      ),
    },
  ]

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>统计报表</h2>

      <h3 style={{ marginBottom: 16 }}>业务概览</h3>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="委托总数"
              value={stats?.entrustmentCount || 0}
              prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="样品总数"
              value={stats?.sampleCount || 0}
              prefix={<ExperimentOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="检测任务"
              value={stats?.taskCount || 0}
              prefix={<ToolOutlined style={{ color: '#faad14' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="报告总数"
              value={stats?.reportCount || 0}
              prefix={<TeamOutlined style={{ color: '#722ed1' }} />}
            />
          </Card>
        </Col>
      </Row>

      <h3 style={{ marginTop: 32, marginBottom: 16 }}>待办统计</h3>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="待处理委托"
              value={stats?.pendingEntrustments || 0}
              prefix={<ClockCircleOutlined style={{ color: '#ff4d4f' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="检测中样品"
              value={stats?.testingSamples || 0}
              prefix={<ExperimentOutlined style={{ color: '#faad14' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="待审核报告"
              value={stats?.pendingReports || 0}
              prefix={<FileTextOutlined style={{ color: '#ff4d4f' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="本月完成"
              value={stats?.completedThisMonth || 0}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
      </Row>

      <h3 style={{ marginTop: 32, marginBottom: 16 }}>详细统计</h3>
      <Card loading={loading}>
        <Tabs items={tabItems} />
      </Card>
    </div>
  )
}
