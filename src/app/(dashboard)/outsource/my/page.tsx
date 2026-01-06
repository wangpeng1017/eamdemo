'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, Table, Button, Modal, Tag, Space, Descriptions, Timeline, Row, Col, Statistic, Progress, Input, Select, message } from 'antd'
import { EyeOutlined, CheckCircleOutlined, ClockCircleOutlined, SyncOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'

interface Supplier {
  id: string
  name: string
}

interface OutsourceTask {
  id: string
  orderNo: string
  entrustmentNo: string | null
  clientName: string | null
  sampleName: string
  testItems: string
  supplierId: string
  supplier: Supplier
  status: 'pending' | 'sent' | 'testing' | 'completed' | 'returned'
  sendDate: string | null
  expectedDate: string | null
  actualDate: string | null
  cost: number
  progress: number
  createdBy: string
  createdAt: string
  remark: string | null
}

const statusMap: Record<string, { text: string; color: string; icon: React.ReactNode }> = {
  pending: { text: '待发送', color: 'default', icon: <ClockCircleOutlined /> },
  sent: { text: '已发送', color: 'processing', icon: <SyncOutlined spin /> },
  testing: { text: '检测中', color: 'blue', icon: <SyncOutlined spin /> },
  completed: { text: '已完成', color: 'success', icon: <CheckCircleOutlined /> },
  returned: { text: '已退回', color: 'orange', icon: <ClockCircleOutlined /> },
}

export default function MyOutsourcePage() {
  const [tasks, setTasks] = useState<OutsourceTask[]>([])
  const [loading, setLoading] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [currentTask, setCurrentTask] = useState<OutsourceTask | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [keyword, setKeyword] = useState('')
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [stats, setStats] = useState<Record<string, number>>({})

  // 加载委外任务列表
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(pagination.current),
        pageSize: String(pagination.pageSize),
      })
      if (statusFilter) params.append('status', statusFilter)
      if (keyword) params.append('keyword', keyword)

      const res = await fetch(`/api/outsource-order?${params}`)
      const data = await res.json()
      if (data.success) {
        setTasks(data.data.list)
        setPagination(prev => ({ ...prev, total: data.data.total }))
        setStats(data.data.stats || {})
      } else {
        message.error(data.message || '加载失败')
      }
    } catch {
      message.error('网络错误')
    } finally {
      setLoading(false)
    }
  }, [pagination.current, pagination.pageSize, statusFilter, keyword])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleView = (record: OutsourceTask) => {
    setCurrentTask(record)
    setDetailOpen(true)
  }

  const handleTableChange = (pag: TablePaginationConfig) => {
    setPagination(prev => ({
      ...prev,
      current: pag.current || 1,
      pageSize: pag.pageSize || 10,
    }))
  }

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }))
  }

  // 统计数据
  const totalCount = pagination.total
  const pendingCount = stats.pending || 0
  const testingCount = (stats.sent || 0) + (stats.testing || 0)
  const completedCount = stats.completed || 0
  const returnedCount = stats.returned || 0
  const totalCost = stats.totalCost || 0

  const columns: ColumnsType<OutsourceTask> = [
    { title: '委外编号', dataIndex: 'orderNo', width: 150 },
    { title: '委托单号', dataIndex: 'entrustmentNo', width: 150, render: (v) => v || '-' },
    { title: '样品名称', dataIndex: 'sampleName', width: 120 },
    {
      title: '检测项目',
      dataIndex: 'testItems',
      width: 180,
      render: (items: string) => items || '-',
    },
    {
      title: '供应商',
      key: 'supplierName',
      width: 150,
      render: (_, record) => record.supplier?.name || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: string) => (
        <Tag icon={statusMap[status]?.icon} color={statusMap[status]?.color}>
          {statusMap[status]?.text}
        </Tag>
      ),
    },
    {
      title: '进度',
      dataIndex: 'progress',
      width: 120,
      render: (progress: number) => <Progress percent={progress || 0} size="small" />,
    },
    {
      title: '费用',
      dataIndex: 'cost',
      width: 100,
      render: (cost: number) => `¥${(cost || 0).toLocaleString()}`,
    },
    {
      title: '预计完成',
      dataIndex: 'expectedDate',
      width: 100,
      render: (date: string | null) => date ? date.split('T')[0] : '-',
    },
    {
      title: '操作',
      width: 80,
      render: (_, record) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record)}>
          详情
        </Button>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>我的委外</h2>
        <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card size="small">
            <Statistic title="委外总数" value={totalCount} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="待发送" value={pendingCount} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="检测中" value={testingCount} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="已完成" value={completedCount} valueStyle={{ color: 'green' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="已退回" value={returnedCount} valueStyle={{ color: 'orange' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="总费用" value={totalCost} prefix="¥" />
          </Card>
        </Col>
      </Row>

      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="搜索编号/样品/供应商"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onSearch={handleSearch}
            style={{ width: 200 }}
          />
          <Select
            placeholder="状态筛选"
            allowClear
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPagination(p => ({ ...p, current: 1 })) }}
            options={[
              { value: 'pending', label: '待发送' },
              { value: 'sent', label: '已发送' },
              { value: 'testing', label: '检测中' },
              { value: 'completed', label: '已完成' },
              { value: 'returned', label: '已退回' },
            ]}
            style={{ width: 120 }}
          />
        </Space>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={tasks}
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          onChange={handleTableChange}
        />
      </Card>

      {/* 详情弹窗 */}
      <Modal
        title="委外详情"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={700}
      >
        {currentTask && (
          <>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="委外编号">{currentTask.orderNo}</Descriptions.Item>
              <Descriptions.Item label="委托单号">{currentTask.entrustmentNo || '-'}</Descriptions.Item>
              <Descriptions.Item label="客户名称">{currentTask.clientName || '-'}</Descriptions.Item>
              <Descriptions.Item label="样品名称">{currentTask.sampleName}</Descriptions.Item>
              <Descriptions.Item label="检测项目" span={2}>
                {currentTask.testItems ? currentTask.testItems.split(',').map(item => (
                  <Tag key={item}>{item.trim()}</Tag>
                )) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="供应商">{currentTask.supplier?.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag icon={statusMap[currentTask.status]?.icon} color={statusMap[currentTask.status]?.color}>
                  {statusMap[currentTask.status]?.text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="费用">¥{(currentTask.cost || 0).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="进度">
                <Progress percent={currentTask.progress || 0} size="small" style={{ width: 100 }} />
              </Descriptions.Item>
              <Descriptions.Item label="发送日期">
                {currentTask.sendDate ? currentTask.sendDate.split('T')[0] : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="预计完成">
                {currentTask.expectedDate ? currentTask.expectedDate.split('T')[0] : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="实际完成">
                {currentTask.actualDate ? currentTask.actualDate.split('T')[0] : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="创建人">{currentTask.createdBy}</Descriptions.Item>
              {currentTask.remark && (
                <Descriptions.Item label="备注" span={2}>{currentTask.remark}</Descriptions.Item>
              )}
            </Descriptions>

            <div style={{ marginTop: 24 }}>
              <h4>处理记录</h4>
              <Timeline
                items={[
                  {
                    children: (
                      <div>
                        <strong>创建委外</strong>
                        <span style={{ marginLeft: 8, color: '#999' }}>
                          {currentTask.createdBy} - {currentTask.createdAt ? currentTask.createdAt.split('T')[0] : '-'}
                        </span>
                      </div>
                    ),
                  },
                  ...(currentTask.sendDate ? [{
                    children: (
                      <div>
                        <strong>发送样品</strong>
                        <span style={{ marginLeft: 8, color: '#999' }}>
                          {currentTask.sendDate.split('T')[0]}
                        </span>
                      </div>
                    ),
                  }] : []),
                  ...(currentTask.actualDate ? [{
                    children: (
                      <div>
                        <strong>检测完成</strong>
                        <span style={{ marginLeft: 8, color: '#999' }}>
                          {currentTask.actualDate.split('T')[0]}
                        </span>
                      </div>
                    ),
                  }] : []),
                ]}
              />
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
