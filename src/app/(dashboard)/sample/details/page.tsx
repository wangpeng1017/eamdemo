'use client'

import { useState, useEffect } from "react"
import { Table, Button, Tag, Modal, Form, Input, InputNumber, Select, DatePicker, message, Space, Card } from "antd"
import { UserOutlined, SendOutlined, HistoryOutlined, SearchOutlined } from "@ant-design/icons"
import type { ColumnsType } from "antd/es/table"
import dayjs from "dayjs"

interface Sample {
  id: string
  sampleNo: string
  name: string
  specification: string | null
  totalQuantity: string | null
  remainingQuantity: string | null
  quantity: string | null
  unit: string | null
  storageLocation: string | null
  status: string
  receiptDate: string | null
  receiptPerson: string | null
  requisitions?: Requisition[]
}

interface Requisition {
  id: string
  requisitionNo: string
  requisitionBy: string
  requisitionDate: string
  expectedReturnDate: string | null
  actualReturnDate: string | null
  status: string
  quantity: string
  purpose: string | null
  type?: string // internal / outsource
}

interface Supplier {
  id: string
  name: string
}

const statusMap: Record<string, { text: string; color: string }> = {
  received: { text: "已收样", color: "success" },
  allocated: { text: "已分配", color: "processing" },
  testing: { text: "检测中", color: "blue" },
  completed: { text: "已完成", color: "default" },
  returned: { text: "已归还", color: "magenta" },
}

const requisitionStatusMap: Record<string, { text: string; color: string }> = {
  requisitioned: { text: "使用中", color: "processing" },
  returned: { text: "已归还", color: "success" },
  overdue: { text: "逾期", color: "error" },
}

export default function SampleDetailsPage() {
  const [data, setData] = useState<Sample[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState("")
  const [statusFilter, setStatusFilter] = useState<string | undefined>()

  // Selected sample for modals
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null)

  // Internal Requisition Modal
  const [internalModalOpen, setInternalModalOpen] = useState(false)
  const [internalForm] = Form.useForm()

  // External Outsource Modal
  const [externalModalOpen, setExternalModalOpen] = useState(false)
  const [externalForm] = Form.useForm()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  // Records Modal
  const [recordsModalOpen, setRecordsModalOpen] = useState(false)
  const [requisitionRecords, setRequisitionRecords] = useState<Requisition[]>([])

  const fetchData = async (p = page) => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(p),
      pageSize: "10",
      ...(keyword && { keyword }),
      ...(statusFilter && { status: statusFilter }),
    })
    try {
      const res = await fetch(`/api/sample?${params}`)
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data.list || [])
        setTotal(json.data.total || 0)
      } else {
        setData(json.list || [])
        setTotal(json.total || 0)
      }
    } catch (error) {
      message.error("获取数据失败")
    } finally {
      setLoading(false)
    }
  }

  const fetchSuppliers = async () => {
    try {
      const res = await fetch('/api/supplier?pageSize=100')
      const json = await res.json()
      setSuppliers(json.list || [])
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => { fetchData() }, [page, keyword, statusFilter])
  useEffect(() => { fetchSuppliers() }, [])

  // Calculate available quantity
  const getAvailableQty = (sample: Sample): string => {
    const total = parseInt(sample.totalQuantity || sample.quantity || '0') || 0
    const remaining = parseInt(sample.remainingQuantity || sample.quantity || '0') || total
    return String(remaining)
  }

  // -- Internal Requisition --
  const handleInternalRequisition = (record: Sample) => {
    setSelectedSample(record)
    internalForm.resetFields()
    internalForm.setFieldsValue({
      requisitionDate: dayjs(),
      expectedReturnDate: dayjs().add(7, 'day'),
    })
    setInternalModalOpen(true)
  }

  const handleInternalSubmit = async () => {
    const values = await internalForm.validateFields()
    try {
      const res = await fetch('/api/sample/requisition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sampleId: selectedSample?.id,
          quantity: String(values.quantity),
          purpose: values.purpose,
          requisitionBy: values.requisitionBy || values.lab,
          expectedReturnDate: values.expectedReturnDate?.toISOString(),
        }),
      })
      if (res.ok) {
        message.success("内部领用成功")
        setInternalModalOpen(false)
        fetchData()
      } else {
        const err = await res.json()
        message.error(err.error || "领用失败")
      }
    } catch (error) {
      message.error("领用失败")
    }
  }

  // -- External Outsource --
  const handleExternalOutsource = (record: Sample) => {
    setSelectedSample(record)
    externalForm.resetFields()
    externalForm.setFieldsValue({
      allocationDate: dayjs(),
      deadline: dayjs().add(14, 'day'),
    })
    setExternalModalOpen(true)
  }

  const handleExternalSubmit = async () => {
    const values = await externalForm.validateFields()
    try {
      const res = await fetch('/api/sample/requisition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sampleId: selectedSample?.id,
          quantity: String(values.quantity),
          purpose: `外包委外 - ${values.testItem || '检测'}`,
          requisitionBy: `供应商: ${suppliers.find(s => s.id === values.supplierId)?.name || values.supplierId}`,
          expectedReturnDate: values.deadline?.toISOString(),
          remark: values.remark,
        }),
      })
      if (res.ok) {
        message.success("外部委外成功")
        setExternalModalOpen(false)
        fetchData()
      } else {
        const err = await res.json()
        message.error(err.error || "委外失败")
      }
    } catch (error) {
      message.error("委外失败")
    }
  }

  // -- Records --
  const handleViewRecords = async (record: Sample) => {
    setSelectedSample(record)
    try {
      const res = await fetch(`/api/sample/requisition?sampleId=${record.id}&pageSize=100`)
      const json = await res.json()
      setRequisitionRecords(json.list || [])
      setRecordsModalOpen(true)
    } catch (e) {
      message.error("获取记录失败")
    }
  }

  const columns: ColumnsType<Sample> = [
    { title: "样品编号", dataIndex: "sampleNo", width: 140 },
    { title: "样品名称", dataIndex: "name", width: 140, ellipsis: true },
    { title: "规格型号", dataIndex: "specification", width: 120 },
    {
      title: "总量",
      dataIndex: "totalQuantity",
      width: 80,
      render: (v, r) => v || r.quantity || '-'
    },
    {
      title: "可用量",
      width: 80,
      render: (_, r) => {
        const avail = getAvailableQty(r)
        const total = parseInt(r.totalQuantity || r.quantity || '0') || 0
        const availNum = parseInt(avail) || 0
        const color = availNum === 0 ? '#cf1322' : availNum < total * 0.3 ? '#fa8c16' : '#52c41a'
        return <span style={{ color, fontWeight: 500 }}>{avail}</span>
      }
    },
    {
      title: "收样日期",
      dataIndex: "receiptDate",
      width: 100,
      render: (d) => d ? dayjs(d).format("YYYY-MM-DD") : "-",
    },
    { title: "收样人", dataIndex: "receiptPerson", width: 80 },
    {
      title: '操作', fixed: 'right',
      
      fixed: "right" as const,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<UserOutlined />}
            onClick={() => handleInternalRequisition(record)}
          >
            内部领用
          </Button>
          <Button
            type="link"
            size="small"
            icon={<SendOutlined />}
            style={{ color: '#52c41a' }}
            onClick={() => handleExternalOutsource(record)}
          >
            外部委外
          </Button>
          <Button
            type="link"
            size="small"
            icon={<HistoryOutlined />}
            onClick={() => handleViewRecords(record)}
          >
            记录
          </Button>
        </Space>
      ),
    },
  ]

  const recordColumns: ColumnsType<Requisition> = [
    { title: "实验室/领用人", dataIndex: "requisitionBy", width: 120, ellipsis: true },
    { title: "领用数量", dataIndex: "quantity", width: 80 },
    { title: "领用日期", dataIndex: "requisitionDate", width: 100, render: (d) => dayjs(d).format("YYYY-MM-DD") },
    { title: "预计归还", dataIndex: "expectedReturnDate", width: 100, render: (d) => d ? dayjs(d).format("YYYY-MM-DD") : "-" },
    {
      title: "状态",
      dataIndex: "status",
      width: 80,
      render: (s) => <Tag color={requisitionStatusMap[s]?.color}>{requisitionStatusMap[s]?.text || s}</Tag>
    },
  ]

  return (
    <div className="p-4">
      <Card title="样品明细台账" bordered={false}>
        <div className="mb-4 flex justify-between items-center">
          <Space>
            <Input
              placeholder="搜索样品编号/名称/委托单号"
              style={{ width: 240 }}
              prefix={<SearchOutlined />}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onPressEnter={() => fetchData(1)}
              allowClear
            />
            <Select
              placeholder="全部状态"
              allowClear
              style={{ width: 120 }}
              value={statusFilter}
              onChange={(v) => setStatusFilter(v)}
            >
              <Select.Option value="received">已收样</Select.Option>
              <Select.Option value="allocated">已分配</Select.Option>
              <Select.Option value="testing">检测中</Select.Option>
              <Select.Option value="completed">已完成</Select.Option>
              <Select.Option value="returned">已归还</Select.Option>
            </Select>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1100 }}
          pagination={{
            current: page,
            pageSize: 10,
            total,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
          }}
        />
      </Card>

      {/* 内部领用 Modal */}
      <Modal
        title={
          <div>
            <div>内部领用</div>
            <div className="text-sm font-normal text-gray-500 mt-1">
              样品名称: <strong className="text-black">{selectedSample?.name}</strong>
              <span className="ml-4">可用数量: <strong className="text-blue-500">{selectedSample ? getAvailableQty(selectedSample) : 0}</strong></span>
            </div>
          </div>
        }
        open={internalModalOpen}
        onCancel={() => setInternalModalOpen(false)}
        onOk={handleInternalSubmit}
        width={500}
      >
        <Form form={internalForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="领用实验室" name="lab" rules={[{ required: true, message: '请选择实验室' }]}>
            <Select placeholder="选择实验室">
              <Select.Option value="物理实验室">物理实验室</Select.Option>
              <Select.Option value="化学实验室">化学实验室</Select.Option>
              <Select.Option value="力学实验室">力学实验室</Select.Option>
              <Select.Option value="材料实验室">材料实验室</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="领用数量" name="quantity" rules={[{ required: true, message: '请输入领用数量' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="检测项目" name="testItem">
            <Select placeholder="输入检测项目" allowClear>
              <Select.Option value="抗压强度检测">抗压强度检测</Select.Option>
              <Select.Option value="抗拉强度检测">抗拉强度检测</Select.Option>
              <Select.Option value="成分分析">成分分析</Select.Option>
              <Select.Option value="其他">其他</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="用途说明" name="purpose" rules={[{ required: true, message: '请输入用途说明' }]}>
            <Input.TextArea rows={2} placeholder="请详细描述用途" />
          </Form.Item>
          <Form.Item label="领用日期" name="requisitionDate" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="预计归还日期" name="expectedReturnDate" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 外部委外 Modal */}
      <Modal
        title={
          <div>
            <div>外部委外</div>
            <div className="text-sm font-normal text-gray-500 mt-1">
              样品名称: <strong className="text-black">{selectedSample?.name}</strong>
              <span className="ml-4">可用数量: <strong className="text-blue-500">{selectedSample ? getAvailableQty(selectedSample) : 0}</strong></span>
            </div>
          </div>
        }
        open={externalModalOpen}
        onCancel={() => setExternalModalOpen(false)}
        onOk={handleExternalSubmit}
        width={500}
      >
        <Form form={externalForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="选择供应商" name="supplierId" rules={[{ required: true, message: '请选择委外供应商' }]}>
            <Select
              placeholder="选择委外供应商"
              showSearch
              optionFilterProp="label"
              options={suppliers.map(s => ({ value: s.id, label: s.name }))}
            />
          </Form.Item>
          <Form.Item label="委外数量" name="quantity" rules={[{ required: true, message: '请输入委外数量' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="检测项目" name="testItem" rules={[{ required: true, message: '请选择检测项目' }]}>
            <Select placeholder="输入检测项目">
              <Select.Option value="抗压强度检测">抗压强度检测</Select.Option>
              <Select.Option value="抗拉强度检测">抗拉强度检测</Select.Option>
              <Select.Option value="成分分析">成分分析</Select.Option>
              <Select.Option value="其他">其他</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="分配日期" name="allocationDate" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="截止日期" name="deadline" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={2} placeholder="备注信息（可选）" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 领用记录 Modal */}
      <Modal
        title={`领用记录 - ${selectedSample?.sampleNo || ''}`}
        open={recordsModalOpen}
        onCancel={() => setRecordsModalOpen(false)}
        footer={null}
        width={700}
      >
        <Table
          columns={recordColumns}
          dataSource={requisitionRecords}
          rowKey="id"
          pagination={false}
          size="small"
          locale={{ emptyText: '暂无领用记录' }}
        />
      </Modal>
    </div>
  )
}
