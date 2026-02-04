
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
  Radio,
  DatePicker,
  Upload,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  UserOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import Link from 'next/link'
import { mockRepairOrders } from '@/data/mock-data'
import { RepairOrder, repairStatusMap, repairPriorityMap, faultTypeMap } from '@/lib/types'
import dayjs from 'dayjs'

const { Search } = Input
const { Option } = Select
const { TextArea } = Input

// Demo维修人员数据
const REPAIR_PERSONNEL = [
  { id: 'RP001', name: '维修工-张', phone: '13800138001', speciality: '电气', status: 'available', currentTasks: 0 },
  { id: 'RP002', name: '维修工-李', phone: '13800138002', speciality: '机械', status: 'available', currentTasks: 1 },
  { id: 'RP003', name: '维修工-王', phone: '13800138003', speciality: '液压', status: 'busy', currentTasks: 3 },
  { id: 'RP004', name: '维修工-刘', phone: '13800138004', speciality: '气动', status: 'available', currentTasks: 0 },
  { id: 'RP005', name: '维修工-陈', phone: '13800138005', speciality: '控制', status: 'available', currentTasks: 2 },
]

export default function RepairListPage() {
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [dataSource, setDataSource] = useState<RepairOrder[]>(mockRepairOrders)
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false)
  const [verifyModalOpen, setVerifyModalOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<RepairOrder | null>(null)
  const [dispatchForm] = Form.useForm()
  const [verifyForm] = Form.useForm()
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

  // 打开派工弹框
  const openDispatchModal = (record: RepairOrder) => {
    setSelectedRecord(record)
    dispatchForm.setFieldsValue({
      priority: record.priority,
      deadline: dayjs().add(24, 'hour'),
    })
    setDispatchModalOpen(true)
  }

  // 提交派工
  const handleDispatchSubmit = () => {
    dispatchForm.validateFields().then((values) => {
      const personnel = REPAIR_PERSONNEL.find(p => p.id === values.assignee)
      message.success(`派工成功！已分配给 ${personnel?.name}，联系电话：${personnel?.phone}`)

      // 更新数据状态
      setDataSource(prev => prev.map(item =>
        item.id === selectedRecord?.id
          ? { ...item, status: 'assigned', assignee: personnel?.name, assignTime: new Date().toISOString() }
          : item
      ))

      setDispatchModalOpen(false)
      dispatchForm.resetFields()
      setSelectedRecord(null)
    })
  }

  // 打开验收弹框
  const openVerifyModal = (record: RepairOrder) => {
    setSelectedRecord(record)
    verifyForm.setFieldsValue({
      verifyResult: 'pass',
      verifyTime: dayjs(),
    })
    setVerifyModalOpen(true)
  }

  // 提交验收
  const handleVerifySubmit = () => {
    verifyForm.validateFields().then((values) => {
      message.success('验收完成！工单已关闭')

      // 更新数据状态
      setDataSource(prev => prev.map(item =>
        item.id === selectedRecord?.id
          ? { ...item, status: 'closed', verifyResult: values.verifyResult, verifyTime: new Date().toISOString() }
          : item
      ))

      setVerifyModalOpen(false)
      verifyForm.resetFields()
      setSelectedRecord(null)
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
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openDispatchModal(record)}
            >
              派工
            </Button>
          )}
          {record.status === 'completed' && (
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => openVerifyModal(record)}
            >
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

      {/* 派工弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserOutlined />
            <span>维修派工</span>
          </div>
        }
        open={dispatchModalOpen}
        onOk={handleDispatchSubmit}
        onCancel={() => {
          setDispatchModalOpen(false)
          dispatchForm.resetFields()
          setSelectedRecord(null)
        }}
        width={700}
        okText="确认派工"
        cancelText="取消"
      >
        {selectedRecord && (
          <div>
            {/* 工单信息 */}
            <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f5f5f5' }}>
              <p><strong>工单编号：</strong>{selectedRecord.orderNo}</p>
              <p><strong>设备名称：</strong>{selectedRecord.equipmentName}</p>
              <p><strong>故障描述：</strong>{selectedRecord.faultDescription}</p>
              <p><strong>报修时间：</strong>{dayjs(selectedRecord.reportTime).format('YYYY-MM-DD HH:mm')}</p>
            </Card>

            <Form form={dispatchForm} layout="vertical">
              <Form.Item
                name="assignee"
                label="选择维修人员"
                rules={[{ required: true, message: '请选择维修人员' }]}
              >
                <Radio.Group style={{ width: '100%' }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {REPAIR_PERSONNEL.map(person => (
                      <Radio
                        key={person.id}
                        value={person.id}
                        disabled={person.status === 'busy'}
                        style={{ width: '100%' }}
                      >
                        <Card
                          size="small"
                          style={{
                            width: '100%',
                            marginLeft: 24,
                            marginTop: 8,
                            border: person.status === 'busy' ? '1px dashed #d9d9d9' : undefined,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                                {person.name}
                                <Tag
                                  color={person.status === 'available' ? 'green' : 'orange'}
                                  style={{ marginLeft: 8 }}
                                >
                                  {person.status === 'available' ? '空闲' : '忙碌'}
                                </Tag>
                              </div>
                              <div style={{ color: '#666', fontSize: 12 }}>
                                专长：{person.speciality} | 电话：{person.phone}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 12, color: '#666' }}>
                                当前任务数
                              </div>
                              <div style={{ fontSize: 20, fontWeight: 600, color: '#0097BA' }}>
                                {person.currentTasks}
                              </div>
                            </div>
                          </div>
                        </Card>
                      </Radio>
                    ))}
                  </Space>
                </Radio.Group>
              </Form.Item>

              <Form.Item
                name="priority"
                label="优先级"
                rules={[{ required: true, message: '请选择优先级' }]}
              >
                <Select>
                  <Option value="urgent">紧急 - 立即处理</Option>
                  <Option value="high">高 - 4小时内处理</Option>
                  <Option value="normal">普通 - 24小时内处理</Option>
                  <Option value="low">低 - 3天内处理</Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="deadline"
                label="要求完成时间"
                rules={[{ required: true, message: '请选择要求完成时间' }]}
              >
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item
                name="instructions"
                label="派工说明"
              >
                <TextArea rows={3} placeholder="填写维修注意事项、特殊要求等" />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>

      {/* 验收弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircleOutlined />
            <span>维修验收</span>
          </div>
        }
        open={verifyModalOpen}
        onOk={handleVerifySubmit}
        onCancel={() => {
          setVerifyModalOpen(false)
          verifyForm.resetFields()
          setSelectedRecord(null)
        }}
        width={700}
        okText="确认验收"
        cancelText="取消"
      >
        {selectedRecord && (
          <div>
            {/* 工单信息 */}
            <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f5f5f5' }}>
              <p><strong>工单编号：</strong>{selectedRecord.orderNo}</p>
              <p><strong>设备名称：</strong>{selectedRecord.equipmentName}</p>
              <p><strong>维修人员：</strong>{selectedRecord.assignee || '-'}</p>
              <p><strong>开始维修：</strong>{selectedRecord.startTime ? dayjs(selectedRecord.startTime).format('YYYY-MM-DD HH:mm') : '-'}</p>
              <p><strong>完成维修：</strong>{selectedRecord.endTime ? dayjs(selectedRecord.endTime).format('YYYY-MM-DD HH:mm') : '-'}</p>
            </Card>

            <Form form={verifyForm} layout="vertical">
              <Form.Item
                name="verifyResult"
                label="验收结果"
                rules={[{ required: true, message: '请选择验收结果' }]}
              >
                <Radio.Group style={{ width: '100%' }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Radio value="pass" style={{ display: 'flex', alignItems: 'flex-start' }}>
                      <Card size="small" style={{ marginLeft: 24, marginTop: 8 }}>
                        <div style={{ fontWeight: 600, color: '#2BA471', marginBottom: 4 }}>
                          ✓ 通过
                        </div>
                        <div style={{ color: '#666', fontSize: 12 }}>
                          设备故障已排除，运行正常，符合验收标准
                        </div>
                      </Card>
                    </Radio>
                    <Radio value="fail" style={{ display: 'flex', alignItems: 'flex-start' }}>
                      <Card size="small" style={{ marginLeft: 24, marginTop: 8 }}>
                        <div style={{ fontWeight: 600, color: '#E37318', marginBottom: 4 }}>
                          ✗ 不通过
                        </div>
                        <div style={{ color: '#666', fontSize: 12 }}>
                          设备仍存在问题，需要返工维修
                        </div>
                      </Card>
                    </Radio>
                    <Radio value="conditional" style={{ display: 'flex', alignItems: 'flex-start' }}>
                      <Card size="small" style={{ marginLeft: 24, marginTop: 8 }}>
                        <div style={{ fontWeight: 600, color: '#0097BA', marginBottom: 4 }}>
                          ! 有条件通过
                        </div>
                        <div style={{ color: '#666', fontSize: 12 }}>
                          基本功能恢复，但需要后续跟踪观察
                        </div>
                      </Card>
                    </Radio>
                  </Space>
                </Radio.Group>
              </Form.Item>

              <Form.Item
                name="verifyTime"
                label="验收时间"
                rules={[{ required: true, message: '请选择验收时间' }]}
              >
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item
                name="verifyComment"
                label="验收意见"
                rules={[{ required: true, message: '请填写验收意见' }]}
              >
                <TextArea rows={4} placeholder="请详细说明验收情况、设备运行状态等" />
              </Form.Item>

              <Form.Item
                name="attachments"
                label="验收附件"
              >
                <Upload.Dragger
                  listType="picture"
                  multiple
                  style={{ marginBottom: 16 }}
                >
                  <p className="ant-upload-drag-icon">
                    <Upload />
                  </p>
                  <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                  <p className="ant-upload-hint">支持设备运行照片、测试数据等</p>
                </Upload.Dragger>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  )
}
