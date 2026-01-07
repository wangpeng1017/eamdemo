'use client'

import { useState, useEffect } from "react"
import { Table, Button, Tag, Modal, Form, Input, Select, DatePicker, message, Space, Card, Statistic } from "antd"
import { PlusOutlined, ArrowLeftOutlined, CheckOutlined } from "@ant-design/icons"
import type { ColumnsType } from "antd/es/table"
import dayjs from "dayjs"

interface Requisition {
  id: string
  requisitionNo: string
  sample: { sampleNo: string; name: string; specification: string; unit: string }
  quantity: string
  requisitionBy: string
  requisitionDate: string
  expectedReturnDate: string | null
  returnDate: string | null
  status: string
  remark: string | null
}

const statusMap: Record<string, { text: string; color: string }> = {
  requisitioned: { text: "借出中", color: "processing" },
  returned: { text: "已归还", color: "success" },
  overdue: { text: "逾期未还", color: "error" },
}

export default function SampleRequisitionPage() {
  const [data, setData] = useState<Requisition[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [samples, setSamples] = useState<any[]>([])
  const [form] = Form.useForm()

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

  const fetchSamples = async () => {
    try {
      const res = await fetch('/api/sample/available')
      const json = await res.json()
      setSamples(json.list || [])
    } catch (error) {
      console.error('获取样品列表失败', error)
    }
  }

  useEffect(() => { fetchData() }, [page, statusFilter])

  const handleAdd = () => {
    fetchSamples()
    form.resetFields()
    form.setFieldValue("requisitionDate", dayjs())
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    try {
      const res = await fetch("/api/sample/requisition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          requisitionDate: values.requisitionDate.toISOString(),
          expectedReturnDate: values.expectedReturnDate?.toISOString(),
        }),
      })
      if (res.ok) {
        message.success("借样登记成功")
        setModalOpen(false)
        fetchData()
      } else {
        message.error("借样登记失败")
      }
    } catch (error) {
      message.error("借样登记失败")
    }
  }

  const handleReturn = async (record: Requisition) => {
    Modal.confirm({
      title: "确认归还",
      content: `确认归还样品 ${record.sample.name} 吗？`,
      onOk: async () => {
        try {
          const res = await fetch(`/api/sample/requisition/${record.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: "returned",
              returnDate: new Date().toISOString(),
            }),
          })
          if (res.ok) {
            message.success("归还成功")
            fetchData()
          } else {
            message.error("归还失败")
          }
        } catch (error) {
          message.error("归还失败")
        }
      },
    })
  }

  const columns: ColumnsType<Requisition> = [
    { title: "借样编号", dataIndex: "requisitionNo", width: 150 },
    { title: "样品编号", render: (_, r) => r.sample?.sampleNo, width: 120 },
    { title: "样品名称", render: (_, r) => r.sample?.name, width: 150 },
    { title: "规格型号", render: (_, r) => r.sample?.specification, width: 120 },
    { title: "借用数量", dataIndex: "quantity", width: 100, render: (v, r) => `${v} ${r.sample?.unit || ""}`.trim() },
    { title: "借用人", dataIndex: "requisitionBy", width: 100 },
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
      render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text || s}</Tag>,
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      width: 170,
      render: (t: string) => t ? dayjs(t).format("YYYY-MM-DD HH:mm:ss") : "-",
    },
    {
      title: "操作",
      width: 120,
      fixed: "right" as const,
      render: (_, record) => (
        record.status === "requisitioned" || record.status === "overdue" ? (
          <Button
            type="primary"
            size="small"
            icon={<CheckOutlined />}
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
          <Statistic title="借出中" value={data.filter((d) => d.status === "requisitioned").length} />
        </Card>
        <Card>
          <Statistic title="已归还" value={data.filter((d) => d.status === "returned").length} />
        </Card>
        <Card>
          <Statistic title="逾期未还" value={data.filter((d) => d.status === "overdue").length} valueStyle={{ color: "#cf1322" }} />
        </Card>
      </div>

      <div className="mb-4 flex justify-between">
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
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          借样登记
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1400 }}
        pagination={{
          current: page,
          pageSize: 10,
          total,
          onChange: (p) => setPage(p),
        }}
      />

      <Modal
        title="借样登记"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="选择样品" name="sampleId" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="请选择样品"
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
              options={samples.map((s) => ({
                value: s.id,
                label: `${s.sampleNo} - ${s.name}`,
              }))}
            />
          </Form.Item>
          <Form.Item label="借用数量" name="quantity" rules={[{ required: true }]}>
            <Input placeholder="请输入借用数量" />
          </Form.Item>
          <Form.Item label="借用人" name="requisitionBy" rules={[{ required: true }]}>
            <Input placeholder="请输入借用人姓名" />
          </Form.Item>
          <Form.Item label="借用日期" name="requisitionDate" rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="应还日期" name="expectedReturnDate">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={3} placeholder="备注信息（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
