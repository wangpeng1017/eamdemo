'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Space, Tag, Modal, Select, message, Card, Statistic, Row, Col } from 'antd'
import { PlusOutlined, EyeOutlined, FileTextOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useRouter } from 'next/navigation'

interface TestReport {
  id: string
  reportNo: string
  sampleName: string | null
  sampleNo: string | null
  clientName: string | null
  overallConclusion: string | null
  status: string
  tester: string | null
  createdAt: string
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
      message.error('获取报告列表失败')
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
      message.error('获取已完成任务失败')
    }
  }

  useEffect(() => {
    fetchData()
  }, [page])

  const handleGenerate = () => {
    fetchCompletedTasks()
    setGenerateModalOpen(true)
  }

  const handleGenerateSubmit = async () => {
    if (!selectedTaskId) {
      message.error('请选择任务')
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
        message.success('报告生成成功')
        setGenerateModalOpen(false)
        setSelectedTaskId(null)
        fetchData()
      } else {
        message.error(json.error || '报告生成失败')
      }
    } catch (error) {
      message.error('报告生成失败')
    } finally {
      setGenerating(false)
    }
  }

  const handleView = (id: string) => {
    router.push(`/test/report/${id}`)
  }

  const columns: ColumnsType<TestReport> = [
    { title: '报告编号', dataIndex: 'reportNo', width: 150 },
    { title: '样品名称', dataIndex: 'sampleName', width: 150 },
    { title: '样品编号', dataIndex: 'sampleNo', width: 120 },
    { title: '客户名称', dataIndex: 'clientName', width: 150 },
    { title: '检测结论', dataIndex: 'overallConclusion', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag>
    },
    { title: '检测人', dataIndex: 'tester', width: 100 },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      width: 80,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleView(record.id)}
          />
        </Space>
      )
    }
  ]

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-4">检测报告管理</h1>

        <Row gutter={16} className="mb-4">
          <Col span={6}>
            <Card>
              <Statistic title="报告总数" value={total} prefix={<FileTextOutlined />} />
            </Card>
          </Col>
        </Row>
      </div>

      <div className="mb-4 flex justify-between">
        <div></div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleGenerate}
        >
          生成报告
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{
          current: page,
          pageSize: 10,
          total,
          onChange: setPage,
          showSizeChanger: false,
          showTotal: (total) => `共 ${total} 条`
        }}
      />

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
    </div>
  )
}
