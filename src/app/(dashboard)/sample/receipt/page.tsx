'use client'

import { useState, useEffect } from "react"
import { Table, Button, Space, Tag, Modal, Form, Input, Select, DatePicker, message } from "antd"
import { PlusOutlined, PrinterOutlined, SearchOutlined } from "@ant-design/icons"
import type { ColumnsType } from "antd/es/table"
import dayjs from "dayjs"

interface Sample {
  id: string
  sampleNo: string
  name: string
  specification: string | null
  quantity: string | null
  unit: string | null
  storageLocation: string | null
  status: string
  receiptDate: string | null
}

const statusMap: Record<string, { text: string; color: string }> = {
  received: { text: "已收样", color: "success" },
  allocated: { text: "已分配", color: "processing" },
  testing: { text: "检测中", color: "blue" },
  completed: { text: "已完成", color: "default" },
}

export default function SampleReceiptPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [keyword, setKeyword] = useState("")
  const [form] = Form.useForm()

  const fetchData = async (p = page) => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(p),
      pageSize: "10",
      ...(keyword && { keyword }),
    })
    const res = await fetch(`/api/sample?${params}`)
    const json = await res.json()
    setData(json.list)
    setTotal(json.total)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [page, keyword])

  const handleAdd = () => {
    form.resetFields()
    form.setFieldValue("receiptDate", dayjs())
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const data = {
      ...values,
      receiptDate: values.receiptDate?.toISOString(),
    }
    await fetch("/api/sample", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })
    message.success("收样登记成功")
    setModalOpen(false)
    fetchData()
  }

  const columns = [
    { title: "样品编号", dataIndex: "sampleNo", width: 150 },
    { title: "样品名称", dataIndex: "name" },
    { title: "规格型号", dataIndex: "specification", width: 120 },
    { title: "数量", dataIndex: "quantity", width: 80 },
    { title: "存放位置", dataIndex: "storageLocation", width: 120 },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag>
    },
    {
      title: "收样日期",
      dataIndex: "receiptDate",
      width: 120,
      render: (d: string) => d ? dayjs(d).format("YYYY-MM-DD") : "-",
    },
  ]

  return (
    <div className="p-4">
      <div className="mb-4 flex justify-between">
        <Input
          placeholder="搜索样品编号/名称"
          style={{ width: 200 }}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={() => fetchData(1)}
          allowClear
        />
        <Button type="primary" onClick={handleAdd}>收样登记</Button>
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

      <Modal title="收样登记" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={handleSubmit} width={600}>
        <Form form={form} layout="vertical">
          <Form.Item label="样品名称" name="name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="规格型号" name="specification"><Input /></Form.Item>
          <Form.Item label="数量" name="quantity"><Input /></Form.Item>
          <Form.Item label="单位" name="unit">
            <Select><Select.Option value="个">个</Select.Option><Select.Option value="件">件</Select.Option></Select>
          </Form.Item>
          <Form.Item label="存放位置" name="storageLocation"><Input /></Form.Item>
          <Form.Item label="收样日期" name="receiptDate" rules={[{ required: true }]}><DatePicker style={{ width: "100%" }} /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
