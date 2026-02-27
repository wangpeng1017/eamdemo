'use client'

import { useState, useEffect } from "react"
import { showSuccess, showError } from '@/lib/confirm'
import { Table, Button, Tag, Modal, Form, Input, DatePicker, Select, Card, Statistic, Space, Drawer, Descriptions, Popconfirm, InputNumber, Row, Col, Divider } from "antd"
import { ClockCircleOutlined, ExclamationCircleOutlined, EyeOutlined, DeleteOutlined, ToolOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons"
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
    id: string
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

interface ProcessingRecord {
  id: string
  processNo: string
  sampleId: string
  processorName: string
  processType: string
  description: string | null
  sentDate: string
  expectedReturnDate: string | null
  actualReturnDate: string | null
  result: string | null
  quantity: string | null
  cost: number | null
  remark: string | null
  status: string
  createdAt: string
  sample: {
    id: string
    sampleNo: string
    name: string
    specification: string | null
    entrustment?: { entrustmentNo: string }
  }
  createdBy?: { name: string }
}

const statusMap: Record<string, { text: string; color: string }> = {
  pending: { text: "待接收", color: "warning" },
  requisitioned: { text: "使用中", color: "processing" },
  returned: { text: "已归还", color: "success" },
  overdue: { text: "逾期未还", color: "error" },
}

const processStatusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待加工', color: 'default' },
  processing: { text: '加工中', color: 'processing' },
  completed: { text: '已完成', color: 'success' },
  cancelled: { text: '已取消', color: 'error' },
}

const resultMap: Record<string, { text: string; color: string }> = {
  qualified: { text: '合格', color: 'success' },
  unqualified: { text: '不合格', color: 'error' },
  partial: { text: '部分合格', color: 'warning' },
}

export default function MySamplesPage() {
  const [data, setData] = useState<RequisitionRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [stats, setStats] = useState({ pending: 0, requisitioned: 0, returned: 0, overdue: 0 })

  // 归还弹窗
  const [returnModalOpen, setReturnModalOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<RequisitionRecord | null>(null)
  const [returnForm] = Form.useForm()

  // 查看 Drawer
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false)
  const [currentRecord, setCurrentRecord] = useState<RequisitionRecord | null>(null)

  // 送出加工弹窗
  const [processModalOpen, setProcessModalOpen] = useState(false)
  const [processingSample, setProcessingSample] = useState<RequisitionRecord | null>(null)
  const [processForm] = Form.useForm()

  // 加工记录
  const [processingData, setProcessingData] = useState<ProcessingRecord[]>([])
  const [processingLoading, setProcessingLoading] = useState(false)
  const [processingTotal, setProcessingTotal] = useState(0)
  const [processingPage, setProcessingPage] = useState(1)

  // 加工记录操作
  const [completeModalOpen, setCompleteModalOpen] = useState(false)
  const [currentProcessing, setCurrentProcessing] = useState<ProcessingRecord | null>(null)
  const [completeForm] = Form.useForm()
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  // 查看分配详情
  const handleView = (record: RequisitionRecord) => {
    setCurrentRecord(record)
    setViewDrawerOpen(true)
  }

  // 删除分配记录
  const handleDeleteRequisition = async (id: string) => {
    try {
      const res = await fetch(`/api/sample/requisition/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess('删除成功，库存已恢复')
        fetchData()
      } else {
        showError(json.error || '删除失败')
      }
    } catch {
      showError('删除失败')
    }
  }

  // 接收样品（互斥检查：同一样品同时只能一人持有）
  const handleAccept = async (record: RequisitionRecord) => {
    Modal.confirm({
      title: '确认接收',
      content: `确认接收样品 ${record.sampleNo} - ${record.name}？接收后其他被分配人将无法接收，直到您归还。`,
      okText: '确认接收',
      onOk: async () => {
        try {
          const res = await fetch('/api/sample/requisition', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: record.id }),
          })
          if (res.ok) {
            showSuccess('接收成功')
            fetchData()
          } else {
            const err = await res.json()
            showError(err.error || '接收失败')
          }
        } catch {
          showError('接收失败')
        }
      }
    })
  }

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
      const list = (json.list || []).map((item: any) => ({
        ...item,
        sampleId: item.sampleId || item.sample?.id || '',
        sampleNo: item.sample?.sampleNo || '',
        name: item.sample?.name || '',
        specification: item.sample?.specification || '',
        unit: item.sample?.unit || '',
      }))
      setData(list)
      setTotal(json.total || 0)
      // 统计
      const allRes = await fetch('/api/sample/requisition?pageSize=1000')
      const allJson = await allRes.json()
      const allList = allJson.list || []
      setStats({
        pending: allList.filter((r: any) => r.status === 'pending').length,
        requisitioned: allList.filter((r: any) => r.status === 'requisitioned').length,
        returned: allList.filter((r: any) => r.status === 'returned').length,
        overdue: allList.filter((r: any) => r.status === 'overdue').length,
      })
    } catch (error) {
      showError("获取数据失败")
    } finally {
      setLoading(false)
    }
  }

  // 加载加工记录
  const fetchProcessingData = async (p = processingPage) => {
    setProcessingLoading(true)
    try {
      const res = await fetch(`/api/sample-processing?page=${p}&pageSize=10`)
      const json = await res.json()
      if (json.success && json.data) {
        setProcessingData(json.data.list || [])
        setProcessingTotal(json.data.total || 0)
      }
    } catch {
      // 静默失败
    }
    setProcessingLoading(false)
  }

  useEffect(() => { fetchData() }, [page, statusFilter])
  useEffect(() => { fetchProcessingData() }, [processingPage])

  // -- 归还 --
  const handleReturn = (record: RequisitionRecord) => {
    setSelectedRecord(record)
    returnForm.setFieldsValue({ returnDate: dayjs() })
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
        showSuccess("归还成功")
        setReturnModalOpen(false)
        fetchData()
      } else {
        showError("归还失败")
      }
    } catch (error) {
      showError("归还失败")
    }
  }

  // -- 送出加工 --
  const handleSendProcess = (record: RequisitionRecord) => {
    setProcessingSample(record)
    processForm.resetFields()
    processForm.setFieldsValue({ sentDate: dayjs() })
    setProcessModalOpen(true)
  }

  const handleProcessSubmit = async () => {
    if (!processingSample) return
    try {
      const values = await processForm.validateFields()
      const sampleId = processingSample.sampleId || processingSample.sample?.id
      if (!sampleId) {
        showError('样品信息异常')
        return
      }
      const res = await fetch('/api/sample-processing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sampleId,
          processorName: values.processorName,
          processType: values.processType,
          description: values.description,
          sentDate: values.sentDate?.format('YYYY-MM-DD'),
          expectedReturnDate: values.expectedReturnDate?.format('YYYY-MM-DD'),
          quantity: values.quantity,
          cost: values.cost,
          remark: values.remark,
        })
      })
      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess('已送出加工')
        setProcessModalOpen(false)
        fetchProcessingData() // 刷新加工记录
      } else {
        showError(json.error?.message || '操作失败')
      }
    } catch (e) {
      console.error(e)
    }
  }

  // -- 加工记录操作 --
  const handleProcessComplete = (record: ProcessingRecord) => {
    setCurrentProcessing(record)
    completeForm.resetFields()
    completeForm.setFieldsValue({ actualReturnDate: dayjs(), result: 'qualified' })
    setCompleteModalOpen(true)
  }

  const handleCompleteSubmit = async () => {
    if (!currentProcessing) return
    try {
      const values = await completeForm.validateFields()
      const res = await fetch(`/api/sample-processing/${currentProcessing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          actualReturnDate: values.actualReturnDate?.format('YYYY-MM-DD'),
          result: values.result,
        })
      })
      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess('加工完成')
        setCompleteModalOpen(false)
        fetchProcessingData()
      } else {
        showError(json.error?.message || '操作失败')
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleProcessCancel = async (id: string) => {
    try {
      const res = await fetch(`/api/sample-processing/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' })
      })
      const json = await res.json()
      if (res.ok && json.success) {
        showSuccess('已取消')
        fetchProcessingData()
      } else {
        showError(json.error?.message || '操作失败')
      }
    } catch {
      showError('操作失败')
    }
  }

  const handleProcessView = (record: ProcessingRecord) => {
    setCurrentProcessing(record)
    setDetailModalOpen(true)
  }

  // ============ 列定义 ============

  const columns: ColumnsType<RequisitionRecord> = [
    { title: "样品编号", dataIndex: "sampleNo", width: 150 },
    { title: "样品名称", dataIndex: "name", width: 150 },
    { title: "分配数量", dataIndex: "quantity", width: 100 },
    { title: "用途", dataIndex: "purpose", width: 150, ellipsis: true },
    {
      title: "分配日期",
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
      title: '操作', fixed: 'right', width: 260,
      render: (_, record) => (
        <Space size="small" style={{ whiteSpace: 'nowrap' }}>
          {/* 接收 */}
          {record.status === 'pending' && (
            <Button type="primary" size="small" onClick={() => handleAccept(record)}>
              接收
            </Button>
          )}
          {/* 归还 */}
          {(record.status === 'requisitioned' || record.status === 'overdue') && (
            <Button type="primary" ghost size="small" onClick={() => handleReturn(record)}>
              归还
            </Button>
          )}
          {/* 送出加工 */}
          {record.status === 'requisitioned' && (
            <Button size="small" icon={<ToolOutlined />} onClick={() => handleSendProcess(record)}>
              送出加工
            </Button>
          )}
          {/* 查看/删除 */}
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record)} />
          {(record.status === 'requisitioned' || record.status === 'pending') && (
            <Popconfirm title="确认删除该记录？删除后库存将自动恢复。" onConfirm={() => handleDeleteRequisition(record.id)} okText="确定" cancelText="取消" okButtonProps={{ danger: true }}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  const processingColumns: ColumnsType<ProcessingRecord> = [
    { title: '加工单号', dataIndex: 'processNo', width: 160 },
    {
      title: '样品', width: 150,
      render: (_, r) => (
        <div>
          <div>{r.sample?.name || '-'}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{r.sample?.sampleNo}</div>
        </div>
      )
    },
    { title: '加工商', dataIndex: 'processorName', width: 150, ellipsis: true },
    { title: '加工类型', dataIndex: 'processType', width: 90 },
    {
      title: '送出日期', dataIndex: 'sentDate', width: 110,
      render: (d: string) => d ? dayjs(d).format('YYYY-MM-DD') : '-'
    },
    {
      title: '预计回样', dataIndex: 'expectedReturnDate', width: 110,
      render: (d: string) => {
        if (!d) return '-'
        const date = dayjs(d)
        const isOverdue = date.isBefore(dayjs(), 'day')
        return <span style={{ color: isOverdue ? '#f5222d' : undefined, fontWeight: isOverdue ? 'bold' : 'normal' }}>{date.format('YYYY-MM-DD')}</span>
      }
    },
    {
      title: '实际回样', dataIndex: 'actualReturnDate', width: 110,
      render: (d: string) => d ? dayjs(d).format('YYYY-MM-DD') : '-'
    },
    {
      title: '加工结果', dataIndex: 'result', width: 90,
      render: (r: string) => r ? <Tag color={resultMap[r]?.color}>{resultMap[r]?.text || r}</Tag> : '-'
    },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: (s: string) => <Tag color={processStatusMap[s]?.color}>{processStatusMap[s]?.text || s}</Tag>
    },
    {
      title: '操作', fixed: 'right', width: 180,
      render: (_, record) => (
        <Space size="small" style={{ whiteSpace: 'nowrap' }}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleProcessView(record)} />
          {record.status === 'processing' && (
            <>
              <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleProcessComplete(record)}>
                记录回样
              </Button>
              <Popconfirm title="确认取消加工？" onConfirm={() => handleProcessCancel(record.id)} okText="确定" cancelText="取消">
                <Button size="small" danger icon={<CloseCircleOutlined />} />
              </Popconfirm>
            </>
          )}
        </Space>
      )
    }
  ]

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold m-0">我的样品</h2>
        <div />
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        <Card>
          <Statistic
            title="待接收"
            value={stats.pending}
            prefix={<ClockCircleOutlined />}
            valueStyle={{ color: "#faad14" }}
          />
        </Card>
        <Card>
          <Statistic
            title="使用中"
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
          <Select.Option value="pending">待接收</Select.Option>
          <Select.Option value="requisitioned">使用中</Select.Option>
          <Select.Option value="returned">已归还</Select.Option>
          <Select.Option value="overdue">逾期未还</Select.Option>
        </Select>
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
          showTotal: (t) => `共 ${t} 条`,
        }}
      />

      {/* ============ 我的加工记录 ============ */}
      <Divider />
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold m-0">我的加工记录</h2>
      </div>

      <Table
        columns={processingColumns}
        dataSource={processingData}
        rowKey="id"
        loading={processingLoading}
        scroll={{ x: 1400 }}
        pagination={{
          current: processingPage,
          pageSize: 10,
          total: processingTotal,
          onChange: (p) => setProcessingPage(p),
          showTotal: (t) => `共 ${t} 条`,
        }}
      />

      {/* ============ 弹窗区 ============ */}

      {/* 查看分配详情 */}
      <Drawer
        title="分配详情"
        placement="right"
        width={600}
        open={viewDrawerOpen}
        onClose={() => setViewDrawerOpen(false)}
      >
        {currentRecord && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="分配单号" span={2}>{(currentRecord as any).requisitionNo || '-'}</Descriptions.Item>
            <Descriptions.Item label="样品编号">{currentRecord.sampleNo}</Descriptions.Item>
            <Descriptions.Item label="样品名称">{currentRecord.name}</Descriptions.Item>
            <Descriptions.Item label="规格型号">{currentRecord.specification || '-'}</Descriptions.Item>
            <Descriptions.Item label="分配数量">{currentRecord.quantity} {currentRecord.unit || ''}</Descriptions.Item>
            <Descriptions.Item label="用途" span={2}>{currentRecord.purpose || '-'}</Descriptions.Item>
            <Descriptions.Item label="分配日期">{dayjs(currentRecord.requisitionDate).format('YYYY-MM-DD')}</Descriptions.Item>
            <Descriptions.Item label="预计归还">{currentRecord.expectedReturnDate ? dayjs(currentRecord.expectedReturnDate).format('YYYY-MM-DD') : '-'}</Descriptions.Item>
            <Descriptions.Item label="实际归还">{currentRecord.actualReturnDate ? dayjs(currentRecord.actualReturnDate).format('YYYY-MM-DD') : '-'}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusMap[currentRecord.status]?.color}>
                {statusMap[currentRecord.status]?.text || currentRecord.status}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>

      {/* 归还弹窗 */}
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
          <Form.Item label="归还日期" name="returnDate" rules={[{ required: true, message: '此项为必填' }]}>
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="备注" name="returnRemark">
            <Input.TextArea rows={3} placeholder="归还备注（可选）" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 送出加工弹窗 */}
      <Modal
        title="送出加工"
        open={processModalOpen}
        onOk={handleProcessSubmit}
        onCancel={() => setProcessModalOpen(false)}
        width={550}
      >
        {processingSample && (
          <div style={{ marginBottom: 16, padding: 12, background: '#e6f7ff', borderRadius: 6 }}>
            <div><strong>样品编号：</strong>{processingSample.sampleNo}</div>
            <div><strong>样品名称：</strong>{processingSample.name}</div>
          </div>
        )}
        <Form form={processForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="processorName" label="加工商" rules={[{ required: true, message: '请输入加工商' }]}>
                <Input placeholder="加工商名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="processType" label="加工类型" rules={[{ required: true, message: '请输入加工类型' }]}>
                <Input placeholder="如：切割、研磨、镶嵌等" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="加工描述">
            <Input.TextArea rows={2} placeholder="加工内容描述" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="sentDate" label="送出日期" rules={[{ required: true, message: '请选择日期' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="expectedReturnDate" label="预计回样日期">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="quantity" label="加工数量" rules={[{ required: true, message: '请输入加工数量' }]}>
                <Input placeholder="如：5件" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="cost" label="加工费用（元）">
                <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="0.00" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="remark" label="备注">
            <Input placeholder="备注信息" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 记录回样弹窗 */}
      <Modal
        title="记录加工回样"
        open={completeModalOpen}
        onOk={handleCompleteSubmit}
        onCancel={() => setCompleteModalOpen(false)}
        width={500}
      >
        {currentProcessing && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f6ffed', borderRadius: 6 }}>
            <div><strong>加工单号：</strong>{currentProcessing.processNo}</div>
            <div><strong>样品：</strong>{currentProcessing.sample?.name}（{currentProcessing.sample?.sampleNo}）</div>
            <div><strong>加工商：</strong>{currentProcessing.processorName}</div>
          </div>
        )}
        <Form form={completeForm} layout="vertical">
          <Form.Item name="actualReturnDate" label="实际回样日期" rules={[{ required: true, message: '请选择日期' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="result" label="加工结果" rules={[{ required: true, message: '请选择结果' }]}>
            <Select options={[
              { value: 'qualified', label: '合格' },
              { value: 'unqualified', label: '不合格' },
              { value: 'partial', label: '部分合格' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 加工记录详情 */}
      <Modal
        title="加工记录详情"
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={null}
        width={600}
      >
        {currentProcessing && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="加工单号">{currentProcessing.processNo}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={processStatusMap[currentProcessing.status]?.color}>{processStatusMap[currentProcessing.status]?.text}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="样品名称">{currentProcessing.sample?.name}</Descriptions.Item>
            <Descriptions.Item label="样品编号">{currentProcessing.sample?.sampleNo}</Descriptions.Item>
            <Descriptions.Item label="加工商">{currentProcessing.processorName}</Descriptions.Item>
            <Descriptions.Item label="加工类型">{currentProcessing.processType}</Descriptions.Item>
            <Descriptions.Item label="加工描述" span={2}>{currentProcessing.description || '-'}</Descriptions.Item>
            <Descriptions.Item label="送出日期">{dayjs(currentProcessing.sentDate).format('YYYY-MM-DD')}</Descriptions.Item>
            <Descriptions.Item label="预计回样">{currentProcessing.expectedReturnDate ? dayjs(currentProcessing.expectedReturnDate).format('YYYY-MM-DD') : '-'}</Descriptions.Item>
            <Descriptions.Item label="实际回样">{currentProcessing.actualReturnDate ? dayjs(currentProcessing.actualReturnDate).format('YYYY-MM-DD') : '-'}</Descriptions.Item>
            <Descriptions.Item label="加工结果">
              {currentProcessing.result ? <Tag color={resultMap[currentProcessing.result]?.color}>{resultMap[currentProcessing.result]?.text}</Tag> : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="加工数量">{currentProcessing.quantity || '-'}</Descriptions.Item>
            <Descriptions.Item label="加工费用">{currentProcessing.cost ? `¥${currentProcessing.cost}` : '-'}</Descriptions.Item>
            <Descriptions.Item label="备注" span={2}>{currentProcessing.remark || '-'}</Descriptions.Item>
            <Descriptions.Item label="操作人">{currentProcessing.createdBy?.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{dayjs(currentProcessing.createdAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}
