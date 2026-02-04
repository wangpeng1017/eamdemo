/**
 * @file page.tsx
 * @desc 状态监测与故障诊断列表页面
 */
'use client'

import { useState } from 'react'
import {
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  Card,
  Statistic,
  Row,
  Col,
  Tabs,
  Progress,
  Badge,
  Alert,
  Modal,
  Descriptions,
  message,
} from 'antd'
import {
  SearchOutlined,
  EyeOutlined,
  BellOutlined,
  BugOutlined,
  LineChartOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import Link from 'next/link'
import {
  mockMonitorPoints,
  mockAlarmRecords,
  mockDiagnosisRecords,
} from '@/data/monitoring-data'
import {
  MonitorPoint,
  AlarmRecord,
  DiagnosisRecord,
  monitorStatusMap,
  monitorPointTypeMap,
  alarmLevelMap,
} from '@/lib/monitoring-types'
import dayjs from 'dayjs'

const { Search } = Input
const { Option } = Select

export default function MonitoringListPage() {
  const [searchText, setSearchText] = useState('')
  const [typeFilter, setTypeFilter] = useState<string | undefined>()
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [activeTab, setActiveTab] = useState('points')
  const [alarmRecords, setAlarmRecords] = useState<AlarmRecord[]>(mockAlarmRecords)
  const [alarmDetailModalOpen, setAlarmDetailModalOpen] = useState(false)
  const [selectedAlarm, setSelectedAlarm] = useState<AlarmRecord | null>(null)

  // 筛选监测点数据
  const filteredPoints = mockMonitorPoints.filter((item) => {
    const matchText =
      item.pointNo.toLowerCase().includes(searchText.toLowerCase()) ||
      item.pointName.includes(searchText) ||
      item.equipmentName.includes(searchText)
    const matchType = !typeFilter || item.pointType === typeFilter
    const matchStatus = !statusFilter || item.status === statusFilter
    return matchText && matchType && matchStatus
  })

  // 统计数据
  const stats = {
    totalPoints: mockMonitorPoints.filter(p => p.active).length,
    normalPoints: mockMonitorPoints.filter(p => p.status === 'normal').length,
    warningPoints: mockMonitorPoints.filter(p => p.status === 'warning').length,
    alarmPoints: mockMonitorPoints.filter(p => p.status === 'alarm').length,
    activeAlarms: alarmRecords.filter(a => a.status === 'active').length,
    todayDiagnosis: mockDiagnosisRecords.filter(d =>
      dayjs(d.diagnosisTime).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD')
    ).length,
  }

  // 确认报警
  const handleAcknowledgeAlarm = (record: AlarmRecord) => {
    setAlarmRecords(prev => prev.map(item =>
      item.id === record.id
        ? {
            ...item,
            status: 'acknowledged',
            acknowledgedBy: '管理员',
            acknowledgeTime: new Date().toISOString(),
          }
        : item
    ))
    message.success(`报警 ${record.alarmNo} 已确认`)
  }

  // 查看报警详情
  const handleViewAlarm = (record: AlarmRecord) => {
    setSelectedAlarm(record)
    setAlarmDetailModalOpen(true)
  }

  // 监测点列
  const pointColumns = [
    {
      title: '监测点编号',
      dataIndex: 'pointNo',
      key: 'pointNo',
      width: 180,
      render: (pointNo: string, record: MonitorPoint) => (
        <Link href={`/admin/monitoring/${record.id}`} style={{ color: '#0097BA' }}>
          {pointNo}
        </Link>
      ),
    },
    {
      title: '监测点名称',
      dataIndex: 'pointName',
      key: 'pointName',
      width: 200,
    },
    {
      title: '监测类型',
      dataIndex: 'pointType',
      key: 'pointType',
      width: 100,
      render: (type: keyof typeof monitorPointTypeMap) => (
        <span>
          {monitorPointTypeMap[type].icon} {monitorPointTypeMap[type].label}
        </span>
      ),
    },
    {
      title: '关联设备',
      dataIndex: 'equipmentName',
      key: 'equipmentName',
      width: 150,
    },
    {
      title: '当前值',
      key: 'currentValue',
      width: 150,
      render: (_: any, record: MonitorPoint) => {
        const typeConfig = monitorPointTypeMap[record.pointType]
        const statusConfig = monitorStatusMap[record.status]
        const percent = ((record.currentValue - record.lowerLimit) / (record.upperLimit - record.lowerLimit)) * 100

        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>
                {record.currentValue.toFixed(2)}
              </span>
              <span style={{ color: '#666' }}>{typeConfig.unit}</span>
              <Tag color={statusConfig.color} style={{ marginLeft: 8 }}>
                {statusConfig.label}
              </Tag>
            </div>
            <Progress
              percent={Math.min(100, Math.max(0, percent))}
              showInfo={false}
              strokeColor={
                record.status === 'alarm' ? '#E37318' :
                record.status === 'warning' ? '#FAAD14' :
                '#2BA471'
              }
              size="small"
              style={{ marginTop: 4 }}
            />
          </div>
        )
      },
    },
    {
      title: '阈值范围',
      key: 'threshold',
      width: 150,
      render: (_: any, record: MonitorPoint) => (
        <div style={{ fontSize: 12 }}>
          <div>报警: {record.alarmLower} ~ {record.alarmUpper}</div>
          <div style={{ color: '#666' }}>预警: {record.warningLower} ~ {record.warningUpper}</div>
        </div>
      ),
    },
    {
      title: '最后更新',
      dataIndex: 'lastUpdate',
      key: 'lastUpdate',
      width: 150,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: MonitorPoint) => (
        <Link href={`/admin/monitoring/${record.id}`}>
          <Button type="link" size="small" icon={<EyeOutlined />}>
            详情
          </Button>
        </Link>
      ),
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
      title: '监测点',
      dataIndex: 'pointName',
      key: 'pointName',
      width: 200,
    },
    {
      title: '关联设备',
      dataIndex: 'equipmentName',
      key: 'equipmentName',
      width: 150,
    },
    {
      title: '报警级别',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      render: (level: keyof typeof alarmLevelMap) => {
        const config = alarmLevelMap[level]
        return (
          <Tag color={config.color} style={{ fontWeight: 600 }}>
            {config.label}
          </Tag>
        )
      },
    },
    {
      title: '报警值',
      key: 'alarmValue',
      width: 150,
      render: (_: any, record: AlarmRecord) => (
        <div>
          <div style={{ color: '#E37318', fontWeight: 600 }}>
            {record.alarmValue.toFixed(2)}
          </div>
          <div style={{ fontSize: 12, color: '#666' }}>
            阈值: {record.thresholdValue}
          </div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
          active: { label: '活动', color: 'red', icon: <BellOutlined /> },
          acknowledged: { label: '已确认', color: 'orange', icon: <CheckCircleOutlined /> },
          resolved: { label: '已恢复', color: 'green', icon: <ExclamationCircleOutlined /> },
        }
        const config = statusMap[status] || statusMap.active
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.label}
          </Tag>
        )
      },
    },
    {
      title: '报警时间',
      dataIndex: 'alarmTime',
      key: 'alarmTime',
      width: 150,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: AlarmRecord) => (
        <Space size="small">
          {record.status === 'active' && (
            <Button
              type="link"
              size="small"
              onClick={() => handleAcknowledgeAlarm(record)}
            >
              确认
            </Button>
          )}
          <Button
            type="link"
            size="small"
            onClick={() => handleViewAlarm(record)}
          >
            查看
          </Button>
        </Space>
      ),
    },
  ]

  // 诊断记录列
  const diagnosisColumns = [
    {
      title: '诊断编号',
      dataIndex: 'diagnosisNo',
      key: 'diagnosisNo',
      width: 180,
    },
    {
      title: '关联设备',
      dataIndex: 'equipmentName',
      key: 'equipmentName',
      width: 150,
    },
    {
      title: '诊断结果',
      dataIndex: 'diagnosisResult',
      key: 'diagnosisResult',
      width: 120,
      render: (result: string) => {
        const resultMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
          normal: { label: '正常', color: 'green', icon: <CheckCircleOutlined /> },
          degraded: { label: '性能下降', color: 'orange', icon: <WarningOutlined /> },
          fault: { label: '故障', color: 'red', icon: <ExclamationCircleOutlined /> },
          failure: { label: '严重故障', color: 'magenta', icon: <CloseCircleOutlined /> },
        }
        const config = resultMap[result] || resultMap.normal
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.label}
          </Tag>
        )
      },
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      key: 'confidence',
      width: 100,
      render: (value: number) => (
        <Progress
          percent={value}
          size="small"
          status={value >= 80 ? 'success' : value >= 60 ? 'normal' : 'exception'}
        />
      ),
    },
    {
      title: '故障部位',
      dataIndex: 'faultLocation',
      key: 'faultLocation',
      width: 120,
      render: (value: string) => value || '-',
    },
    {
      title: '故障原因',
      dataIndex: 'faultCause',
      key: 'faultCause',
      width: 150,
      ellipsis: true,
      render: (value: string) => value || '-',
    },
    {
      title: '诊断方法',
      dataIndex: 'diagnosisMethod',
      key: 'diagnosisMethod',
      width: 100,
      render: (method: string) => {
        const methodMap: Record<string, { label: string; color: string }> = {
          ai: { label: 'AI诊断', color: 'blue' },
          expert: { label: '专家诊断', color: 'purple' },
          manual: { label: '人工诊断', color: 'gray' },
        }
        const config = methodMap[method] || methodMap.manual
        return <Tag color={config.color}>{config.label}</Tag>
      },
    },
    {
      title: '处理状态',
      dataIndex: 'handled',
      key: 'handled',
      width: 100,
      render: (handled: boolean) => (
        <Tag color={handled ? 'green' : 'orange'}>
          {handled ? '已处理' : '待处理'}
        </Tag>
      ),
    },
    {
      title: '诊断时间',
      dataIndex: 'diagnosisTime',
      key: 'diagnosisTime',
      width: 150,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: () => (
        <Button type="link" size="small">
          详情
        </Button>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 600, color: '#00405C', marginBottom: 16 }}>
          状态监测与故障诊断
        </h2>
        <Row gutter={16}>
          <Col span={4}>
            <Card>
              <Statistic
                title="监测点总数"
                value={stats.totalPoints}
                suffix="个"
                prefix={<LineChartOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="正常"
                value={stats.normalPoints}
                suffix="个"
                valueStyle={{ color: '#2BA471' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="预警"
                value={stats.warningPoints}
                suffix="个"
                valueStyle={{ color: '#FAAD14' }}
                prefix={<WarningOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="报警"
                value={stats.alarmPoints}
                suffix="个"
                valueStyle={{ color: '#E37318' }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="活动报警"
                value={stats.activeAlarms}
                suffix="条"
                valueStyle={{ color: '#E37318' }}
                prefix={<BellOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="今日诊断"
                value={stats.todayDiagnosis}
                suffix="次"
                valueStyle={{ color: '#0097BA' }}
                prefix={<BugOutlined />}
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* 活动报警提醒 */}
      {stats.activeAlarms > 0 && (
        <Alert
          message="活动报警提醒"
          description={`当前有 ${stats.activeAlarms} 条未处理的报警记录，请及时处理！`}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" danger>
              立即处理
            </Button>
          }
        />
      )}

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'points',
              label: (
                <span>
                  监测点
                  <Badge count={stats.alarmPoints} style={{ marginLeft: 8 }} />
                </span>
              ),
              children: (
                <div>
                  <div style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
                    <Search
                      placeholder="搜索监测点编号/名称/设备"
                      allowClear
                      style={{ width: 300 }}
                      onChange={(e) => setSearchText(e.target.value)}
                      prefix={<SearchOutlined />}
                    />
                    <Select
                      placeholder="筛选类型"
                      allowClear
                      style={{ width: 150 }}
                      onChange={setTypeFilter}
                    >
                      <Option value="temperature">温度</Option>
                      <Option value="vibration">振动</Option>
                      <Option value="pressure">压力</Option>
                      <Option value="current">电流</Option>
                      <Option value="voltage">电压</Option>
                      <Option value="flow">流量</Option>
                      <Option value="speed">转速</Option>
                    </Select>
                    <Select
                      placeholder="筛选状态"
                      allowClear
                      style={{ width: 120 }}
                      onChange={setStatusFilter}
                    >
                      <Option value="normal">正常</Option>
                      <Option value="warning">预警</Option>
                      <Option value="alarm">报警</Option>
                      <Option value="offline">离线</Option>
                    </Select>
                  </div>
                  <Table
                    rowKey="id"
                    dataSource={filteredPoints}
                    columns={pointColumns}
                    scroll={{ x: 1400 }}
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
              label: (
                <span>
                  报警记录
                  <Badge count={stats.activeAlarms} style={{ marginLeft: 8 }} />
                </span>
              ),
              children: (
                <Table
                  rowKey="id"
                  dataSource={alarmRecords}
                  columns={alarmColumns}
                  scroll={{ x: 1400 }}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `共 ${total} 条`,
                  }}
                />
              ),
            },
            {
              key: 'diagnosis',
              label: '故障诊断',
              children: (
                <Table
                  rowKey="id"
                  dataSource={mockDiagnosisRecords}
                  columns={diagnosisColumns}
                  scroll={{ x: 1600 }}
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

      {/* 报警详情弹框 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BellOutlined />
            <span>报警详情</span>
          </div>
        }
        open={alarmDetailModalOpen}
        onCancel={() => {
          setAlarmDetailModalOpen(false)
          setSelectedAlarm(null)
        }}
        footer={[
          <Button key="close" onClick={() => setAlarmDetailModalOpen(false)}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {selectedAlarm && (
          <div>
            <Card size="small" style={{ marginBottom: 16 }}>
              <Descriptions column={2} size="small">
                <Descriptions.Item label="报警编号">{selectedAlarm.alarmNo}</Descriptions.Item>
                <Descriptions.Item label="监测点">{selectedAlarm.pointName}</Descriptions.Item>
                <Descriptions.Item label="关联设备">{selectedAlarm.equipmentName}</Descriptions.Item>
                <Descriptions.Item label="报警级别">
                  <Tag color={alarmLevelMap[selectedAlarm.level].color}>
                    {alarmLevelMap[selectedAlarm.level].label}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="报警值">
                  <span style={{ color: '#E37318', fontWeight: 600 }}>
                    {selectedAlarm.alarmValue.toFixed(2)}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="阈值">
                  {selectedAlarm.thresholdValue}
                </Descriptions.Item>
                <Descriptions.Item label="报警时间">
                  {dayjs(selectedAlarm.alarmTime).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
                <Descriptions.Item label="当前状态">
                  <Tag color={selectedAlarm.status === 'active' ? 'red' : selectedAlarm.status === 'acknowledged' ? 'orange' : 'green'}>
                    {selectedAlarm.status === 'active' ? '活动' : selectedAlarm.status === 'acknowledged' ? '已确认' : '已恢复'}
                  </Tag>
                </Descriptions.Item>
                {selectedAlarm.acknowledgedBy && (
                  <>
                    <Descriptions.Item label="确认人">{selectedAlarm.acknowledgedBy}</Descriptions.Item>
                    <Descriptions.Item label="确认时间">
                      {selectedAlarm.acknowledgeTime ? dayjs(selectedAlarm.acknowledgeTime).format('YYYY-MM-DD HH:mm:ss') : '-'}
                    </Descriptions.Item>
                  </>
                )}
                <Descriptions.Item label="报警描述" span={2}>
                  {selectedAlarm.description}
                </Descriptions.Item>
                {selectedAlarm.remark && (
                  <Descriptions.Item label="备注" span={2}>
                    {selectedAlarm.remark}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          </div>
        )}
      </Modal>
    </div>
  )
}
