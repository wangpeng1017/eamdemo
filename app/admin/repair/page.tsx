
/**
 * @file page.tsx
 * @desc 维修管理列表页面
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
  Modal,
  Form,
  message,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  EyeOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import Link from 'next/link'
import { mockRepairOrders } from '@/data/mock-data'
import { RepairOrder, repairStatusMap, repairPriorityMap, faultTypeMap } from '@/lib/types'
import dayjs from 'dayjs'

const { Search } = Input
const { Option } = Select
const { TextArea } = Input

export default function RepairListPage() {
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [dataSource, setDataSource] = useState<RepairOrder[]>(mockRepairOrders)
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [form] = Form.useForm()

  // 筛选数据
  const filteredData = dataSource.filter((item) => {
    const matchText =
      item.orderNo.toLowerCase().includes(searchText.toLowerCase()) ||
      item.equipmentName.includes(searchText) ||
      item.faultDescription.includes(searchText)
    const matchStatus = !statusFilter || item.status === statusFilter
    return matchText && matchStatus
  })

  // 统计数据
  const stats = {
    total: dataSource.length,
    pending: dataSource.filter((d) => d.status === 'pending').length,
    processing: dataSource.filter((d) => d.status === 'processing' || d.status === 'assigned').length,
    completed: dataSource.filter((d) => d.status === 'completed' || d.status === 'closed').length,
  }

  // 提交报修
  const handleReportSubmit = () => {
    form.validateFields().then((values) => {
      message.success('报修申请已提交，等待派工')
      setReportModalOpen(false)
      form.resetFields()
    })
  }

  const columns = [
    {
      title: '工单编号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      width: 150,
      render: (orderNo: string, record: RepairOrder) => (
        <Link href={`/admin/repair/${record.id}`} style={{ color: '#0097BA' }}>
          {orderNo}
        </Link>
      ),
    },
    {
      title: '设备名称',
      dataIndex: 'equipmentName',
      key: 'equipmentName',
      width: 150,
    },
    {
      title: '故障类型',
      dataIndex: 'faultType',
      key: 'faultType',
      width: 100,
      render: (type: keyof typeof faultTypeMap) => faultTypeMap[type],
    },
    {
      title: '故障描述',
      dataIndex: 'faultDescription',
      key: 'faultDescription',
      width: 200,
      ellipsis: true,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: keyof typeof repairPriorityMap) => {
        const config = repairPriorityMap[priority]
        return <Tag color={config.color}>{config.label}</Tag>
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: keyof typeof repairStatusMap) => {
        const config = repairStatusMap[status]
        return <Tag color={config.color}>{config.label}</Tag>
      },
    },
    {
      title: '报修人',
      dataIndex: 'reporter',
      key: 'reporter',
      width: 100,
    },
    {
      title: '报修时间',
      dataIndex: 'reportTime',
      key: 'reportTime',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: RepairOrder) => (
        <Space size="small">
          <Link href={`/admin/repair/${record.id}`}>
            <Button type="link" size="small" icon={<EyeOutlined />}>
              详情
            </Button>
          </Link>
          {record.status === 'pending' && (
            <Button type="link" size="small" icon={<EditOutlined />}>
              派工
            </Button>
          )}
          {record.status === 'completed' && (
            <Button type="link" size="small" icon={<CheckCircleOutlined />}>
              验收
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 600, color: '#00405C', marginBottom: 16 }}>
          维修管理
        </h2>
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic title="工单总数" value={stats.total} suffix="条" />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="待派工"
                value={stats.pending}
                suffix="条"
                valueStyle={{ color: '#E37318' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="处理中"
                value={stats.processing}
                suffix="条"
                valueStyle={{ color: '#0097BA' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="已完成"
                value={stats.completed}
                suffix="条"
                valueStyle={{ color: '#2BA471' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      <Card>
        <div style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
          <Search
            placeholder="搜索工单编号/设备名称/故障描述"
            allowClear
            style={{ width: 300 }}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
          <Select
            placeholder="筛选状态"
            allowClear
            style={{ width: 150 }}
            onChange={setStatusFilter}
          >
            <Option value="pending">待派工</Option>
            <Option value="assigned">已派工</Option>
            <Option value="processing">维修中</Option>
            <Option value="completed">待验收</Option>
            <Option value="closed">已关闭</Option>
          </Select>
          <div style={{ flex: 1 }} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setReportModalOpen(true)}>
            新增报修
          </Button>
        </div>
        <Table
          rowKey="id"
          dataSource={filteredData}
          columns={columns}
          scroll={{ x: 1400 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      {/* 报修弹窗 */}
      <Modal
        title="新增报修"
        open={reportModalOpen}
        onOk={handleReportSubmit}
        onCancel={() => {
          setReportModalOpen(false)
          form.resetFields()
        }}
        width={600}
        okText="提交"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            name="equipment"
            label="选择设备"
            rules={[{ required: true, message: '请选择设备' }]}
          >
            <Select placeholder="请选择设备">
              <Option value="EQ0001">EQ-0001 - 数控机床-1号</Option>
              <Option value="EQ0002">EQ-0002 - 注塑机-2号</Option>
              <Option value="EQ0003">EQ-0003 - 冲压机-3号</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="faultType"
            label="故障类型"
            rules={[{ required: true, message: '请选择故障类型' }]}
          >
            <Select placeholder="请选择故障类型">
              <Option value="electrical">电气故障</Option>
              <Option value="mechanical">机械故障</Option>
              <Option value="hydraulic">液压故障</Option>
              <Option value="pneumatic">气动故障</Option>
              <Option value="control">控制故障</Option>
              <Option value="other">其他</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="priority"
            label="优先级"
            rules={[{ required: true, message: '请选择优先级' }]}
          >
            <Select placeholder="请选择优先级">
              <Option value="urgent">紧急</Option>
              <Option value="high">高</Option>
              <Option value="normal">普通</Option>
              <Option value="low">低</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="description"
            label="故障描述"
            rules={[{ required: true, message: '请描述故障情况' }]}
          >
            <TextArea rows={4} placeholder="请详细描述故障现象、发生时间等信息" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
