/**
 * @file page.tsx
 * @desc 维护保养列表页面 - 保养计划 + 保养任务
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
} from 'antd'
import {
  SearchOutlined,
  PlusOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import Link from 'next/link'
import { mockMaintenancePlans, mockMaintenanceTasks } from '@/data/maintenance-data'
import { MaintenancePlan, MaintenanceTask, maintenanceStatusMap, maintenanceTypeMap, maintenancePeriodMap, maintenancePriorityMap } from '@/lib/maintenance-types'
import dayjs from 'dayjs'

const { Search } = Input
const { Option } = Select

export default function MaintenanceListPage() {
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [plans] = useState<MaintenancePlan[]>(mockMaintenancePlans)
  const [tasks] = useState<MaintenanceTask[]>(mockMaintenanceTasks)

  // 筛选数据
  const filteredTasks = tasks.filter((item) => {
    const matchText =
      item.taskNo.toLowerCase().includes(searchText.toLowerCase()) ||
      item.equipmentName.includes(searchText) ||
      item.content.includes(searchText)
    const matchStatus = !statusFilter || item.status === statusFilter
    return matchText && matchStatus
  })

  // 统计数据
  const stats = {
    totalPlans: plans.length,
    activePlans: plans.filter((p) => p.active).length,
    totalTasks: tasks.length,
    completedTasks: tasks.filter((t) => t.status === 'completed').length,
    pendingTasks: tasks.filter((t) => t.status === 'pending' || t.status === 'scheduled').length,
    overdueTasks: tasks.filter((t) => t.status === 'overdue').length,
  }

  const taskColumns = [
    {
      title: '任务编号',
      dataIndex: 'taskNo',
      key: 'taskNo',
      width: 150,
      render: (taskNo: string, record: MaintenanceTask) => (
        <Link href={`/admin/maintenance/${record.id}`} style={{ color: '#0097BA' }}>
          {taskNo}
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
      title: '保养类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: keyof typeof maintenanceTypeMap) => maintenanceTypeMap[type],
    },
    {
      title: '保养内容',
      dataIndex: 'content',
      key: 'content',
      width: 200,
      ellipsis: true,
    },
    {
      title: '计划日期',
      dataIndex: 'scheduledDate',
      key: 'scheduledDate',
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
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: keyof typeof maintenancePriorityMap) => {
        const config = maintenancePriorityMap[priority]
        return <Tag color={config.color}>{config.label}</Tag>
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: keyof typeof maintenanceStatusMap) => {
        const config = maintenanceStatusMap[status]
        return <Tag color={config.color}>{config.label}</Tag>
      },
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 600, color: '#00405C', marginBottom: 16 }}>
          维护保养
        </h2>
        <Row gutter={16}>
          <Col span={4}>
            <Card>
              <Statistic title="保养计划" value={stats.totalPlans} suffix="个" />
            </Card>
          </Col>
          <Col span={5}>
            <Card>
              <Statistic
                title="执行中"
                value={stats.activePlans}
                suffix="个"
                valueStyle={{ color: '#0097BA' }}
              />
            </Card>
          </Col>
          <Col span={5}>
            <Card>
              <Statistic
                title="保养任务"
                value={stats.totalTasks}
                suffix="条"
                valueStyle={{ color: '#00405C' }}
              />
            </Card>
          </Col>
          <Col span={5}>
            <Card>
              <Statistic
                title="已完成"
                value={stats.completedTasks}
                suffix="条"
                valueStyle={{ color: '#2BA471' }}
              />
            </Card>
          </Col>
          <Col span={5}>
            <Card>
              <Statistic
                title="待执行"
                value={stats.pendingTasks}
                suffix="条"
                valueStyle={{ color: '#E37318' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      <Tabs
        defaultActiveKey="tasks"
        items={[
          {
            key: 'tasks',
            label: `保养任务 (${tasks.length})`,
            children: (
              <Card>
                <div style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
                  <Search
                    placeholder="搜索任务编号/设备名称/保养内容"
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
                    <Option value="pending">待排程</Option>
                    <Option value="scheduled">已排程</Option>
                    <Option value="in_progress">进行中</Option>
                    <Option value="completed">已完成</Option>
                    <Option value="overdue">已逾期</Option>
                    <Option value="cancelled">已取消</Option>
                  </Select>
                  <div style={{ flex: 1 }} />
                  <Button type="primary" icon={<PlusOutlined />}>
                    创建任务
                  </Button>
                </div>
                <Table
                  rowKey="id"
                  dataSource={filteredTasks}
                  columns={taskColumns}
                  scroll={{ x: 1200 }}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `共 ${total} 条`,
                  }}
                />
              </Card>
            ),
          },
          {
            key: 'plans',
            label: `保养计划 (${plans.length})`,
            children: (
              <Card>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button type="primary" icon={<CalendarOutlined />}>
                    新增计划
                  </Button>
                </div>
                <Table
                  rowKey="id"
                  dataSource={plans}
                  columns={[
                    { title: '计划编号', dataIndex: 'planNo', key: 'planNo', width: 150 },
                    { title: '计划名称', dataIndex: 'name', key: 'name', width: 200 },
                    { title: '设备名称', dataIndex: 'equipmentName', key: 'equipmentName', width: 120 },
                    {
                      title: '保养类型',
                      dataIndex: 'type',
                      key: 'type',
                      width: 100,
                      render: (type: keyof typeof maintenanceTypeMap) => maintenanceTypeMap[type],
                    },
                    {
                      title: '周期',
                      dataIndex: 'period',
                      key: 'period',
                      width: 80,
                      render: (period: keyof typeof maintenancePeriodMap) => maintenancePeriodMap[period],
                    },
                    {
                      title: '下次保养',
                      dataIndex: 'nextDate',
                      key: 'nextDate',
                      width: 120,
                      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
                    },
                    { title: '负责人', dataIndex: 'responsiblePerson', key: 'responsiblePerson', width: 100 },
                    {
                      title: '状态',
                      dataIndex: 'active',
                      key: 'active',
                      width: 80,
                      render: (active: boolean) => (
                        <Tag color={active ? '#2BA471' : '#999999'}>{active ? '激活' : '停用'}</Tag>
                      ),
                    },
                  ]}
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            ),
          },
        ]}
      />
    </div>
  )
}
