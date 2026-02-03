'use client'

import { useState, useEffect, useRef } from "react"
import { showSuccess, showError } from '@/lib/confirm'
import { Table, Button, Space, Tag, Modal, Form, Input, Select, DatePicker, message, Card, Row, Col, Descriptions } from "antd"
import { PlusOutlined, BarcodeOutlined, DownloadOutlined, SearchOutlined } from "@ant-design/icons"
import { StatusTag } from '@/components/StatusTag'
import SampleTestItemTable, { SampleTestItemData } from '@/components/SampleTestItemTable'
import type { ColumnsType } from "antd/es/table"
import dayjs from 'dayjs'
import Barcode from 'react-barcode'
import { toPng } from 'html-to-image'
import { fetcher } from '@/lib/fetcher'

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

  // 样品检测项（新）
  const [sampleTestItems, setSampleTestItems] = useState<SampleTestItemData[]>([])
  const [loadingTestItems, setLoadingTestItems] = useState(false)
  const [locked, setLocked] = useState(false) // 是否锁定检测项表格

  // Label Modal
  const [labelModalOpen, setLabelModalOpen] = useState(false)
  const [labelSample, setLabelSample] = useState<Sample | null>(null)
  const [labelTestItems, setLabelTestItems] = useState<string[]>([])
  const labelRef = useRef<HTMLDivElement>(null)

  const fetchData = async (p = page) => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(p),
      pageSize: "10",
      ...(keyword && { keyword }),
    })
    const res = await fetcher(`/api/sample?${params}`)
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
      const res = await fetcher('/api/entrustment?pageSize=100')
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
    setSampleTestItems([]) // 清空样品检测项
    setLocked(false) // 解锁检测项表格
    setModalOpen(true)
  }

  const handleEntrustmentChange = async (entrustmentId: string) => {
    const ent = entrustments.find(e => e.id === entrustmentId)
    setSelectedEntrustment(ent || null)

    // 清空现有检测项
    setSampleTestItems([])

    if (!entrustmentId) {
      setLocked(false) // 清空委托单时解锁
      return
    }

    // 自动加载委托单的检测项
    try {
      setLoadingTestItems(true)
      const res = await fetcher(`/api/entrustment/${entrustmentId}/projects`)
      const json = await res.json()

      if (json.success && json.data) {
        setSampleTestItems(json.data)
        setLocked(true) // 加载成功后锁定
      } else {
        showError('加载检测项失败')
        setLocked(false)
      }
    } catch (error) {
      showError('加载检测项失败')
      setLocked(false)
    } finally {
      setLoadingTestItems(false)
    }
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    const data = {
      ...values,
      entrustmentId: selectedEntrustment?.id || null,
      receiptDate: values.receiptDate?.toISOString(),
      testItems: sampleTestItems,
    }
    const res = await fetcher("/api/sample", {
      method: "POST",
      body: JSON.stringify(data)
    })
    const json = await res.json()

    // 后端现在返回创建的样品数组
    const createdSamples = Array.isArray(json) ? json : [json]
    const count = createdSamples.length

    showSuccess(`成功登记 ${count} 个样品`)
    setModalOpen(false)
    fetchData()
  }

  const handleShowLabel = async (record: Sample) => {
    setLabelSample(record)
    setLabelModalOpen(true)

    // 查询检测项目
    try {
      const res = await fetcher(`/api/sample-test-item?bizType=sample_receipt&bizId=${record.id}`)
      const json = await res.json()
      if (json.success && json.data) {
        const testItems = json.data.map((item: any) => item.testItemName)
        setLabelTestItems(testItems)
      } else {
        setLabelTestItems([])
      }
    } catch (e) {
      setLabelTestItems([])
    }
  }

  const handleDownloadLabel = async () => {
    if (labelRef.current) {
      try {
        const dataUrl = await toPng(labelRef.current, { backgroundColor: '#fff' })
        const link = document.createElement('a')
        link.download = `label_${labelSample?.sampleNo || 'sample'}.png`
        link.href = dataUrl
        link.click()
        showSuccess('标签下载成功')
      } catch (e) {
        showError('下载失败')
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
      title: '操作', fixed: 'right',

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
              loading={loadingTestItems}
              options={entrustments.map(e => ({
                value: e.id,
                label: `${e.entrustmentNo}${e.client ? ' - ' + e.client.name : ''}`,
              }))}
            />
          </Form.Item>

          {selectedEntrustment && (
            <Card size="small" style={{ marginBottom: 16, background: '#e6f7ff' }}>
              <Descriptions size="small" column={1}>
                <Descriptions.Item label="委托单号">{selectedEntrustment.entrustmentNo}</Descriptions.Item>
                <Descriptions.Item label="客户名称">{selectedEntrustment.client?.name || '-'}</Descriptions.Item>
                <Descriptions.Item label="检测项">
                  {loadingTestItems ? (
                    <Tag color="processing">加载中...</Tag>
                  ) : sampleTestItems.length > 0 ? (
                    <Tag color="blue">{sampleTestItems.length} 个检测项已自动加载</Tag>
                  ) : (
                    <Tag color="default">暂无检测项</Tag>
                  )}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          <Form.Item label="收样日期" name="receiptDate" rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="存放位置" name="storageLocation">
            <Input placeholder="如：A区-1-02" />
          </Form.Item>

          {/* 样品检测项表格 */}
          <div style={{ marginTop: 16 }}>
            {locked && (
              <div style={{ marginBottom: 8, color: '#ff4d4f', fontSize: 12 }}>
                <Tag color="warning">已锁定</Tag> 检测项从委托单自动加载，不可编辑
              </div>
            )}
            <SampleTestItemTable
              bizType="sample_receipt"
              value={sampleTestItems}
              onChange={setSampleTestItems}
              readonly={locked}
            />
          </div>
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
        <div ref={labelRef} style={{ padding: 24, textAlign: 'center', background: '#fff', minHeight: 200 }}>
          <Barcode
            value={labelSample?.sampleNo || 'SAMPLE'}
            width={2}
            height={60}
            displayValue={true}
            fontSize={14}
          />
          <div style={{ marginTop: 12, fontSize: 12, textAlign: 'left', width: '100%', paddingLeft: 10, paddingRight: 10 }}>
            {/* 检测项目多行显示 */}
            {labelTestItems.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 12 }}>
                  检测项目:
                </div>
                {labelTestItems.map((item, index) => (
                  <div key={index} style={{
                    fontSize: 11,
                    lineHeight: 1.4,
                    paddingLeft: 8
                  }}>
                    {index + 1}. {item}
                  </div>
                ))}
              </div>
            )}

            <div><strong>样品名称:</strong> {labelSample?.name}</div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
