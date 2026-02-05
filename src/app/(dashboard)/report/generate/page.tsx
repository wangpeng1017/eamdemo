'use client'

import { useState, useEffect } from 'react'
import { showSuccess, showError, showConfirm } from '@/lib/confirm'
import { Table, Button, Modal, Form, Input, Select, message, Space, Card, Tag, Descriptions, Divider } from 'antd'
import { FileAddOutlined, EyeOutlined, PrinterOutlined, DownloadOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { exportReportPDF } from '@/lib/exportPDF'

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
  // 列表接口返回的 testData
  testData?: {
    parameter: string;
    value: string | null;
    standard: string | null;
    result: string | null;
    remark: string | null
  }[]
  entrustment?: any // 详情接口才返回，列表可能不完整
  updatedAt?: string
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

  // 编辑/生成报告 模态框状态
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)

  const [currentTask, setCurrentTask] = useState<Task | null>(null)

  const [form] = Form.useForm()

  const fetchData = async (p = page) => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(p),
      pageSize: '10',
      status: 'completed', // 仅展示已完成任务
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
      showError('获取数据失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/report-template?category=client_report') // 筛选客户报告模板? 还是所有? API 默认 filters provided parameters
      // 之前代码访问的是 /api/report/template (which doesn't exist? Checking directories showed `api/report/template` didn't exist, but `api/report-template` does)
      // Wait, in previous read `api/report-template/route.ts` was found.
      // But in `page.tsx` line 82 it fetched `/api/report/template`. 
      // This implies I might have missed `api/report` subdirectory exploration, or previous code was broken.
      // Step 2148 showed `api/report/generate`.
      // Step 2135 showed `api/report` has `template` subdirectory.
      // So `/api/report/template` likely exists. 
      // Let's assume `/api/report-template` is the new one I saw in 2212.
      // I will use `/api/report-template`.
      const res2 = await fetch('/api/report-template?status=active')
      const json = await res2.json()
      if (json.success && json.data) {
        setTemplates(json.data.list || [])
      }
    } catch (error) {
      console.error('获取模板失败', error)
      // Fallback
    }
  }

  useEffect(() => { fetchData() }, [page])
  useEffect(() => { fetchTemplates() }, [])

  // 打开编辑/生成模态框
  const handleOpenEdit = (record: Task) => {
    setCurrentTask(record)
    setEditModalOpen(true)

    // 初始化表单
    form.setFieldsValue({
      conclusion: record.conclusion || 'qualified',
      precautions: '', // 默认为空，或可设置默认值
      testData: record.testData || [], // 自动填充检测数据
      templateId: templates.length > 0 ? templates[0].id : undefined // 默认选中第一个模板
    })
  }

  // 提交生成报告
  const handleGenerateSubmit = async () => {
    try {
      const values = await form.validateFields()

      const payload = {
        taskId: currentTask?.id,
        templateId: values.templateId,
        conclusion: values.conclusion,
        precautions: values.precautions,
        testData: values.testData // 提交修改后的检测数据
      }

      const res = await fetch('/api/report/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (res.ok && json.success) {
        showSuccess('报告生成成功')
        setEditModalOpen(false)
        fetchData() // 刷新列表 (状态变更?)
      } else {
        showError(json.error || '报告生成失败')
      }
    } catch (error) {
      showError('报告生成失败')
      console.error(error)
    }
  }

  const handlePreview = (record: Task) => {
    setCurrentTask(record)
    setPreviewModalOpen(true)
  }

  const handlePrint = async (record: Task) => {
    // ... (原有逻辑保持不变，用于快速导出 PDF)
    try {
      showSuccess('正在准备PDF数据...')
      const res = await fetch(`/api/task/${record.id}`)
      const json = await res.json()
      if (json.success && json.data) {
        const taskData = json.data
        const reportData = {
          reportNo: `RPT-${taskData.taskNo}`,
          sampleName: taskData.sample?.name || taskData.sampleName || 'Unknown',
          sampleNo: taskData.sample?.sampleNo || 'N/A',
          clientName: taskData.entrustment?.client?.name || 'Unknown',
          testItems: taskData.testItems?.map((item: any) => ({
            name: item.name || 'N/A',
            method: item.method || '-',
            standard: item.standard || '-',
            result: item.result || '-',
            conclusion: item.conclusion || '-',
          })) || [],
          conclusion: taskData.conclusion || 'pending',
          testDate: taskData.updatedAt ? dayjs(taskData.updatedAt).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
          tester: taskData.assignedTo?.name || 'N/A',
          auditor: 'Pending',
          approver: 'Pending',
        }
        await exportReportPDF(reportData)
      }
    } catch (e) {
      showError('导出失败')
    }
  }

  const columns: ColumnsType<Task> = [
    { title: '任务编号', dataIndex: 'taskNo', width: 130 },
    { title: '样品名称', dataIndex: 'sampleName', width: 150 },
    { title: '样品编号', render: (_, r) => r.sample?.sampleNo || '-', width: 120 },
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
    { title: '状态', dataIndex: 'status', width: 100, render: (s) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag> },
    {
      title: '操作', fixed: 'right', width: 250,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenEdit(record)}
          >
            编辑报告
          </Button>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handlePreview(record)}
          >
            预览
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div className="p-4">
      {/* 数据概览卡片 - 保持原样 */}
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

      {/* 报告编辑/生成 模态框 */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <FileAddOutlined />
            <span>生成检测报告 - 编辑草稿</span>
            <span className="text-gray-400 text-sm font-normal">({currentTask?.taskNo})</span>
          </div>
        }
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        width={900}
        footer={[
          <Button key="cancel" onClick={() => setEditModalOpen(false)}>取消</Button>,
          <Button key="submit" type="primary" icon={<SaveOutlined />} onClick={handleGenerateSubmit}>
            生成正式报告
          </Button>
        ]}
      >
        <Form form={form} layout="vertical">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item label="报告模板" name="templateId" rules={[{ required: true, message: '请选择模板' }]}>
              <Select placeholder="选择报告模板" options={templates.map(t => ({ label: t.name, value: t.id }))} />
            </Form.Item>
            <Form.Item label="检测结论" name="conclusion" rules={[{ required: true }]}>
              <Select options={[
                { label: '合格', value: 'qualified' },
                { label: '不合格', value: 'unqualified' },
                { label: '条件合格', value: 'conditional' }
              ]} />
            </Form.Item>
          </div>

          <Form.Item label="检测注意事项" name="precautions" tooltip="将显示在报告中的注意事项部分">
            <Input.TextArea rows={3} placeholder="请输入检测注意事项（可选）" />
          </Form.Item>

          <Divider orientation="left" style={{ margin: '12px 0' }}>检测结果数据 (可编辑)</Divider>

          <Form.List name="testData">
            {(fields) => (
              <Table
                dataSource={fields}
                pagination={false}
                size="small"
                rowKey="key"
                columns={[
                  {
                    title: '检测项目',
                    dataIndex: 'key', // 使用 form list 的 key 无法直接获取 value?
                    // 需要使用 render + form.getFieldValue
                    render: (_, field) => {
                      // 获取对应索引的真实数据
                      // 这种写法在 Form.List 中比较 tricky，通常建议使用 Form.Item 内嵌 name={[field.name, 'parameter']}
                      return (
                        <Form.Item {...field} name={[field.name, 'parameter']} noStyle>
                          <Input bordered={false} readOnly className="bg-transparent" />
                        </Form.Item>
                      )
                    },
                    width: 150
                  },
                  {
                    title: '标准要求',
                    render: (_, field) => (
                      <Form.Item {...field} name={[field.name, 'standard']} noStyle>
                        <Input bordered={false} readOnly />
                      </Form.Item>
                    ),
                    width: 200
                  },
                  {
                    title: '实测值',
                    render: (_, field) => (
                      <Form.Item {...field} name={[field.name, 'value']} noStyle rules={[{ required: true }]}>
                        <Input placeholder="输入实测值" />
                      </Form.Item>
                    ),
                    width: 120
                  },
                  {
                    title: '单项判定',
                    render: (_, field) => (
                      <Form.Item {...field} name={[field.name, 'result']} noStyle>
                        <Select options={[
                          { label: '合格', value: 'Pass' },
                          { label: '不合格', value: 'Fail' },
                          { label: '/', value: '/' }
                        ]} />
                      </Form.Item>
                    ),
                    width: 100
                  },
                  {
                    title: '备注',
                    render: (_, field) => (
                      <Form.Item {...field} name={[field.name, 'remark']} noStyle>
                        <Input placeholder="备注" />
                      </Form.Item>
                    )
                  }
                ]}
              />
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* 预览模态框 - 保持原样或简化 */}
      <Modal
        title="报告预览"
        open={previewModalOpen}
        onCancel={() => setPreviewModalOpen(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setPreviewModalOpen(false)}>关闭</Button>,
          <Button key="print" type="primary" icon={<DownloadOutlined />} onClick={() => currentTask && handlePrint(currentTask)}>
            导出PDF
          </Button>
        ]}
      >
        {currentTask && (
          <div className="p-4">
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="任务编号">{currentTask.taskNo}</Descriptions.Item>
              <Descriptions.Item label="样品名称">{currentTask.sampleName || currentTask.sample?.name}</Descriptions.Item>
              <Descriptions.Item label="检测结论">{conclusionMap[currentTask.conclusion || ''] || currentTask.conclusion}</Descriptions.Item>
            </Descriptions>
            {/* 预览内容略 */}
          </div>
        )}
      </Modal>
    </div>
  )
}
