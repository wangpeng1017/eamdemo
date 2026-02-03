
/**
 * @file page.tsx
 * @desc 设备台账列表页面
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
  Popconfirm,
  message,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import Link from 'next/link'
import { mockEquipments } from '../../../data/mock-data'
import { Equipment, equipmentStatusMap, criticalityMap } from '../../../lib/types'
import dayjs from 'dayjs'

const { Search } = Input
const { Option } = Select

export default function EquipmentListPage() {
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [dataSource, setDataSource] = useState<Equipment[]>(mockEquipments)

  // 筛选数据
  const filteredData = dataSource.filter((item) => {
    const matchText =
      item.name.includes(searchText) ||
      item.code.includes(searchText) ||
      item.model.includes(searchText)
    const matchStatus = !statusFilter || item.status === statusFilter
    return matchText && matchStatus
  })

  // 统计数据
  const stats = {
    total: dataSource.length,
    running: dataSource.filter((d) => d.status === 'running').length,
    maintenance: dataSource.filter((d) => d.status === 'maintenance').length,
    repair: dataSource.filter((d) => d.status === 'repair').length,
  }

  // 删除设备
  const handleDelete = (id: string) => {
    setDataSource(dataSource.filter((d) => d.id !== id))
    message.success('删除成功')
  }

  const columns = [
    {
      title: '设备编码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (code: string, record: Equipment) => (
        <Link href={`/admin/equipment/${record.id}`} style={{ color: '#0097BA' }}>
          {code}
        </Link>
      ),
    },
    {
      title: '设备名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '型号规格',
      dataIndex: 'model',
      key: 'model',
      width: 100,
    },
    {
      title: '制造商',
      dataIndex: 'manufacturer',
      key: 'manufacturer',
      width: 100,
    },
    {
      title: '安装位置',
      dataIndex: 'location',
      key: 'location',
      width: 100,
    },
    {
      title: '设备状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: keyof typeof equipmentStatusMap) => {
        const config = equipmentStatusMap[status]
        return <Tag color={config.color}>{config.label}</Tag>
      },
    },
    {
      title: '关键性',
      dataIndex: 'criticality',
      key: 'criticality',
      width: 100,
      render: (criticality: keyof typeof criticalityMap) => {
        const config = criticalityMap[criticality]
        return <Tag color={config.color}>{config.label}</Tag>
      },
    },
    {
      title: '购置日期',
      dataIndex: 'purchaseDate',
      key: 'purchaseDate',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '负责人',
      dataIndex: 'responsiblePerson',
      key: 'responsiblePerson',
      width: 100,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: Equipment) => (
        <Space size="small">
          <Link href={`/admin/equipment/${record.id}`}>
            <Button type="link" size="small" icon={<EyeOutlined />}>
              详情
            </Button>
          </Link>
          <Button type="link" size="small" icon={<EditOutlined />}>
            编辑
          </Button>
          <Popconfirm
            title="确定要删除该设备吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 600, color: '#00405C', marginBottom: 16 }}>
          设备台账
        </h2>
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic title="设备总数" value={stats.total} suffix="台" />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="运行中"
                value={stats.running}
                suffix="台"
                valueStyle={{ color: '#2BA471' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="保养中"
                value={stats.maintenance}
                suffix="台"
                valueStyle={{ color: '#E37318' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="维修中"
                value={stats.repair}
                suffix="台"
                valueStyle={{ color: '#D54941' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      <Card>
        <div style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
          <Search
            placeholder="搜索设备名称/编码/型号"
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
            <Option value="running">运行中</Option>
            <Option value="standby">待机</Option>
            <Option value="maintenance">保养中</Option>
            <Option value="repair">维修中</Option>
            <Option value="scrapped">已报废</Option>
          </Select>
          <div style={{ flex: 1 }} />
          <Button type="primary" icon={<PlusOutlined />}>
            新增设备
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
    </div>
  )
}
