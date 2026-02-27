'use client'

import { useState, useEffect } from "react"
import { showSuccess, showError } from '@/lib/confirm'
import { Table, Button, Tag, Modal, Form, Input, InputNumber, Select, DatePicker, Space, Card } from "antd"
import { TeamOutlined, HistoryOutlined, SearchOutlined } from "@ant-design/icons"
import { Tooltip } from "antd"
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
  entrustmentId: string | null
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
}

interface Assignee {
  id: string
  name: string
  source: string
}

const statusMap: Record<string, { text: string; color: string }> = {
  pending: { text: "待处理", color: "default" },
  received: { text: "已收样", color: "success" },
  allocated: { text: "已分配", color: "processing" },
  processing: { text: "处理中", color: "blue" },
  processed: { text: "已处理", color: "cyan" },
  testing: { text: "检测中", color: "blue" },
  completed: { text: "已完成", color: "default" },
  returned: { text: "已归还", color: "magenta" },
}

const requisitionStatusMap: Record<string, { text: string; color: string }> = {
  pending: { text: "待接收", color: "default" },
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

  // 分配弹窗
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [assignForm] = Form.useForm()
  const [assignees, setAssignees] = useState<Assignee[]>([])
  const [assignLoading, setAssignLoading] = useState(false)
  const [entrustmentInfo, setEntrustmentInfo] = useState<{ entrustmentNo: string | null; clientName: string | null }>({ entrustmentNo: null, clientName: null })

  // 分配记录弹窗
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
      showError("获取数据失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [page, keyword, statusFilter])

  // 计算可用量
  const getAvailableQty = (sample: Sample): string => {
    const total = parseInt(sample.totalQuantity || sample.quantity || '0') || 0
    const remaining = parseInt(sample.remainingQuantity || sample.quantity || '0') || total
    return String(remaining)
  }

  // 打开分配弹窗
  const handleAssign = async (record: Sample) => {
    setSelectedSample(record)
    assignForm.resetFields()
    setAssignLoading(true)
    setAssignModalOpen(true)

    try {
      const res = await fetch(`/api/sample/${record.id}/assignees`)
      const json = await res.json()
      setAssignees(json.assignees || [])
      setEntrustmentInfo({
        entrustmentNo: json.entrustmentNo,
        clientName: json.clientName,
      })
    } catch (e) {
      console.error(e)
      setAssignees([])
      setEntrustmentInfo({ entrustmentNo: null, clientName: null })
    } finally {
      setAssignLoading(false)
    }
  }

  // 提交分配（预约模式：不校验数量，接收时再检查）
  const handleAssignSubmit = async () => {
    const values = await assignForm.validateFields()

    if (!selectedSample) return

    // 获取被分配人姓名
    const assignee = assignees.find(a => a.id === values.assigneeId)
    const assigneeName = assignee?.name || values.assigneeId

    try {
      const res = await fetch('/api/sample/requisition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sampleId: selectedSample.id,
          quantity: String(values.quantity),
          purpose: values.purpose || `样品分配 - ${entrustmentInfo.entrustmentNo || ''}`,
          requisitionBy: assigneeName,
          expectedReturnDate: values.expectedReturnDate?.toISOString(),
        }),
      })
      if (res.ok) {
        showSuccess("分配成功")
        setAssignModalOpen(false)
        fetchData()
      } else {
        const err = await res.json()
        showError(err.error || "分配失败")
      }
    } catch (error) {
      showError("分配失败")
    }
  }

  // 查看分配记录
  const handleViewRecords = async (record: Sample) => {
    setSelectedSample(record)
    try {
      const res = await fetch(`/api/sample/requisition?sampleId=${record.id}&pageSize=100`)
      const json = await res.json()
      setRequisitionRecords(json.list || [])
      setRecordsModalOpen(true)
    } catch (e) {
      showError("获取记录失败")
    }
  }

  // 归还
  const handleReturn = async (record: Requisition) => {
    Modal.confirm({
      title: '确认归还',
      content: '确认归还该样品吗？',
      onOk: async () => {
        try {
          const res = await fetch('/api/sample/requisition', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: record.id }),
          })
          if (res.ok) {
            showSuccess('归还成功')
            const recordsRes = await fetch(`/api/sample/requisition?sampleId=${selectedSample?.id}&pageSize=100`)
            const json = await recordsRes.json()
            setRequisitionRecords(json.list || [])
            fetchData()
          } else {
            const err = await res.json()
            showError(err.error || '归还失败')
          }
        } catch (e) {
          showError('归还失败')
        }
      }
    })
  }

  const columns: ColumnsType<Sample> = [
    { title: "样品编号", dataIndex: "sampleNo", width: 160 },
    { title: "样品名称", dataIndex: "name", width: 180, ellipsis: true },
    { title: "规格型号", dataIndex: "specification", width: 150 },
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
      title: "状态",
      dataIndex: "status",
      width: 90,
      render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text || s}</Tag>
    },
    {
      title: "收样日期",
      dataIndex: "receiptDate",
      width: 120,
      render: (d) => d ? dayjs(d).format("YYYY-MM-DD") : "-",
    },
    { title: "收样人", dataIndex: "receiptPerson", width: 80 },
    {
      title: '操作',
      fixed: "right" as const,
      onCell: () => ({ style: { whiteSpace: 'nowrap' as const } }),
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' as const } }),
      render: (_, record) => (
        <Space size="small" style={{ whiteSpace: 'nowrap' }}>
          <Tooltip title={record.status === 'pending' ? '请先在「样品收样」中完成收样' : undefined}>
            <Button
              type="link"
              size="small"
              icon={<TeamOutlined />}
              disabled={record.status === 'pending'}
              onClick={() => handleAssign(record)}
            >
              分配
            </Button>
          </Tooltip>
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
    { title: "分配人员", dataIndex: "requisitionBy", width: 120, ellipsis: true },
    { title: "分配数量", dataIndex: "quantity", width: 80 },
    { title: "分配日期", dataIndex: "requisitionDate", width: 100, render: (d) => dayjs(d).format("YYYY-MM-DD") },
    { title: "预计归还", dataIndex: "expectedReturnDate", width: 100, render: (d) => d ? dayjs(d).format("YYYY-MM-DD") : "-" },
    {
      title: "状态",
      dataIndex: "status",
      width: 80,
      render: (s) => <Tag color={requisitionStatusMap[s]?.color}>{requisitionStatusMap[s]?.text || s}</Tag>
    },
    {
      title: "操作",
      width: 80,
      render: (_, record) => (
        record.status !== 'returned' && (
          <Button
            type="link"
            size="small"
            onClick={() => handleReturn(record)}
          >
            归还
          </Button>
        )
      )
    }
  ]

  return (
    <div className="p-4">
      <Card title="样品明细台账" bordered={false}>
        <div className="mb-4 flex justify-between items-center">
          <Space style={{ whiteSpace: 'nowrap' }}>
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
          scroll={{ x: 1200 }}
          pagination={{
            current: page,
            pageSize: 10,
            total,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
          }}
        />
      </Card>

      {/* 分配弹窗 */}
      <Modal
        title={
          <div>
            <div>样品分配</div>
            <div className="text-sm font-normal text-gray-500 mt-1">
              样品: <strong className="text-black">{selectedSample?.sampleNo} - {selectedSample?.name}</strong>
              <span className="ml-4">可用量: <strong className="text-blue-500">{selectedSample ? getAvailableQty(selectedSample) : 0}</strong></span>
            </div>
          </div>
        }
        open={assignModalOpen}
        onCancel={() => setAssignModalOpen(false)}
        onOk={handleAssignSubmit}
        okText="确认分配"
        width={500}
      >
        {/* 委托单信息 */}
        {entrustmentInfo.entrustmentNo && (
          <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6, padding: '8px 12px', marginBottom: 16, marginTop: 8 }}>
            <span style={{ color: '#52c41a', fontWeight: 500 }}>关联委托单: </span>
            <span>{entrustmentInfo.entrustmentNo}</span>
            {entrustmentInfo.clientName && (
              <span style={{ marginLeft: 12, color: '#666' }}>({entrustmentInfo.clientName})</span>
            )}
          </div>
        )}
        {!entrustmentInfo.entrustmentNo && !assignLoading && (
          <div style={{ background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 6, padding: '8px 12px', marginBottom: 16, marginTop: 8 }}>
            <span style={{ color: '#fa8c16' }}>该样品未关联委托单，请手动输入分配人员</span>
          </div>
        )}

        <Form form={assignForm} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item
            label="分配给"
            name="assigneeId"
            rules={[{ required: true, message: '请选择或输入分配人员' }]}
          >
            <Select
              showSearch
              placeholder={assignLoading ? "加载中..." : "选择检测人员"}
              loading={assignLoading}
              optionFilterProp="label"
              options={assignees.map(a => ({
                value: a.id,
                label: `${a.name}（${a.source}）`
              }))}
              notFoundContent={assignLoading ? "加载中..." : "该委托单暂无已分配人员"}
            />
          </Form.Item>
          <Form.Item
            label="分配数量"
            name="quantity"
            rules={[{ required: true, message: '请输入分配数量' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="请输入分配数量" />
          </Form.Item>
          <Form.Item label="预计归还日期" name="expectedReturnDate">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="备注" name="purpose">
            <Input.TextArea rows={2} placeholder="备注信息（可选）" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 分配记录 Modal */}
      <Modal
        title={`分配记录 - ${selectedSample?.sampleNo || ''}`}
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
          locale={{ emptyText: '暂无分配记录' }}
        />
      </Modal>
    </div>
  )
}
