content = '''"use client"

import { useState, useEffect } from "react"
import { Table, Button, Space, Tag, Modal, Form, Input, Select, DatePicker, message, Popconfirm } from "antd"
import { PlusOutlined, PrinterOutlined, SearchOutlined } from "@ant-design/icons"
import type { ColumnsType } from "antd/es/table"
import dayjs from "dayjs"

interface Sample {
  id: string
  sampleNo: string
  name: string
  type: string | null
  specification: string | null
  quantity: string | null
  totalQuantity: string | null
  unit: string | null
  storageLocation: string | null
  status: string
  receiptDate: string | null
  receiptPerson: string | null
  createdAt: string
}

const statusMap: Record<string, { text: string; color: string }> = {
  received: { text: "已收样", color: "success" },
  allocated: { text: "已分配", color: "processing" },
  testing: { text: "检测中", color: "blue" },
  completed: { text: "已完成", color: "default" },
  returned: { text: "已归还", color: "warning" },
  destroyed: { text: "已销毁", color: "error" },
}

export default function SampleReceiptPage() {
  const [data, setData] = useState<Sample[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [keyword, setKeyword] = useState("")
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [form] = Form.useForm()

  const fetchData = async (p = page) => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(p),
      pageSize: "10",
      ...(keyword && { keyword }),
      ...(statusFilter && { status: statusFilter }),
    })
    const res = await fetch(`/api/sample?${params}`)
    const json = await res.json()
    setData(json.list)
    setTotal(json.total)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [page, keyword, statusFilter])

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
      receiptPerson: "当前用户", // TODO: 从 session 获取
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

  const handlePrintLabel = async (record: Sample) => {
    // TODO: 实现标签打印功能
    message.info("标签打印功能待实现")
  }

  const columns: ColumnsType<Sample> = [
    { title: "样品编号", dataIndex: "sampleNo", width: 150 },
    { title: "样品名称", dataIndex: "name" },
    { title: "规格型号", dataIndex: "specification", width: 120 },
    { title: "数量", dataIndex: "quantity", width: 80, render: (v, r) => `${v} ${r.unit || ""}` },
    { title: "存放位置", dataIndex: "storageLocation", width: 120 },
    { title: "收样人", dataIndex: "receiptPerson", width: 100 },
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
    {
      title: "操作",
      width: 120,
      fixed: "right" as const,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<PrinterOutlined />} onClick={() => handlePrintLabel(record)}>
            标签
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div className="p-4">
      <div className="mb-4 flex justify-between">
        <Space>
          <Input
            placeholder="搜索样品编号/名称"
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={() => fetchData(1)}
            allowClear
          />
          <Select
            placeholder="状态筛选"
            allowClear
            style={{ width: 120 }}
            onChange={(v) => setStatusFilter(v)}
            value={statusFilter}
          >
            <Select.Option value="received">已收样</Select.Option>
            <Select.Option value="allocated">已分配</Select.Option>
            <Select.Option value="testing">检测中</Select.Option>
            <Select.Option value="completed">已完成</Select.Option>
          </Select>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          收样登记
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1200 }}
        pagination={{
          current: page,
          pageSize: 10,
          total,
          onChange: (p) => setPage(p),
          showSizeChanger: false,
        }}
      />

      <Modal
        title="收样登记"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="样品名称" name="name" rules={[{ required: true }]}>
            <Input placeholder="请输入样品名称" />
          </Form.Item>
          <Form.Item label="规格型号" name="specification">
            <Input placeholder="请输入规格型号" />
          </Form.Item>
          <Form.Item label="样品类型" name="type">
            <Select placeholder="请选择样品类型">
              <Select.Option value="机械">机械</Select.Option>
              <Select.Option value="电子">电子</Select.Option>
              <Select.Option value="化工">化工</Select.Option>
              <Select.Option value="其他">其他</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="数量" name="quantity">
            <Input placeholder="请输入数量" />
          </Form.Item>
          <Form.Item label="单位" name="unit">
            <Select placeholder="请选择单位">
              <Select.Option value="个">个</Select.Option>
              <Select.Option value="件">件</Select.Option>
              <Select.Option value="批">批</Select.Option>
              <Select.Option value="kg">kg</Select.Option>
              <Select.Option value="g">g</Select.Option>
              <Select.Option value="L">L</Select.Option>
              <Select.Option value="mL">mL</Select.Option>
              <Select.Option value="m">m</Select.Option>
              <Select.Option value="m²">m²</Select.Option>
              <Select.Option value="m³">m³</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="总量" name="totalQuantity">
            <Input placeholder="样品总量" />
          </Form.Item>
          <Form.Item label="存放位置" name="storageLocation">
            <Input placeholder="请输入存放位置" />
          </Form.Item>
          <Form.Item label="收样日期" name="receiptDate" rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="委托单号" name="entrustmentId">
            <Input placeholder="关联委托单号（可选）" />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={3} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
'''

with open('E:/trae/0lims-next/src/app/(dashboard)/sample/receipt/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Created sample/receipt page')
