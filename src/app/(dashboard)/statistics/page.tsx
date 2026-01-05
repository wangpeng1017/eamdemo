'use client'

import { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic } from 'antd'
import {
  FileTextOutlined,
  ExperimentOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  ToolOutlined,
} from '@ant-design/icons'

interface Stats {
  entrustmentCount: number
  sampleCount: number
  taskCount: number
  reportCount: number
  pendingEntrustments: number
  testingSamples: number
  pendingReports: number
  completedThisMonth: number
}

export default function StatisticsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/statistics')
      .then(res => res.json())
      .then(data => {
        setStats(data)
        setLoading(false)
      })
  }, [])

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
    </div>
  )
}
