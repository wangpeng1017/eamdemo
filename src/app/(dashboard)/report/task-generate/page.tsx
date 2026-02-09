'use client'

import { useState, useEffect } from 'react'
import { showSuccess, showError } from '@/lib/confirm'
import { Table, Button, Space, Tag, Modal, Select, Card, Statistic, Row, Col, Drawer, Descriptions, Tabs, Timeline, Form, Input, Popconfirm } from 'antd'
import { PlusOutlined, EyeOutlined, EditOutlined, PrinterOutlined, SendOutlined, FileTextOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useRouter } from 'next/navigation'

interface TestReport {
  id: string
  reportNo: string
  sampleName: string | null
  sampleNo: string | null
  clientName: string | null
  specification: string | null
  sampleQuantity: string | null
  receivedDate: string | null
  testResults: string | null
  overallConclusion: string | null
  status: string
  tester: string | null
  reviewer: string | null
  createdAt: string
  issuedDate: string | null
  task?: { taskNo: string } | null
}

interface Approval {
  id: string
  reviewType: string
  reviewer: string
  result: string
  comments: string | null
  reviewDate: string
}

interface Task {
  id: string
  taskNo: string
  sampleName: string | null
  status: string
}

const statusMap: Record<string, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'default' },
  reviewing: { text: '审核中', color: 'processing' },
  approved: { text: '已批准', color: 'success' },
  issued: { text: '已发布', color: 'cyan' },
}

const reviewTypeMap: Record<string, string> = {
  submit: '提交审核',
  review: '审核',
  approve: '批准',
  issue: '发布',
  reject: '驳回',
}

export default function TestReportPage() {
  const router = useRouter()
  const [data, setData] = useState<TestReport[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [generateModalOpen, setGenerateModalOpen] = useState(false)
  const [completedTasks, setCompletedTasks] = useState<Task[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  // 查看抽屉
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false)
  const [currentReport, setCurrentReport] = useState<TestReport | null>(null)
  const [currentApprovals, setCurrentApprovals] = useState<Approval[]>([])
  const [currentTestData, setCurrentTestData] = useState<any[]>([])

  // 提交审批弹窗
  const [submitModalOpen, setSubmitModalOpen] = useState(false)
  const [submitReportId, setSubmitReportId] = useState<string | null>(null)
  const [submitForm] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  const fetchData = async (p = page) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/test-report?page=${p}&pageSize=10`)
      const json = await res.json()
      if (json.success && json.data) {
        setData(json.data.list || [])
        setTotal(json.data.total || 0)
      } else {
        setData(json.list || [])
        setTotal(json.total || 0)
      }
    } catch (error) {
      showError('获取报告列表失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchCompletedTasks = async () => {
    try {
      const res = await fetch('/api/task/all?status=completed&pageSize=100')
      const json = await res.json()
      const tasks = json.data?.list || json.list || []
      setCompletedTasks(tasks)
    } catch (error) {
      showError('获取已完成任务失败')
    }
  }

  useEffect(() => {
    fetchData()
  }, [page])

  // 生成报告
  const handleGenerate = () => {
    fetchCompletedTasks()
    setGenerateModalOpen(true)
  }

  const handleGenerateSubmit = async () => {
    if (!selectedTaskId) {
      showError('请选择任务')
      return
    }

    setGenerating(true)
    try {
      const res = await fetch('/api/report/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: selectedTaskId })
      })

      const json = await res.json()

      if (res.ok && json.success) {
        showSuccess('报告生成成功')
        setGenerateModalOpen(false)
        setSelectedTaskId(null)
        fetchData()
      } else {
        showError(json.error || '报告生成失败')
      }
    } catch (error) {
      showError('报告生成失败')
    } finally {
      setGenerating(false)
    }
  }

  // 查看详情（打开抽屉）
  const handleView = async (record: TestReport) => {
    setCurrentReport(record)

    // 解析检测数据
    if (record.testResults) {
      try {
        const parsed = typeof record.testResults === 'string'
          ? JSON.parse(record.testResults)
          : record.testResults
        setCurrentTestData(Array.isArray(parsed) ? parsed : [])
      } catch (e) {
        setCurrentTestData([])
      }
    } else {
      setCurrentTestData([])
    }

    // 获取审批历史
    try {
      const res = await fetch(`/api/report/${record.id}/approval`)
      const json = await res.json()
      if (json.success) {
        setCurrentApprovals(json.data || [])
      } else {
        setCurrentApprovals([])
      }
    } catch (error) {
      setCurrentApprovals([])
    }

    setViewDrawerOpen(true)
  }

  // 编辑（跳转到编辑页面）
  const handleEdit = (record: TestReport) => {
    router.push(`/report/task/${record.id}`)
  }

  // 打印（新窗口打开打印视图）
  const handlePrint = (record: TestReport) => {
    // 打开打印视图后自动触发打印
    const printWindow = window.open(`/report/task/${record.id}`, '_blank')
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        setTimeout(() => printWindow.print(), 500)
      })
    }
  }

  // 提交审批
  const handleSubmitApproval = (record: TestReport) => {
    setSubmitReportId(record.id)
    submitForm.resetFields()
    setSubmitModalOpen(true)
  }

  const handleSubmitConfirm = async () => {
    if (!submitReportId) return
    setSubmitting(true)
    try {
      const values = await submitForm.validateFields()
      const res = await fetch(`/api/report/${submitReportId}/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          comment: values.comment,
        }),
      })
      const json = await res.json()
      if (res.ok && (json.success || json.data)) {
        showSuccess('提交审批成功')
        setSubmitModalOpen(false)
        fetchData()
      } else {
        showError(json.error?.message || json.error || '提交审批失败')
      }
    } catch (error: any) {
      showError(error.message || '提交审批失败')
    } finally {
      setSubmitting(false)
    }
  }

  // 删除
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/test-report/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (res.ok && (json.success || json.data)) {
        showSuccess('删除成功')
        fetchData()
      } else {
        showError(json.error?.message || '删除失败')
      }
    } catch (error) {
      showError('删除失败')
    }
  }

  // 检测结论映射
  const conclusionMap: Record<string, string> = {
    qualified: '合格',
    unqualified: '不合格',
  }

  const columns: ColumnsType<TestReport> = [
    { title: '报告编号', dataIndex: 'reportNo', width: 160 },
    { title: '任务编号', render: (_, r) => r.task?.taskNo || '-', width: 130 },
    { title: '样品名称', dataIndex: 'sampleName', width: 120, ellipsis: true },
    { title: '样品编号', dataIndex: 'sampleNo', width: 120 },
    { title: '客户名称', dataIndex: 'clientName', width: 150, ellipsis: true },
    {
      title: '检测结论',
      dataIndex: 'overallConclusion',
      render: (val: string) => conclusionMap[val] || val || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag>
    },
    { title: '检测人', dataIndex: 'tester', width: 80 },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      fixed: 'right',
      width: 280,
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' as const } }),
      render: (_, record) => (
        <Space size="small" style={{ whiteSpace: 'nowrap' }}>
          {record.status === 'draft' && (
            <Button
              size="small"
              type="primary"
              ghost
              icon={<SendOutlined />}
              onClick={() => handleSubmitApproval(record)}
            >
              提交
            </Button>
          )}
          <Button
            size="small"
            icon={<PrinterOutlined />}
            onClick={() => handlePrint(record)}
          >
            打印
          </Button>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record)} />
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          {record.status === 'draft' && (
            <Popconfirm title="确认删除该报告?" onConfirm={() => handleDelete(record.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      )
    }
  ]

  // 抽屉中的检测数据表格列
  const testDataColumns = [
    { title: '序号', width: 60, render: (_: any, __: any, index: number) => index + 1 },
    { title: '检测项目', dataIndex: 'parameter', width: 150 },
    { title: '技术要求', dataIndex: 'standard', width: 120 },
    { title: '实测值', dataIndex: 'value', width: 100 },
    {
      title: '单项判定', dataIndex: 'result', width: 90,
      render: (result: string) => {
        if (!result) return '-'
        const color = (result.includes('合格') || result.includes('符合')) ? 'success' : 'error'
        return <Tag color={color}>{result}</Tag>
      }
    },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
  ]

  return (
    <div className="p-6">
      <div className="mb-4">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>任务报告管理</h2>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleGenerate}>
            生成报告
          </Button>
        </div>

        <Row gutter={16} className="mb-4">
          <Col span={6}>
            <Card size="small">
              <Statistic title="报告总数" value={total} prefix={<FileTextOutlined />} />
            </Card>
          </Col>
        </Row>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        scroll={{ x: 1200 }}
        pagination={{
          current: page,
          pageSize: 10,
          total,
          onChange: setPage,
          showSizeChanger: false,
          showTotal: (total) => `共 ${total} 条`
        }}
      />

      {/* 查看详情抽屉 */}
      <Drawer
        title="检测报告详情"
        placement="right"
        width={800}
        open={viewDrawerOpen}
        onClose={() => setViewDrawerOpen(false)}
      >
        {currentReport && (
          <Tabs
            defaultActiveKey="basic"
            items={[
              {
                key: 'basic',
                label: '基本信息',
                children: (
                  <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', paddingRight: 8 }}>
                    <Descriptions column={2} bordered size="small">
                      <Descriptions.Item label="报告编号">{currentReport.reportNo}</Descriptions.Item>
                      <Descriptions.Item label="报告状态">
                        <Tag color={statusMap[currentReport.status]?.color}>
                          {statusMap[currentReport.status]?.text}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="客户名称">{currentReport.clientName || '-'}</Descriptions.Item>
                      <Descriptions.Item label="样品名称">{currentReport.sampleName || '-'}</Descriptions.Item>
                      <Descriptions.Item label="样品编号">{currentReport.sampleNo || '-'}</Descriptions.Item>
                      <Descriptions.Item label="样品规格">{currentReport.specification || '-'}</Descriptions.Item>
                      <Descriptions.Item label="样品数量">{currentReport.sampleQuantity || '-'}</Descriptions.Item>
                      <Descriptions.Item label="收样日期">
                        {currentReport.receivedDate ? dayjs(currentReport.receivedDate).format('YYYY-MM-DD') : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="检测人员">{currentReport.tester || '-'}</Descriptions.Item>
                      <Descriptions.Item label="审核人员">{currentReport.reviewer || '-'}</Descriptions.Item>
                      <Descriptions.Item label="报告日期">
                        {dayjs(currentReport.createdAt).format('YYYY-MM-DD')}
                      </Descriptions.Item>
                      <Descriptions.Item label="发布日期">
                        {currentReport.issuedDate ? dayjs(currentReport.issuedDate).format('YYYY-MM-DD') : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="检测结论" span={2}>
                        {conclusionMap[currentReport.overallConclusion || ''] || currentReport.overallConclusion || '-'}
                      </Descriptions.Item>
                    </Descriptions>

                    {/* 检测数据表格 */}
                    {currentTestData.length > 0 && (
                      <>
                        <h4 style={{ margin: '16px 0 8px' }}>检测数据</h4>
                        <Table
                          rowKey={(_, i) => String(i)}
                          columns={testDataColumns}
                          dataSource={currentTestData}
                          pagination={false}
                          size="small"
                          bordered
                        />
                      </>
                    )}
                  </div>
                )
              },
              {
                key: 'approval',
                label: '审批记录',
                children: (
                  <div>
                    {currentApprovals.length > 0 ? (
                      <Timeline
                        items={currentApprovals.map(item => ({
                          color: item.result === 'pass' ? 'green' : 'red',
                          children: (
                            <div>
                              <div style={{ fontWeight: 500 }}>
                                {reviewTypeMap[item.reviewType] || item.reviewType}
                                <Tag color={item.result === 'pass' ? 'success' : 'error'} style={{ marginLeft: 8 }}>
                                  {item.result === 'pass' ? '通过' : '驳回'}
                                </Tag>
                              </div>
                              <div style={{ color: '#999', fontSize: 12 }}>
                                {item.reviewer} · {dayjs(item.reviewDate).format('YYYY-MM-DD HH:mm')}
                              </div>
                              {item.comments && (
                                <div style={{ color: '#666', marginTop: 4 }}>{item.comments}</div>
                              )}
                            </div>
                          )
                        }))}
                      />
                    ) : (
                      <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>暂无审批记录</div>
                    )}
                  </div>
                )
              }
            ]}
          />
        )}
      </Drawer>

      {/* 生成报告弹窗 */}
      <Modal
        title="生成检测报告"
        open={generateModalOpen}
        onOk={handleGenerateSubmit}
        onCancel={() => {
          setGenerateModalOpen(false)
          setSelectedTaskId(null)
        }}
        confirmLoading={generating}
        okText="生成"
        cancelText="取消"
      >
        <div className="py-4">
          <p className="mb-4 text-gray-600">请选择已完成的检测任务：</p>
          <Select
            style={{ width: '100%' }}
            placeholder="选择任务"
            value={selectedTaskId}
            onChange={setSelectedTaskId}
            options={completedTasks.map(task => ({
              value: task.id,
              label: `${task.taskNo} - ${task.sampleName || '未命名样品'}`
            }))}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
          {completedTasks.length === 0 && (
            <p className="mt-2 text-gray-500 text-sm">暂无已完成的任务</p>
          )}
        </div>
      </Modal>

      {/* 提交审批弹窗 */}
      <Modal
        title="提交审批"
        open={submitModalOpen}
        onOk={handleSubmitConfirm}
        onCancel={() => setSubmitModalOpen(false)}
        confirmLoading={submitting}
        okText="确认提交"
        cancelText="取消"
      >
        <Form form={submitForm} layout="vertical">
          <Form.Item name="comment" label="审批意见">
            <Input.TextArea rows={3} placeholder="选填，可以填写审批意见" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
