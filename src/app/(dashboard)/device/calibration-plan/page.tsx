'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Space, Modal, Form, Input, Select, DatePicker, message, Tag, Popconfirm, Row, Col, Descriptions, Drawer, Divider, InputNumber } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckOutlined, FileTextOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { StatusTag } from '@/components/StatusTag'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface CalibrationRecord {
  id?: string
  calibrationDate: string
  result: string
  certificateNo?: string
  nextDate: string
  operator?: string
  remark?: string
}

interface CalibrationPlan {
  id: string
  deviceId: string | null
  deviceName: string | null
  planName: string
  cycleType: string
  cycleMonths: number | null
  lastCalibrationDate: string | null
  nextCalibrationDate: string | null
  responsiblePerson: string | null
  calibratingOrganization: string | null
  status: string
  records?: CalibrationRecord[]
}

const CYCLE_TYPE_OPTIONS = [
  { value: 'monthly', label: '每月' },
  { value: 'quarterly', label: '每季度' },
  { value: 'semi_annual', label: '每半年' },
  { value: 'annual', label: '每年' },
  { value: 'biennial', label: '每两年' },
]

const STATUS_OPTIONS = [
  { value: 'pending', label: '待检定' },
  { value: 'in_progress', label: '检定中' },
  { value: 'completed', label: '已完成' },
  { value: 'overdue', label: '已逾期' },
]

const CYCLE_MONTHS_MAP: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  semi_annual: 6,
  annual: 12,
  biennial: 24,
}

export default function CalibrationPlanPage() {
  const [data, setData] = useState<CalibrationPlan[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [recordDrawerOpen, setRecordDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [currentPlan, setCurrentPlan] = useState<CalibrationPlan | null>(null)
  const [devices, setDevices] = useState<any[]>([])
  const [records, setRecords] = useState<CalibrationRecord[]>([])
  const [form] = Form.useForm()

  const fetchData = async (p = page) => {
    setLoading(true)
    const res = await fetch(`/api/device/calibration-plan?page=${p}&pageSize=10`)
    const json = await res.json()
    setData(json.list)
    setTotal(json.total)
    setLoading(false)
  }

  const fetchDevices = async () => {
    const res = await fetch('/api/device?pageSize=1000')
    const json = await res.json()
    setDevices(json.list || [])
  }

  useEffect(() => { fetchData() }, [page])
  useEffect(() => { fetchDevices() }, [])

  const handleAdd = () => {
    setEditingId(null)
    form.resetFields()
    form.setFieldsValue({
      cycleType: 'annual',
      cycleMonths: 12,
      status: 'pending',
    })
    setModalOpen(true)
  }

  const handleEdit = (record: CalibrationPlan) => {
    setEditingId(record.id)
    form.setFieldsValue({
      ...record,
      lastCalibrationDate: record.lastCalibrationDate ? dayjs(record.lastCalibrationDate) : null,
      nextCalibrationDate: record.nextCalibrationDate ? dayjs(record.nextCalibrationDate) : null,
    })
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/device/calibration-plan/${id}`, { method: 'DELETE' })
    message.success('删除成功')
    fetchData()
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const data = {
      ...values,
      lastCalibrationDate: values.lastCalibrationDate?.toISOString(),
      nextCalibrationDate: values.nextCalibrationDate?.toISOString(),
    }
    const url = editingId ? `/api/device/calibration-plan/${editingId}` : '/api/device/calibration-plan'
    const method = editingId ? 'PUT' : 'POST'
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    message.success(editingId ? '更新成功' : '创建成功')
    setModalOpen(false)
    fetchData()
  }

  const handleViewRecords = async (record: CalibrationPlan) => {
    setCurrentPlan(record)
    setRecordDrawerOpen(true)
    // 获取检定记录
    const res = await fetch(`/api/device/calibration-plan/${record.id}/records`)
    const json = await res.json()
    setRecords(json.list || [])
  }

  const handleAddRecord = async () => {
    const values = await form.validateFields()
    const recordData = {
      calibrationDate: values.recordDate?.toISOString(),
      result: values.result,
      certificateNo: values.certificateNo,
      nextDate: values.recordNextDate?.toISOString(),
      operator: values.operator,
      remark: values.remark,
    }

    await fetch(`/api/device/calibration-plan/${currentPlan!.id}/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recordData)
    })
    message.success('添加记录成功')

    // 刷新记录列表
    const res = await fetch(`/api/device/calibration-plan/${currentPlan!.id}/records`)
    const json = await res.json()
    setRecords(json.list || [])

    // 更新计划的下次检定日期
    await fetch(`/api/device/calibration-plan/${currentPlan!.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nextCalibrationDate: recordData.nextDate })
    })

    form.resetFields(['recordDate', 'result', 'certificateNo', 'recordNextDate', 'operator', 'remark'])
  }

  const recordColumns: ColumnsType<CalibrationRecord> = [
    {
      title: '检定日期',
      dataIndex: 'calibrationDate',
      width: 120,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD'),
    },
    {
      title: '检定结果',
      dataIndex: 'result',
      width: 100,
      render: (r: string) => {
        if (r === 'qualified') return <Tag color="success">合格</Tag>
        if (r === 'unqualified') return <Tag color="error">不合格</Tag>
        if (r === 'conditional') return <Tag color="warning">条件合格</Tag>
        return <Tag>{r}</Tag>
      },
    },
    { title: '证书编号', dataIndex: 'certificateNo', width: 120 },
    {
      title: '下次检定',
      dataIndex: 'nextDate',
      width: 120,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD'),
    },
    { title: '检定人', dataIndex: 'operator', width: 100 },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
  ]

  const columns: ColumnsType<CalibrationPlan> = [
    { title: '计划名称', dataIndex: 'planName', width: 150 },
    {
      title: '设备名称',
      dataIndex: 'deviceName',
      width: 120,
      render: (v) => v || '-',
    },
    {
      title: '周期类型',
      dataIndex: 'cycleType',
      width: 100,
      render: (t: string) => {
        const opt = CYCLE_TYPE_OPTIONS.find(o => o.value === t)
        return opt ? <Tag>{opt.label}</Tag> : '-'
      },
    },
    {
      title: '上次检定',
      dataIndex: 'lastCalibrationDate',
      width: 110,
      render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD') : '-',
    },
    {
      title: '下次检定',
      dataIndex: 'nextCalibrationDate',
      width: 110,
      render: (t: string) => {
        if (!t) return '-'
        const date = dayjs(t)
        const isOverdue = date.isBefore(dayjs(), 'day')
        return isOverdue ? (
          <Tag color="error" icon={<ExclamationCircleOutlined />}>{date.format('YYYY-MM-DD')}</Tag>
        ) : (
          <Tag color="blue">{date.format('YYYY-MM-DD')}</Tag>
        )
      },
    },
    {
      title: '检定机构',
      dataIndex: 'calibratingOrganization',
      width: 120,
      render: (v) => v || '-',
    },
    {
      title: '负责人',
      dataIndex: 'responsiblePerson',
      width: 80,
      render: (v) => v || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: string) => <StatusTag type="calibration_plan" status={s} />,
    },
    {
      title: '操作',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            icon={<FileTextOutlined />}
            onClick={() => handleViewRecords(record)}
          >
            记录
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="确认删除" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>定检计划</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增计划</Button>
      </div>

      {/* 筛选条件 */}
      <div style={{ background: '#f5f5f5', padding: 16, marginBottom: 16, borderRadius: 4 }}>
        <Form layout="inline">
          <Form.Item label="状态">
            <Select
              placeholder="全部"
              allowClear
              style={{ width: 120 }}
              options={STATUS_OPTIONS}
              onChange={(val) => {
                // TODO: 实现筛选
              }}
            />
          </Form.Item>
          <Form.Item label="周期类型">
            <Select
              placeholder="全部"
              allowClear
              style={{ width: 120 }}
              options={CYCLE_TYPE_OPTIONS}
              onChange={(val) => {
                // TODO: 实现筛选
              }}
            />
          </Form.Item>
        </Form>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        scroll={{ x: 1100 }}
        pagination={{ current: page, total, pageSize: 10, onChange: setPage, showSizeChanger: false }}
      />

      {/* 新增/编辑模态框 */}
      <Modal
        title={editingId ? '编辑定检计划' : '新增定检计划'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="deviceId" label="关联设备" rules={[{ required: true, message: '请选择设备' }]}>
                <Select
                  placeholder="请选择设备"
                  showSearch
                  optionFilterProp="children"
                  onChange={(val) => {
                    const device = devices.find(d => d.id === val)
                    form.setFieldsValue({ deviceName: device?.name })
                  }}
                >
                  {devices.map(d => (
                    <Select.Option key={d.id} value={d.id}>{d.name} ({d.deviceNo})</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="deviceName" label="设备名称" hidden>
                <Input />
              </Form.Item>
              <Form.Item name="planName" label="计划名称" rules={[{ required: true, message: '请输入计划名称' }]}>
                <Input placeholder="如：万能试验机年度检定" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="cycleType" label="周期类型" rules={[{ required: true }]}>
                <Select
                  options={CYCLE_TYPE_OPTIONS}
                  onChange={(val) => {
                    form.setFieldsValue({ cycleMonths: CYCLE_MONTHS_MAP[val] })
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="cycleMonths" label="周期月数" rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="status" label="状态" rules={[{ required: true }]}>
                <Select options={STATUS_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="lastCalibrationDate" label="上次检定日期">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="nextCalibrationDate" label="下次检定日期" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="calibratingOrganization" label="检定机构">
                <Input placeholder="请输入检定机构" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="responsiblePerson" label="负责人">
                <Input placeholder="请输入负责人" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 检定记录抽屉 */}
      <Drawer
        title="检定记录"
        placement="right"
        width={700}
        open={recordDrawerOpen}
        onClose={() => setRecordDrawerOpen(false)}
      >
        {currentPlan && (
          <div>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="计划名称">{currentPlan.planName}</Descriptions.Item>
              <Descriptions.Item label="设备名称">{currentPlan.deviceName}</Descriptions.Item>
              <Descriptions.Item label="周期类型">
                {CYCLE_TYPE_OPTIONS.find(o => o.value === currentPlan.cycleType)?.label}
              </Descriptions.Item>
              <Descriptions.Item label="下次检定">
                {currentPlan.nextCalibrationDate ? dayjs(currentPlan.nextCalibrationDate).format('YYYY-MM-DD') : '-'}
              </Descriptions.Item>
            </Descriptions>

            <Divider>添加检定记录</Divider>
            <Form layout="vertical" style={{ marginBottom: 24 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="recordDate" label="检定日期">
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="result" label="检定结果">
                    <Select>
                      <Select.Option value="qualified">合格</Select.Option>
                      <Select.Option value="unqualified">不合格</Select.Option>
                      <Select.Option value="conditional">条件合格</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="certificateNo" label="证书编号">
                    <Input placeholder="请输入证书编号" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="recordNextDate" label="下次检定日期">
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="operator" label="检定人">
                    <Input placeholder="请输入检定人" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label=" ">
                    <Button type="primary" onClick={handleAddRecord} block icon={<CheckOutlined />}>
                      添加记录
                    </Button>
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="remark" label="备注">
                <Input.TextArea rows={2} placeholder="请输入备注" />
              </Form.Item>
            </Form>

            <Divider>历史记录</Divider>
            <Table
              columns={recordColumns}
              dataSource={records}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </div>
        )}
      </Drawer>
    </div>
  )
}
