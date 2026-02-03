
/**
 * @file page.tsx
 * @desc 控制台仪表盘页面
 */
'use client'

import { Card, Row, Col, Statistic, Progress, List, Tag } from 'antd'
import {
  FundOutlined,
  ToolOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import { mockEquipments, mockRepairOrders } from '@/data/mock-data'

export default function DashboardPage() {
  // 设备统计
  const equipmentStats = {
    total: mockEquipments.length,
    running: mockEquipments.filter((e) => e.status === 'running').length,
    maintenance: mockEquipments.filter((e) => e.status === 'maintenance').length,
    repair: mockEquipments.filter((e) => e.status === 'repair').length,
  }

  // 维修工单统计
  const repairStats = {
    total: mockRepairOrders.length,
    pending: mockRepairOrders.filter((r) => r.status === 'pending').length,
    processing: mockRepairOrders.filter((r) => r.status === 'processing' || r.status === 'assigned').length,
    completed: mockRepairOrders.filter((r) => r.status === 'completed' || r.status === 'closed').length,
  }

  // 设备运行率
  const runningRate = (equipmentStats.running / equipmentStats.total) * 100

  // 维修完成率
  const completeRate = (repairStats.completed / repairStats.total) * 100

  // 最近维修工单
  const recentRepairs = mockRepairOrders.slice(0, 5)

  // 设备告警
  const alerts = mockEquipments
    .filter((e) => e.status === 'repair' || e.status === 'maintenance')
    .slice(0, 5)

  return (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 600, color: '#00405C', marginBottom: 24 }}>
        控制台
      </h2>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="设备总数"
              value={equipmentStats.total}
              suffix="台"
              prefix={<FundOutlined />}
              valueStyle={{ color: '#00405C' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="运行中"
              value={equipmentStats.running}
              suffix="台"
              valueStyle={{ color: '#2BA471' }}
            />
            <Progress percent={parseFloat(runningRate.toFixed(1))} showInfo={false} strokeColor="#2BA471" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="维修工单"
              value={repairStats.total}
              suffix="条"
              prefix={<ToolOutlined />}
              valueStyle={{ color: '#0097BA' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已完成"
              value={repairStats.completed}
              suffix="条"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#2BA471' }}
            />
            <Progress percent={completeRate.toFixed(1)} showInfo={false} strokeColor="#2BA471" />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        {/* 设备状态分布 */}
        <Col span={12}>
          <Card title="设备状态分布" style={{ height: 400 }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>运行中</span>
                <span style={{ color: '#2BA471', fontWeight: 600 }}>
                  {equipmentStats.running} 台
                </span>
              </div>
              <Progress percent={(equipmentStats.running / equipmentStats.total) * 100} strokeColor="#2BA471" showInfo={false} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>保养中</span>
                <span style={{ color: '#E37318', fontWeight: 600 }}>
                  {equipmentStats.maintenance} 台
                </span>
              </div>
              <Progress
                percent={(equipmentStats.maintenance / equipmentStats.total) * 100}
                strokeColor="#E37318"
                showInfo={false}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>维修中</span>
                <span style={{ color: '#D54941', fontWeight: 600 }}>
                  {equipmentStats.repair} 台
                </span>
              </div>
              <Progress percent={(equipmentStats.repair / equipmentStats.total) * 100} strokeColor="#D54941" showInfo={false} />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>其他状态</span>
                <span style={{ color: '#999', fontWeight: 600 }}>
                  {equipmentStats.total - equipmentStats.running - equipmentStats.maintenance - equipmentStats.repair} 台
                </span>
              </div>
              <Progress
                percent={
                  ((equipmentStats.total - equipmentStats.running - equipmentStats.maintenance - equipmentStats.repair) /
                    equipmentStats.total) *
                  100
                }
                strokeColor="#999"
                showInfo={false}
              />
            </div>
          </Card>
        </Col>

        {/* 最近维修工单 */}
        <Col span={12}>
          <Card title="最近维修工单" style={{ height: 400 }}>
            <List
              dataSource={recentRepairs}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{item.orderNo}</span>
                        <Tag color={item.status === 'closed' ? '#2BA471' : '#E37318'}>
                          {item.status === 'closed' ? '已关闭' : '处理中'}
                        </Tag>
                      </div>
                    }
                    description={
                      <div>
                        <div>{item.equipmentName} - {item.faultDescription}</div>
                        <div style={{ marginTop: 4, fontSize: 12 }}>
                          {item.reporter} · {new Date(item.reportTime).toLocaleDateString()}
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* 设备告警 */}
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card
            title={
              <span>
                <ExclamationCircleOutlined style={{ color: '#E37318', marginRight: 8 }} />
                设备告警
              </span>
            }
          >
            {alerts.length > 0 ? (
              <List
                grid={{ gutter: 16, column: 4 }}
                dataSource={alerts}
                renderItem={(item) => (
                  <List.Item>
                    <Card size="small" style={{ borderLeft: `4px solid ${item.status === 'repair' ? '#D54941' : '#E37318'}` }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {item.location} · {item.status === 'repair' ? '维修中' : '保养中'}
                      </div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        负责人：{item.responsiblePerson}
                      </div>
                    </Card>
                  </List.Item>
                )}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                暂无告警信息
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
