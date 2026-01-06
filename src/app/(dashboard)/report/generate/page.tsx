'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Modal, Form, Input, Select, message, Space, Card, Tag, Descriptions } from 'antd'
import { FileAddOutlined, EyeOutlined, PrinterOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface Task {
  id: string
  taskNo: string
  sampleName: string | null
  status: string
  progress: number
  conclusion: string | null
  sample?: { sampleNo: string; name: string }
  testItems: string[]
  assignedTo?: { name: string }
}

interface ReportTemplate {
  id: string
  name: string
  code: string
  category: string
  status: string
}

const statusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待开始', color: 'default' },
  in_progress: { text: '进行中', color: 'processing' },
  completed: { text: '已完成', color: 'success' },
}

const conclusionMap: Record<string, string> = {
  qualified: '合格',
  unqualified: '不合格',
  conditional: '条件合格',
}

export default function ReportGeneratePage() {
  const [data, setData] = useState<Task[]>([])
  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [generateModalOpen, setGenerateModalOpen] = useState(false)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [form] = Form.useForm()

  const fetchData = async (p = page) => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(p),
      pageSize: '10',
      status: 'completed',
    })
    try {
      const res = await fetch('/api/task/all?' + params)
      const json = await res.json()
      if (json.success && json.data) {
      setData(json.data.list || [])
      setTotal(json.data.total || 0)
    } else {
      setData(json.list || [])
      setTotal(json.total || 0)
    }
    } catch (error) {
      message.error('获取数据失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/report/template')
      const json = await res.json()
      setTemplates(json.list?.filter((t: ReportTemplate) => t.status === 'active') || [])
    } catch (error) {
      console.error('获取模板失败', error)
    }
  }

  useEffect(() => { fetchData() }, [page])
  useEffect(() => { fetchTemplates() }, [])

  const handleGenerate = (record: Task) => {
    setSelectedTask(record)
    form.resetFields()
    setSelectedTemplate(null)
    setGenerateModalOpen(true)
  }

  const handleGenerateSubmit = async () => {
    const values = await form.validateFields()
    try {
      const res = await fetch('/api/report/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: selectedTask?.id,
          templateId: values.templateId,
        }),
      })

      if (res.ok) {
        message.success('报告生成成功')
        setGenerateModalOpen(false)
      } else {
        message.error('报告生成失败')
      }
    } catch (error) {
      message.error('报告生成失败')
    }
  }

  const handlePreview = (record: Task) => {
    setSelectedTask(record)
    setPreviewModalOpen(true)
  }

  const handlePrint = (record: Task) => {
    message.info('打印功能开发中...')
  }

  const columns: ColumnsType<Task> = [
    { title: '任务编号', dataIndex: 'taskNo', width: 130 },
    { title: '样品名称', dataIndex: 'sampleName', width: 150 },
    {
      title: '样品编号',
      render: (_, r) => r.sample?.sampleNo || '-',
      width: 120,
    },
    {
      title: '检测项目',
      dataIndex: 'testItems',
      width: 200,
      render: (items: string[]) => items?.map((item, i) => (
        <Tag key={i} color="blue">{item}</Tag>
      )) || '-',
    },
    {
      title: '检测结论',
      dataIndex: 'conclusion',
      width: 100,
      render: (c) => c ? <Tag color={c === 'qualified' ? 'success' : c === 'unqualified' ? 'error' : 'warning'}>
        {conclusionMap[c] || c}
      </Tag> : '-',
    },
    {
      title: '执行人',
      render: (_, r) => r.assignedTo?.name || '-',
      width: 100,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag>,
    },
    {
      title: '操作',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<FileAddOutlined />}
            onClick={() => handleGenerate(record)}
          >
            生成报告
          </Button>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handlePreview(record)}
          >
            预览
          </Button>
          <Button
            size="small"
            icon={<PrinterOutlined />}
            onClick={() => handlePrint(record)}
          >
            打印
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div className="p-4">
      <div className="grid grid-cols-3 gap-4 mb-4">
        <Card>
          <div className="text-2xl font-bold">{data.length}</div>
          <div className="text-gray-500">已完成任务</div>
        </Card>
        <Card>
          <div className="text-2xl font-bold text-green-600">
            {data.filter((d) => d.conclusion === 'qualified').length}
          </div>
          <div className="text-gray-500">合格报告</div>
        </Card>
        <Card>
          <div className="text-2xl font-bold text-red-600">
            {data.filter((d) => d.conclusion === 'unqualified').length}
          </div>
          <div className="text-gray-500">不合格报告</div>
        </Card>
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
        title="生成检测报告"
        open={generateModalOpen}
        onCancel={() => setGenerateModalOpen(false)}
        onOk={handleGenerateSubmit}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="任务编号">
            <Input value={selectedTask?.taskNo} disabled />
          </Form.Item>
          <Form.Item label="样品名称">
            <Input value={selectedTask?.sampleName || selectedTask?.sample?.name} disabled />
          </Form.Item>
          <Form.Item
            label="报告模板"
            name="templateId"
            rules={[{ required: true, message: '请选择报告模板' }]}
          >
            <Select
              placeholder="请选择报告模板"
              options={templates.map((t) => ({
                value: t.id,
                label: `${t.code} - ${t.name}`,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="报告预览"
        open={previewModalOpen}
        onCancel={() => setPreviewModalOpen(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setPreviewModalOpen(false)}>
            关闭
          </Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />}>
            打印
          </Button>,
        ]}
      >
        {selectedTask && (
          <div className="p-4">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold">检测报告</h2>
              <p className="text-gray-500">报告编号: R{selectedTask.taskNo.slice(1)}</p>
            </div>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="任务编号">{selectedTask.taskNo}</Descriptions.Item>
              <Descriptions.Item label="样品名称">
                {selectedTask.sampleName || selectedTask.sample?.name}
              </Descriptions.Item>
              <Descriptions.Item label="样品编号">{selectedTask.sample?.sampleNo || '-'}</Descriptions.Item>
              <Descriptions.Item label="检测结论">
                {selectedTask.conclusion ? conclusionMap[selectedTask.conclusion] || selectedTask.conclusion : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="检测项目" span={2}>
                {selectedTask.testItems?.map((item, i) => (
                  <Tag key={i} color="blue">{item}</Tag>
                )) || '-'}
              </Descriptions.Item>
            </Descriptions>
            <div className="mt-4 p-4 border border-gray-200 rounded bg-gray-50 min-h-[200px]">
              <p className="text-gray-400 text-center">报告内容预览区域...</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
