'use client'

import { canModify, canOperate, type RecordPermissionContext } from '@/lib/record-permission'

import React, { useState, useEffect } from 'react'
import { showSuccess, showError } from '@/lib/confirm'
import { Table, Button, Space, Tag, Modal, Select, Card, Statistic, Row, Col, Drawer, Descriptions, Tabs, Timeline, Form, Input, Popconfirm } from 'antd'
import { PlusOutlined, EyeOutlined, EditOutlined, PrinterOutlined, SendOutlined, FileTextOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useRouter } from 'next/navigation'
import TestReportPrint from '@/components/business/TestReportPrint'
import type { ReportPrintData } from '@/components/business/TestReportPrint'
import { parseSheetData, type ParsedSheetData } from '@/lib/sheet-parser'

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
  taskId: string | null
  task?: { taskNo: string } | null
  taskNo: string
  createdById?: string | null
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
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [generateModalOpen, setGenerateModalOpen] = useState(false)
  const [completedTasks, setCompletedTasks] = useState<Task[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  // 查看抽屉
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false)
  const [currentReport, setCurrentReport] = useState<TestReport | null>(null)
  const [currentApprovals, setCurrentApprovals] = useState<Approval[]>([])
  const [currentSheetParsed, setCurrentSheetParsed] = useState<ParsedSheetData>({ headers: [], rows: [] })

  // 提交审批状态
  const [submitting, setSubmitting] = useState(false)

  // 错误弹窗状态
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // 打印相关状态
  const [printData, setPrintData] = useState<ReportPrintData | null>(null)
  const [showPrint, setShowPrint] = useState(false)
  const printRef = React.useRef<HTMLDivElement>(null)

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
    fetch('/api/auth/me').then(r => r.json()).then(j => { if (j.success) setCurrentUser(j.data) }).catch(() => { })
  }, [page])

  // 生成报告
  const handleGenerate = () => {
    fetchCompletedTasks()
    setGenerateModalOpen(true)
  }

  const handleGenerateSubmit = async () => {
    if (!selectedTaskId) {
      setErrorMsg('请先选择一个任务')
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
        setErrorMsg(json.error || '报告生成失败')
      }
    } catch (error) {
      setErrorMsg('报告生成失败，请稍后重试')
    } finally {
      setGenerating(false)
    }
  }

  // extractTestResultsFromSheet 已删除，改用 parseSheetData 直接渲染原始表格

  // 查看详情（打开抽屉）
  const handleView = async (record: TestReport) => {
    setCurrentReport(record)

    // 从任务 sheetData 提取检测数据
    if (record.taskId) {
      try {
        const taskRes = await fetch(`/api/task/${record.taskId}`)
        if (taskRes.ok) {
          const taskJson = await taskRes.json()
          const taskData = taskJson.data || taskJson
          if (taskData?.sheetData) {
            setCurrentSheetParsed(parseSheetData(taskData.sheetData))
          } else {
            setCurrentSheetParsed({ headers: [], rows: [] })
          }
        }
      } catch (e) {
        console.error('[handleView] 获取任务数据失败:', e)
        setCurrentSheetParsed({ headers: [], rows: [] })
      }
    } else {
      setCurrentSheetParsed({ headers: [], rows: [] })
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

  // 打印（使用专用打印组件，参考委托单打印模式）
  const handlePrint = async (record: TestReport) => {
    try {
      // 从任务 sheetData 解析检测数据
      let parsedSheet: ParsedSheetData = { headers: [], rows: [] }
      if (record.taskId) {
        try {
          const taskRes = await fetch(`/api/task/${record.taskId}`)
          if (taskRes.ok) {
            const taskJson = await taskRes.json()
            const taskData = taskJson.data || taskJson
            if (taskData?.sheetData) {
              parsedSheet = parseSheetData(taskData.sheetData)
            }
          }
        } catch (e) {
          console.error('[handlePrint] 获取任务数据失败:', e)
        }
      }

      const pd: ReportPrintData = {
        reportNo: record.reportNo,
        clientName: record.clientName || '',
        sampleName: record.sampleName || '',
        sampleNo: record.sampleNo || '',
        specification: record.specification || '',
        sampleQuantity: record.sampleQuantity || '',
        receivedDate: record.receivedDate || '',
        tester: record.tester || '',
        reviewer: record.reviewer || '',
        overallConclusion: record.overallConclusion || '',
        createdAt: record.createdAt,
        issuedDate: record.issuedDate || '',
        taskNo: record.task?.taskNo || '',
        testResults: [],
        parsedSheet,
      }

      setPrintData(pd)
      setShowPrint(true)

      // 延迟后触发打印
      setTimeout(() => {
        window.print()
      }, 500)
    } catch (e) {
      console.error('打印准备失败:', e)
      showError('准备打印数据失败')
    }
  }

  // 提交审批（直接更新状态，不弹窗）
  const handleSubmitApproval = async (record: TestReport) => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/report/${record.id}/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          comment: '',
        }),
      })
      const json = await res.json()
      if (res.ok && (json.success || json.data)) {
        showSuccess('提交审批成功')
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
      render: (_, record) => {
        const permCtx: RecordPermissionContext = { userId: currentUser?.id || '', dataScope: currentUser?.dataScope || 'self' }
        return (
          <Space size="small" style={{ whiteSpace: 'nowrap' }}>
            <Button
              size="small"
              icon={<PrinterOutlined />}
              onClick={() => handlePrint(record)}
            >
              打印
            </Button>
            <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record)} />
            <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
            <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        )
      }
    }
  ]

  // 抽屉中的检测数据表格列
  const testDataColumns = [
    { title: '序号', width: 60, render: (_: any, __: any, index: number) => index + 1 },
    { title: '检测项目', dataIndex: 'parameter', width: 150, render: (v: any) => typeof v === 'object' ? (v?.name || v?.parameter || JSON.stringify(v)) : (v || '-') },
    { title: '技术要求', dataIndex: 'standard', width: 120, render: (v: any) => typeof v === 'object' ? JSON.stringify(v) : (v || '-') },
    { title: '实测值', dataIndex: 'value', width: 100, render: (v: any) => typeof v === 'object' ? JSON.stringify(v) : (v || '-') },
    {
      title: '单项判定', dataIndex: 'result', width: 90,
      render: (result: any) => {
        if (!result) return '-'
        const text = typeof result === 'object' ? JSON.stringify(result) : String(result)
        const color = (text.includes('合格') || text.includes('符合')) ? 'success' : 'error'
        return <Tag color={color}>{text}</Tag>
      }
    },
    { title: '备注', dataIndex: 'remark', ellipsis: true, render: (v: any) => typeof v === 'object' ? JSON.stringify(v) : (v || '-') },
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

                    {/* 检测数据表格 - 使用原始 sheetData 渲染（含合并单元格） */}
                    {currentSheetParsed.headers.length > 0 && (
                      <>
                        <h4 style={{ margin: '16px 0 8px' }}>检测数据</h4>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                              <tr>
                                {currentSheetParsed.headers.map((h, i) => (
                                  <th key={i} style={{
                                    border: '1px solid #d9d9d9', padding: '6px 8px',
                                    backgroundColor: '#fafafa', fontWeight: 600,
                                    textAlign: 'center', whiteSpace: 'nowrap',
                                  }}>{h || `列${i + 1}`}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {currentSheetParsed.rows.map((row, ri) => (
                                <tr key={ri}>
                                  {row.map((cell, ci) => {
                                    if (cell.hidden) return null
                                    return (
                                      <td key={ci} rowSpan={cell.rowSpan} colSpan={cell.colSpan} style={{
                                        border: '1px solid #d9d9d9', padding: '4px 8px',
                                        textAlign: ci === 0 ? 'center' : 'left',
                                        verticalAlign: cell.rowSpan && cell.rowSpan > 1 ? 'middle' : undefined,
                                      }}>{cell.text}</td>
                                    )
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
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

      {/* 错误提示弹窗 */}
      <Modal
        title="操作提示"
        open={!!errorMsg}
        onOk={() => setErrorMsg(null)}
        onCancel={() => setErrorMsg(null)}
        okText="知道了"
        cancelButtonProps={{ style: { display: 'none' } }}
        centered
      >
        <p>{errorMsg}</p>
      </Modal>

      {/* 打印区域（隐藏，仅打印时可见） */}
      {showPrint && printData && (
        <div id="report-print-wrapper" style={{ position: 'fixed', top: '-9999px', left: '-9999px' }}>
          <TestReportPrint ref={printRef} data={printData} />
        </div>
      )}

    </div>
  )
}
