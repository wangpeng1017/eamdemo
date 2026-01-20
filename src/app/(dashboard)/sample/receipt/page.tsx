'use client'

import { useState, useEffect, useRef } from "react"
import { Table, Button, Space, Tag, Modal, Form, Input, Select, DatePicker, message, Card, Row, Col, Descriptions } from "antd"
import { PlusOutlined, BarcodeOutlined, DownloadOutlined, SearchOutlined } from "@ant-design/icons"
import type { ColumnsType } from "antd/es/table"
import dayjs from "dayjs"
import Barcode from 'react-barcode'
import { toPng } from 'html-to-image'

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
  entrustment?: {
    entrustmentNo: string
    sampleName: string
  }
}

interface Entrustment {
  id: string
  entrustmentNo: string
  sampleName: string | null
  sampleModel: string | null
  sampleQuantity: number | null
  client?: { name: string }
}

const statusMap: Record<string, { text: string; color: string }> = {
  received: { text: "已收样", color: "success" },
  allocated: { text: "已分配", color: "processing" },
  testing: { text: "检测中", color: "blue" },
  completed: { text: "已完成", color: "default" },
  returned: { text: "已归还", color: "magenta" },
}

export default function SampleReceiptPage() {
  const [data, setData] = useState<Sample[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [keyword, setKeyword] = useState("")
  const [form] = Form.useForm()

  // Entrustment data for selection
  const [entrustments, setEntrustments] = useState<Entrustment[]>([])
  const [selectedEntrustment, setSelectedEntrustment] = useState<Entrustment | null>(null)

  // Label Modal
  const [labelModalOpen, setLabelModalOpen] = useState(false)
  const [labelSample, setLabelSample] = useState<Sample | null>(null)
  const labelRef = useRef<HTMLDivElement>(null)

  const fetchData = async (p = page) => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(p),
      pageSize: "10",
      ...(keyword && { keyword }),
    })
    const res = await fetch(`/api/sample?${params}`)
    const json = await res.json()
    if (json.success && json.data) {
      setData(json.data.list || [])
      setTotal(json.data.total || 0)
    } else {
      setData(json.list || [])
      setTotal(json.total || 0)
    }
    setLoading(false)
  }

  const fetchEntrustments = async () => {
    try {
      const res = await fetch('/api/entrustment?pageSize=100')
      const json = await res.json()
      if (json.success && json.data) {
        setEntrustments(json.data.list || [])
      } else {
        setEntrustments(json.list || [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => { fetchData() }, [page, keyword])
  useEffect(() => { fetchEntrustments() }, [])

  const handleAdd = () => {
    form.resetFields()
    form.setFieldValue("receiptDate", dayjs())
    setSelectedEntrustment(null)
    setModalOpen(true)
  }

  const handleEntrustmentChange = (entrustmentId: string) => {
    const ent = entrustments.find(e => e.id === entrustmentId)
    setSelectedEntrustment(ent || null)
    if (ent) {
      form.setFieldsValue({
        name: ent.sampleName || '',
        specification: ent.sampleModel || '',
        quantity: ent.sampleQuantity?.toString() || '',
      })
    }
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const data = {
      ...values,
      entrustmentId: selectedEntrustment?.id || null,
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

  const handleShowLabel = (record: Sample) => {
    setLabelSample(record)
    setLabelModalOpen(true)
  }

  const handleDownloadLabel = async () => {
    if (labelRef.current) {
      try {
        const dataUrl = await toPng(labelRef.current, { backgroundColor: '#fff' })
        const link = document.createElement('a')
        link.download = `label_${labelSample?.sampleNo || 'sample'}.png`
        link.href = dataUrl
        link.click()
        message.success('标签下载成功')
      } catch (e) {
        message.error('下载失败')
      }
    }
  }

  const columns: ColumnsType<Sample> = [
    { title: "样品编号", dataIndex: "sampleNo", width: 150 },
    {
      title: "委托单号",
      dataIndex: ["entrustment", "entrustmentNo"],
      width: 150,
      render: (v) => v || '-'
    },
    { title: "样品名称", dataIndex: "name", width: 150 },
    { title: "规格型号", dataIndex: "specification", width: 120 },
    { title: "数量", dataIndex: "quantity", width: 80 },
    { title: "存放位置", dataIndex: "storageLocation", width: 120 },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text || s}</Tag>
    },
    {
      title: "收样日期",
      dataIndex: "receiptDate",
      width: 120,
      render: (d: string) => d ? dayjs(d).format("YYYY-MM-DD HH:mm:ss") : "-",
    },
    {
      title: "操作",
      width: 80,
      render: (_, record) => (
        <Button
          type="link"
          icon={<BarcodeOutlined />}
          onClick={() => handleShowLabel(record)}
        >
          标签
        </Button>
      )
    }
  ]

  return (
    <div className="p-4">
      <div className="mb-4 flex justify-between">
        <Input
          placeholder="搜索样品编号/名称"
          style={{ width: 200 }}
          prefix={<SearchOutlined />}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={() => fetchData(1)}
          allowClear
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>收样登记</Button>
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

      {/* 收样登记 Modal */}
      <Modal
        title="收样登记"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="委托单号" name="entrustmentId">
            <Select
              showSearch
              allowClear
              placeholder="选择委托单（可选）"
              optionFilterProp="label"
              onChange={handleEntrustmentChange}
              options={entrustments.map(e => ({
                value: e.id,
                label: `${e.entrustmentNo} - ${e.sampleName || '未命名'}`,
              }))}
            />
          </Form.Item>

          {selectedEntrustment && (
            <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
              <Descriptions size="small" column={2}>
                <Descriptions.Item label="委托单号">{selectedEntrustment.entrustmentNo}</Descriptions.Item>
                <Descriptions.Item label="样品名称">{selectedEntrustment.sampleName || '-'}</Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="样品名称" name="name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="规格型号" name="specification">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="数量" name="quantity">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="单位" name="unit">
                <Select allowClear>
                  <Select.Option value="个">个</Select.Option>
                  <Select.Option value="件">件</Select.Option>
                  <Select.Option value="片">片</Select.Option>
                  <Select.Option value="根">根</Select.Option>
                  <Select.Option value="组">组</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="收样日期" name="receiptDate" rules={[{ required: true }]}>
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="存放位置" name="storageLocation">
            <Input placeholder="如：A区-1-02" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 标签预览 Modal */}
      <Modal
        title="样品标签生成"
        open={labelModalOpen}
        onCancel={() => setLabelModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setLabelModalOpen(false)}>关闭</Button>,
          <Button key="download" type="primary" icon={<DownloadOutlined />} onClick={handleDownloadLabel}>
            下载标签
          </Button>
        ]}
        width={400}
      >
        <div ref={labelRef} style={{ padding: 24, textAlign: 'center', background: '#fff' }}>
          <Barcode
            value={labelSample?.sampleNo || 'SAMPLE'}
            width={2}
            height={60}
            displayValue={true}
            fontSize={14}
          />
          <div style={{ marginTop: 12 }}>
            <div><strong>样品编号:</strong> {labelSample?.sampleNo}</div>
            <div><strong>样品名称:</strong> {labelSample?.name}</div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
