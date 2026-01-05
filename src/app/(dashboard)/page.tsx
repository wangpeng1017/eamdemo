'use client'

import { Card, Row, Col, Statistic } from 'antd'
import {
  FileTextOutlined,
  ExperimentOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'

export default function DashboardPage() {
  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>工作台</h2>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="待处理委托"
              value={12}
              prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="检测中样品"
              value={28}
              prefix={<ExperimentOutlined style={{ color: '#faad14' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="待审核报告"
              value={5}
              prefix={<ClockCircleOutlined style={{ color: '#ff4d4f' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="本月完成"
              value={156}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="待办事项">
            <p style={{ color: '#999' }}>暂无待办事项</p>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="最近委托">
            <p style={{ color: '#999' }}>暂无委托记录</p>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
