/**
 * @file page.tsx
 * @desc 状态监测详情页面
 */
'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  Card,
  Descriptions,
  Button,
  Space,
  Tag,
  Tabs,
  Table,
  Row,
  Col,
  Statistic,
  Progress,
  Badge,
  Alert,
} from 'antd'
import {
  ArrowLeftOutlined,
  LineChartOutlined,
  BellOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import {
  mockMonitorPoints,
  mockMonitorData,
  mockAlarmRecords,
  mockTrendAnalyses,
} from '@/data/monitoring-data'
import {
  MonitorPoint,
  MonitorStatus,
  monitorStatusMap,
  monitorPointTypeMap,
} from '@/lib/monitoring-types'
import dayjs from 'dayjs'

export default function MonitoringDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [point] = useState<MonitorPoint | undefined>(
    mockMonitorPoints.find((p) => p.id === params.id)
  )

  if (!point) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <h2>监测点不存在</h2>
        <Button onClick={() => router.back()}>返回</Button>
      </div>
    )
  }

  const monitorDataList = mockMonitorData.filter(d => d.pointId === point.id).slice(0, 20)
  const alarmList = mockAlarmRecords.filter(a => a.pointId === point.id)
  const trendAnalysis = mockTrendAnalyses.find(t => t.pointId === point.id)

  const statusConfig = monitorStatusMap[point.status]
  const typeConfig = monitorPointTypeMap[point.pointType]

  // 计算当前值在阈值范围内的百分比
  const percent = ((point.currentValue - point.lowerLimit) / (point.upperLimit - point.lowerLimit)) * 100

  // 监测数据列
  const dataColumns = [
    {
      title: '采集时间',
      dataIndex: 'collectTime',
      key: 'collectTime',
      width: 180,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '监测值',
      dataIndex: 'value',
      key: 'value',
      width: 150,
      render: (value: number) => (
        <span style={{ fontSize: 16, fontWeight: 600 }}>
          {value.toFixed(2)} {typeConfig.unit}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: MonitorStatus) => {
        const config = monitorStatusMap[status]
        return <Tag color={config.color}>{config.label}</Tag>
      },
    },
    {
      title: '采集方式',
      dataIndex: 'collector',
      key: 'collector',
      width: 100,
      render: (collector: string) => (collector === 'auto' ? '自动采集' : '手动录入'),
    },
  ]

  // 报警记录列
  const alarmColumns = [
    {
      title: '报警编号',
      dataIndex: 'alarmNo',
      key: 'alarmNo',
      width: 180,
    },
    {
      title: '报警级别',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      render: (level: string) => {
        const levelMap: Record<string, { label: string; color: string }> = {
          info: { label: '提示', color: 'blue' },
          warning: { label: '预警', color: 'orange' },
          critical: { label: '严重', color: 'red' },
          emergency: { label: '紧急', color: 'magenta' },
        }
        const config = levelMap[level] || levelMap.info
        return <Tag color={config.color}>{config.label}</Tag>
      },
    },
    {
      title: '报警值',
      dataIndex: 'alarmValue',
      key: 'alarmValue',
      width: 120,
      render: (value: number) => `${value.toFixed(2)} ${typeConfig.unit}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { label: string; color: string }> = {
          active: { label: '活动', color: 'red' },
          acknowledged: { label: '已确认', color: 'orange' },
          resolved: { label: '已恢复', color: 'green' },
        }
        const config = statusMap[status] || statusMap.active
        return <Tag color={config.color}>{config.label}</Tag>
      },
    },
    {
      title: '报警时间',
      dataIndex: 'alarmTime',
      key: 'alarmTime',
      width: 180,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '确认人',
      dataIndex: 'acknowledgedBy',
      key: 'acknowledgedBy',
      width: 100,
      render: (value: string) => value || '-',
    },
    {
      title: '恢复时间',
      dataIndex: 'resolveTime',
      key: 'resolveTime',
      width: 180,
      render: (value: string) => value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
          返回列表
        </Button>
      </div>

      {/* 基本信息 */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {typeConfig.icon} {point.pointName}
          </div>
        }
        style={{ marginBottom: 16 }}
      >
        {/* 状态提醒 */}
        {point.status === 'alarm' && (
          <Alert
            message="监测点报警"
            description={`当前值 ${point.currentValue}${typeConfig.unit} 超出阈值范围，请及时处理！`}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        {point.status === 'warning' && (
          <Alert
            message="监测点预警"
            description={`当前值 ${point.currentValue}${typeConfig.unit} 接近阈值，请关注！`}
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="当前值"
                value={point.currentValue}
                suffix={typeConfig.unit}
                precision={2}
                valueStyle={{
                  color:
                    point.status === 'alarm' ? '#E37318' :
                    point.status === 'warning' ? '#FAAD14' :
                    '#2BA471'
                }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="上限值"
                value={point.upperLimit}
                suffix={typeConfig.unit}
                precision={2}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="下限值"
                value={point.lowerLimit}
                suffix={typeConfig.unit}
                precision={2}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="监测状态"
                value={statusConfig.label}
                valueStyle={{ color: statusConfig.color === 'green' ? '#2BA471' : statusConfig.color }}
              />
            </Card>
          </Col>
        </Row>

        {/* 进度条显示 */}
        <Card style={{ marginBottom: 24 }} title="当前值位置">
          <div style={{ padding: '0 24px' }}>
            <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
              <span>下限: {point.lowerLimit}</span>
              <span style={{ fontWeight: 600 }}>当前: {point.currentValue.toFixed(2)}</span>
              <span>上限: {point.upperLimit}</span>
            </div>
            <Progress
              percent={Math.min(100, Math.max(0, percent))}
              strokeColor={
                point.status === 'alarm' ? '#E37318' :
                point.status === 'warning' ? '#FAAD14' :
                '#2BA471'
              }
            />
            <div style={{ marginTop: 12, display: 'flex', gap: 24, fontSize: 12 }}>
              <div>
                <Tag color="green">正常范围</Tag>
                {point.warningLower} ~ {point.warningUpper}
              </div>
              <div>
                <Tag color="orange">预警范围</Tag>
                {point.alarmLower} ~ {point.alarmLower} 或 {point.alarmUpper} ~ {point.alarmUpper}
              </div>
              <div>
                <Tag color="red">报警范围</Tag>
                &lt; {point.alarmLower} 或 &gt; {point.alarmUpper}
              </div>
            </div>
          </div>
        </Card>

        <Descriptions bordered column={2}>
          <Descriptions.Item label="监测点编号">{point.pointNo}</Descriptions.Item>
          <Descriptions.Item label="监测点名称">{point.pointName}</Descriptions.Item>
          <Descriptions.Item label="监测类型">
            <span>{typeConfig.icon} {typeConfig.label}</span>
          </Descriptions.Item>
          <Descriptions.Item label="监测状态">
            <Tag color={statusConfig.color}>{statusConfig.label}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="关联设备">{point.equipmentName}</Descriptions.Item>
          <Descriptions.Item label="设备编号">{point.equipmentCode}</Descriptions.Item>
          <Descriptions.Item label="安装位置">{point.location}</Descriptions.Item>
          <Descriptions.Item label="传感器型号">{point.sensorModel}</Descriptions.Item>
          <Descriptions.Item label="传感器制造商">{point.sensorManufacturer}</Descriptions.Item>
          <Descriptions.Item label="安装日期">{dayjs(point.installDate).format('YYYY-MM-DD')}</Descriptions.Item>
          <Descriptions.Item label="上次校准">{dayjs(point.calibrationDate).format('YYYY-MM-DD')}</Descriptions.Item>
          <Descriptions.Item label="下次校准">{dayjs(point.nextCalibrationDate).format('YYYY-MM-DD')}</Descriptions.Item>
          <Descriptions.Item label="最后更新">{dayjs(point.lastUpdate).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
          <Descriptions.Item label="状态" span={2}>
            <Badge
              status={point.active ? 'success' : 'default'}
              text={point.active ? '启用中' : '已停用'}
            />
          </Descriptions.Item>
          <Descriptions.Item label="描述" span={2}>
            {point.description}
          </Descriptions.Item>
          {point.remark && (
            <Descriptions.Item label="备注" span={2}>
              {point.remark}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {/* 详细信息标签页 */}
      <Card>
        <Tabs
          items={[
            {
              key: 'data',
              label: `监测数据 (${monitorDataList.length})`,
              children: (
                <div>
                  {trendAnalysis && (
                    <Card size="small" style={{ marginBottom: 16 }}>
                      <Row gutter={16}>
                        <Col span={6}>
                          <Statistic
                            title="平均值"
                            value={trendAnalysis.avgValue}
                            precision={2}
                            suffix={typeConfig.unit}
                          />
                        </Col>
                        <Col span={6}>
                          <Statistic
                            title="最大值"
                            value={trendAnalysis.maxValue}
                            precision={2}
                            suffix={typeConfig.unit}
                          />
                        </Col>
                        <Col span={6}>
                          <Statistic
                            title="最小值"
                            value={trendAnalysis.minValue}
                            precision={2}
                            suffix={typeConfig.unit}
                          />
                        </Col>
                        <Col span={6}>
                          <Statistic
                            title="趋势"
                            value={
                              trendAnalysis.trend === 'stable' ? '稳定' :
                              trendAnalysis.trend === 'rising' ? '上升' :
                              trendAnalysis.trend === 'falling' ? '下降' : '波动'
                            }
                            valueStyle={{
                              color:
                                trendAnalysis.trend === 'stable' ? '#2BA471' :
                                trendAnalysis.trend === 'rising' ? '#E37318' :
                                '#0097BA'
                            }}
                          />
                        </Col>
                      </Row>
                    </Card>
                  )}
                  <Table
                    rowKey="id"
                    dataSource={monitorDataList}
                    columns={dataColumns}
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showTotal: (total) => `共 ${total} 条`,
                    }}
                  />
                </div>
              ),
            },
            {
              key: 'alarms',
              label: `报警记录 (${alarmList.length})`,
              children: (
                <Table
                  rowKey="id"
                  dataSource={alarmList}
                  columns={alarmColumns}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `共 ${total} 条`,
                  }}
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}
