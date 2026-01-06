'use client'

import { useState, useEffect } from "react"
import { Table, Button, Tag, Modal, Form, Input, DatePicker, Select, message, Card, Statistic } from "antd"
import { ArrowLeftOutlined, ClockCircleOutlined, ExclamationCircleOutlined } from "@ant-design/icons"
import type { ColumnsType } from "antd/es/table"
import dayjs from "dayjs"

interface Sample {
  id: string
  sampleNo: string
  name: string
  specification: string | null
  quantity: string
  unit: string | null
  requisitionDate: string
  returnDate: string | null
  expectedReturnDate: string | null
  status: string
  remark: string | null
}

const statusMap: Record<string, { text: string; color: string }> = {
  requisitioned: { text: "借出中", color: "processing" },
  returned: { text: "已归还", color: "success" },
  overdue: { text: "逾期未还", color: "error" },
}

export default function MySamplesPage() {
  const [data, setData] = useState<Sample[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [returnModalOpen, setReturnModalOpen] = useState(false)
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null)
  const [stats, setStats] = useState({ requisitioned: 0, returned: 0, overdue: 0 })
  const [returnForm] = Form.useForm()

  const fetchData = async (p = page) => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(p),
      pageSize: "10",
      ...(statusFilter && { status: statusFilter }),
    })
    try {
      const res = await fetch(`/api/sample/my?${params}`)
      const json = await res.json()
      setData(json.list || [])
      setTotal(json.total || 0)
      setStats(json.stats || { requisitioned: 0, returned: 0, overdue: 0 })
    } catch (error) {
      message.error("获取数据失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [page, statusFilter])

  const handleReturn = (record: Sample) => {
    setSelectedSample(record)
    returnForm.setFieldsValue({
      returnDate: dayjs(),
      actualQuantity: record.quantity,
    })
    setReturnModalOpen(true)
  }

  const handleReturnSubmit = async () => {
    const values = await returnForm.validateFields()
    try {
      const res = await fetch(`/api/sample/requisition/${selectedSample?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'returned',
          returnDate: values.returnDate.toISOString(),
          returnRemark: values.returnRemark,
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

  const columns: ColumnsType<Sample> = [
    { title: "样品编号", dataIndex: "sampleNo", width: 150 },
    { title: "样品名称", dataIndex: "name", width: 150 },
    { title: "规格型号", dataIndex: "specification", width: 120 },
    {
      title: "借用数量",
      width: 100,
      render: (_, r) => `${r.quantity} ${r.unit || ""}`.trim(),
    },
    {
      title: "借用日期",
      dataIndex: "requisitionDate",
      width: 120,
      render: (d) => dayjs(d).format("YYYY-MM-DD"),
    },
    {
      title: "应还日期",
      dataIndex: "expectedReturnDate",
      width: 120,
      render: (d) => d ? dayjs(d).format("YYYY-MM-DD") : "-",
    },
    {
      title: "归还日期",
      dataIndex: "returnDate",
      width: 120,
      render: (d) => d ? dayjs(d).format("YYYY-MM-DD") : "-",
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag>,
    },
    {
      title: "操作",
      width: 100,
      render: (_, record) => (
        record.status === "requisitioned" || record.status === "overdue" ? (
          <Button
            type="primary"
            size="small"
            icon={<ArrowLeftOutlined />}
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
      <div className="grid grid-cols-3 gap-4 mb-4">
        <Card>
          <Statistic
            title="借出中"
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
          <Select.Option value="requisitioned">借出中</Select.Option>
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

      <Modal
        title="归还样品"
        open={returnModalOpen}
        onCancel={() => setReturnModalOpen(false)}
        onOk={handleReturnSubmit}
      >
        <Form form={returnForm} layout="vertical">
          <Form.Item label="样品编号">
            <Input value={selectedSample?.sampleNo} disabled />
          </Form.Item>
          <Form.Item label="样品名称">
            <Input value={selectedSample?.name} disabled />
          </Form.Item>
          <Form.Item label="归还日期" name="returnDate" rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="备注" name="returnRemark">
            <Input.TextArea rows={3} placeholder="归还备注（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
