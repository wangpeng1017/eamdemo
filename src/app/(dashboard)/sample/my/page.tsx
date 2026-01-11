'use client'

import { useState, useEffect } from "react"
import { Table, Button, Tag, Modal, Form, Input, DatePicker, Select, message, Card, Statistic, Space } from "antd"
import { ArrowLeftOutlined, ClockCircleOutlined, ExclamationCircleOutlined, PlusOutlined } from "@ant-design/icons"
import type { ColumnsType } from "antd/es/table"
import dayjs from "dayjs"

interface RequisitionRecord {
  id: string
  sampleId: string
  sampleNo: string
  name: string
  specification: string | null
  quantity: string
  unit: string | null
  purpose: string | null
  requisitionDate: string
  expectedReturnDate: string | null
  actualReturnDate: string | null
  status: string
  sample?: {
    sampleNo: string
    name: string
    specification: string | null
    unit: string | null
  }
}

interface Sample {
  id: string
  sampleNo: string
  name: string
  specification: string | null
  quantity: string | null
}

const statusMap: Record<string, { text: string; color: string }> = {
  requisitioned: { text: "领用中", color: "processing" },
  returned: { text: "已归还", color: "success" },
  overdue: { text: "逾期未还", color: "error" },
}

export default function MySamplesPage() {
  const [data, setData] = useState<RequisitionRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [stats, setStats] = useState({ requisitioned: 0, returned: 0, overdue: 0 })

  // Return Modal
  const [returnModalOpen, setReturnModalOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<RequisitionRecord | null>(null)
  const [returnForm] = Form.useForm()

  // New Requisition Modal
  const [requisitionModalOpen, setRequisitionModalOpen] = useState(false)
  const [requisitionForm] = Form.useForm()
  const [samples, setSamples] = useState<Sample[]>([])
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null)

  const fetchData = async (p = page) => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(p),
      pageSize: "10",
      ...(statusFilter && { status: statusFilter }),
    })
    try {
      const res = await fetch(`/api/sample/requisition?${params}`)
      const json = await res.json()
      // Transform data to include sample info
      const list = (json.list || []).map((item: any) => ({
        ...item,
        sampleNo: item.sample?.sampleNo || '',
        name: item.sample?.name || '',
        specification: item.sample?.specification || '',
        unit: item.sample?.unit || '',
      }))
      setData(list)
      setTotal(json.total || 0)
      // Compute stats
      const allRes = await fetch('/api/sample/requisition?pageSize=1000')
      const allJson = await allRes.json()
      const allList = allJson.list || []
      setStats({
        requisitioned: allList.filter((r: any) => r.status === 'requisitioned').length,
        returned: allList.filter((r: any) => r.status === 'returned').length,
        overdue: allList.filter((r: any) => r.status === 'overdue').length,
      })
    } catch (error) {
      message.error("获取数据失败")
    } finally {
      setLoading(false)
    }
  }

  const fetchSamples = async () => {
    try {
      const res = await fetch('/api/sample?pageSize=100&status=received')
      const json = await res.json()
      if (json.success && json.data) {
        setSamples(json.data.list || [])
      } else {
        setSamples(json.list || [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => { fetchData() }, [page, statusFilter])
  useEffect(() => { fetchSamples() }, [])

  // -- Return Handlers --
  const handleReturn = (record: RequisitionRecord) => {
    setSelectedRecord(record)
    returnForm.setFieldsValue({
      returnDate: dayjs(),
    })
    setReturnModalOpen(true)
  }

  const handleReturnSubmit = async () => {
    const values = await returnForm.validateFields()
    try {
      const res = await fetch(`/api/sample/requisition/${selectedRecord?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'returned',
          actualReturnDate: values.returnDate.toISOString(),
          remark: values.returnRemark,
        }),
      })
      if (res.ok) {
        message.success("归还成功")
        setReturnModalOpen(false)
        fetchData()
      } else {
        message.error("归还失败")
      }
    } catch (error) {
      message.error("归还失败")
    }
  }

  // -- New Requisition Handlers --
  const handleNewRequisition = () => {
    requisitionForm.resetFields()
    setSelectedSample(null)
    setRequisitionModalOpen(true)
  }

  const handleSampleChange = (sampleId: string) => {
    const sample = samples.find(s => s.id === sampleId)
    setSelectedSample(sample || null)
    if (sample) {
      requisitionForm.setFieldsValue({
        quantity: sample.quantity,
      })
    }
  }

  const handleRequisitionSubmit = async () => {
    const values = await requisitionForm.validateFields()
    try {
      const res = await fetch('/api/sample/requisition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sampleId: values.sampleId,
          quantity: values.quantity,
          purpose: values.purpose,
          expectedReturnDate: values.expectedReturnDate?.toISOString(),
          requisitionBy: values.requisitionBy || '当前用户',
        }),
      })
      if (res.ok) {
        message.success("领用成功")
        setRequisitionModalOpen(false)
        fetchData()
      } else {
        const err = await res.json()
        message.error(err.error || "领用失败")
      }
    } catch (error) {
      message.error("领用失败")
    }
  }

  const columns: ColumnsType<RequisitionRecord> = [
    { title: "样品编号", dataIndex: "sampleNo", width: 150 },
    { title: "样品名称", dataIndex: "name", width: 150 },
    { title: "领用数量", dataIndex: "quantity", width: 100 },
    { title: "用途", dataIndex: "purpose", width: 150, ellipsis: true },
    {
      title: "领用日期",
      dataIndex: "requisitionDate",
      width: 120,
      render: (d) => dayjs(d).format("YYYY-MM-DD"),
    },
    {
      title: "预计归还",
      dataIndex: "expectedReturnDate",
      width: 120,
      render: (d) => d ? dayjs(d).format("YYYY-MM-DD") : "-",
    },
    {
      title: "实际归还",
      dataIndex: "actualReturnDate",
      width: 120,
      render: (d) => d ? dayjs(d).format("YYYY-MM-DD") : "-",
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text || s}</Tag>,
    },
    {
      title: "操作",
      width: 100,
      render: (_, record) => (
        record.status === "requisitioned" || record.status === "overdue" ? (
          <Button
            type="link"
            onClick={() => handleReturn(record)}
          >
            归还
          </Button>
        ) : null
      ),
    },
  ]

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold m-0">我的样品</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleNewRequisition}>
          新建领用
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <Card>
          <Statistic
            title="领用中"
            value={stats.requisitioned}
            prefix={<ClockCircleOutlined />}
            valueStyle={{ color: "#1890ff" }}
          />
        </Card>
        <Card>
          <Statistic
            title="已归还"
            value={stats.returned}
            valueStyle={{ color: "#52c41a" }}
          />
        </Card>
        <Card>
          <Statistic
            title="逾期未还"
            value={stats.overdue}
            prefix={<ExclamationCircleOutlined />}
            valueStyle={{ color: "#cf1322" }}
          />
        </Card>
      </div>

      <div className="mb-4">
        <Select
          placeholder="状态筛选"
          allowClear
          style={{ width: 120 }}
          value={statusFilter}
          onChange={(v) => setStatusFilter(v)}
        >
          <Select.Option value="requisitioned">领用中</Select.Option>
          <Select.Option value="returned">已归还</Select.Option>
          <Select.Option value="overdue">逾期未还</Select.Option>
        </Select>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize: 10,
          total,
          onChange: (p) => setPage(p),
        }}
      />

      {/* 归还 Modal */}
      <Modal
        title="归还样品"
        open={returnModalOpen}
        onCancel={() => setReturnModalOpen(false)}
        onOk={handleReturnSubmit}
      >
        <Form form={returnForm} layout="vertical">
          <Form.Item label="样品编号">
            <Input value={selectedRecord?.sampleNo} disabled />
          </Form.Item>
          <Form.Item label="样品名称">
            <Input value={selectedRecord?.name} disabled />
          </Form.Item>
          <Form.Item label="归还日期" name="returnDate" rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="备注" name="returnRemark">
            <Input.TextArea rows={3} placeholder="归还备注（可选）" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 新建领用 Modal */}
      <Modal
        title="新建领用"
        open={requisitionModalOpen}
        onCancel={() => setRequisitionModalOpen(false)}
        onOk={handleRequisitionSubmit}
        width={500}
      >
        <Form form={requisitionForm} layout="vertical">
          <Form.Item label="选择样品" name="sampleId" rules={[{ required: true, message: '请选择样品' }]}>
            <Select
              showSearch
              placeholder="搜索样品编号或名称"
              optionFilterProp="label"
              onChange={handleSampleChange}
              options={samples.map(s => ({
                value: s.id,
                label: `${s.sampleNo} - ${s.name}`,
              }))}
            />
          </Form.Item>

          {selectedSample && (
            <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
              <div><strong>样品编号:</strong> {selectedSample.sampleNo}</div>
              <div><strong>样品名称:</strong> {selectedSample.name}</div>
              <div><strong>规格型号:</strong> {selectedSample.specification || '-'}</div>
            </Card>
          )}

          <Form.Item label="领用数量" name="quantity" rules={[{ required: true, message: '请输入领用数量' }]}>
            <Input placeholder="如：3" />
          </Form.Item>
          <Form.Item label="用途" name="purpose" rules={[{ required: true, message: '请输入用途' }]}>
            <Input placeholder="如：抗压强度检测" />
          </Form.Item>
          <Form.Item label="预计归还日期" name="expectedReturnDate">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="领用人" name="requisitionBy">
            <Input placeholder="如未填写，将使用当前用户" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
