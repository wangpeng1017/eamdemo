'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, message, Space, Tag, Row, Col, Descriptions, Statistic } from 'antd'
import { PlusOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import dayjs from 'dayjs'

interface EvaluationScore {
  itemName: string
  weight: number
  score: number
  weightedScore?: number
  comment?: string | null
}

interface Supplier {
  id: string
  name: string
  code: string
  category?: { id: string; name: string }
}

interface SupplierEvaluation {
  id: string
  supplierId: string
  supplier: Supplier
  templateId: string | null
  period: string
  scores: EvaluationScore[]
  totalScore: number
  level: string
  evaluator: string
  evaluateDate: string
  comment: string | null
  status: 'draft' | 'submitted' | 'approved'
}

// 评价等级配置
const levelConfig: Record<string, { color: string; min: number; max: number }> = {
  'A': { color: 'green', min: 90, max: 100 },
  'B': { color: 'blue', min: 80, max: 89 },
  'C': { color: 'orange', min: 70, max: 79 },
  'D': { color: 'red', min: 0, max: 69 },
}

const getLevel = (score: number): string => {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  return 'D'
}

export default function SupplierEvaluationPage() {
  const [evaluations, setEvaluations] = useState<SupplierEvaluation[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [currentEvaluation, setCurrentEvaluation] = useState<SupplierEvaluation | null>(null)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [stats, setStats] = useState<Record<string, number>>({})
  const [form] = Form.useForm()

  // 加载供应商列表
  const loadSuppliers = useCallback(async () => {
    try {
      const res = await fetch('/api/supplier?pageSize=1000')
      const data = await res.json()
      if (data.success) {
        setSuppliers(data.data.list || [])
      }
    } catch {
      // 加载失败不影响主功能
    }
  }, [])

  // 加载评价列表
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(pagination.current),
        pageSize: String(pagination.pageSize),
      })

      const res = await fetch(`/api/supplier-performance?${params}`)
      const data = await res.json()
      if (data.success) {
        setEvaluations(data.data.list)
        setPagination(prev => ({ ...prev, total: data.data.total }))
        setStats(data.data.stats || {})
      } else {
        message.error(data.message || '加载失败')
      }
    } catch {
      message.error('网络错误')
    } finally {
      setLoading(false)
    }
  }, [pagination.current, pagination.pageSize])

  useEffect(() => {
    loadSuppliers()
  }, [loadSuppliers])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleAdd = () => {
    form.resetFields()
    setModalOpen(true)
  }

  const handleView = (record: SupplierEvaluation) => {
    setCurrentEvaluation(record)
    setDetailOpen(true)
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    setSubmitting(true)

    try {
      // 构建评分数据
      const scores: EvaluationScore[] = [
        { itemName: '检测质量', weight: 30, score: values.score1 || 0 },
        { itemName: '交付时效', weight: 25, score: values.score2 || 0 },
        { itemName: '服务态度', weight: 15, score: values.score3 || 0 },
        { itemName: '价格合理性', weight: 20, score: values.score4 || 0 },
        { itemName: '资质能力', weight: 10, score: values.score5 || 0 },
      ]

      const res = await fetch('/api/supplier-performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: values.supplierId,
          period: values.period,
          scores,
          evaluator: values.evaluator,
          comment: values.comment,
          status: 'draft',
        }),
      })
      const data = await res.json()

      if (data.success) {
        message.success('评价创建成功')
        setModalOpen(false)
        loadData()
      } else {
        message.error(data.message || '操作失败')
      }
    } catch {
      message.error('网络错误')
    } finally {
      setSubmitting(false)
    }
  }

  const handleTableChange = (pag: TablePaginationConfig) => {
    setPagination(prev => ({
      ...prev,
      current: pag.current || 1,
      pageSize: pag.pageSize || 10,
    }))
  }

  const statusMap: Record<string, { text: string; color: string }> = {
    draft: { text: '草稿', color: 'default' },
    submitted: { text: '已提交', color: 'processing' },
    approved: { text: '已审批', color: 'success' },
  }

  const columns: ColumnsType<SupplierEvaluation> = [
    {
      title: '供应商名称',
      key: 'supplierName',
      width: 200,
      render: (_, record) => record.supplier?.name || '-',
    },
    {
      title: '分类',
      key: 'categoryName',
      width: 100,
      render: (_, record) => record.supplier?.category?.name || '-',
    },
    { title: '评价周期', dataIndex: 'period', width: 100 },
    {
      title: '综合得分',
      dataIndex: 'totalScore',
      width: 100,
      render: (score: number) => (
        <span style={{ fontWeight: 'bold', color: levelConfig[getLevel(score)]?.color }}>
          {score.toFixed(1)}
        </span>
      ),
    },
    {
      title: '等级',
      dataIndex: 'level',
      width: 80,
      render: (level: string) => (
        <Tag color={levelConfig[level]?.color}>{level}级</Tag>
      ),
    },
    { title: '评价人', dataIndex: 'evaluator', width: 80 },
    {
      title: '评价日期',
      dataIndex: 'evaluateDate',
      width: 110,
      render: (date: string) => date ? date.split('T')[0] : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (status: string) => (
        <Tag color={statusMap[status]?.color}>{statusMap[status]?.text}</Tag>
      ),
    },
    {
      title: '操作',
      width: 100,
      render: (_, record) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record)}>
          详情
        </Button>
      ),
    },
  ]

  // 统计数据
  const totalCount = pagination.total
  const levelACount = stats.A || 0
  const levelBCount = stats.B || 0
  const levelCCount = stats.C || 0
  const levelDCount = stats.D || 0
  const avgScore = evaluations.length > 0
    ? (evaluations.reduce((sum, e) => sum + e.totalScore, 0) / evaluations.length).toFixed(1)
    : 0

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>供应商绩效评价</h2>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadData}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增评价
          </Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card size="small">
            <Statistic title="评价总数" value={totalCount} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="平均得分" value={avgScore} suffix="分" />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="A级供应商" value={levelACount} valueStyle={{ color: 'green' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="B级供应商" value={levelBCount} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="C级供应商" value={levelCCount} valueStyle={{ color: 'orange' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="D级供应商" value={levelDCount} valueStyle={{ color: 'red' }} />
          </Card>
        </Col>
      </Row>

      <Card>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={evaluations}
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          onChange={handleTableChange}
        />
      </Card>

      {/* 新增评价弹窗 */}
      <Modal
        title="新增供应商评价"
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="supplierId" label="供应商" rules={[{ required: true }]}>
                <Select
                  showSearch
                  placeholder="选择供应商"
                  optionFilterProp="label"
                  options={suppliers.map(s => ({
                    value: s.id,
                    label: `${s.name} (${s.category?.name || '-'})`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="period" label="评价周期" rules={[{ required: true }]}>
                <Input placeholder="如: 2025-Q4" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="evaluator" label="评价人" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ marginBottom: 16, fontWeight: 'bold' }}>评分项（满分100分）</div>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="score1" label="检测质量 (30%)" rules={[{ required: true }]}>
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="score2" label="交付时效 (25%)" rules={[{ required: true }]}>
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="score3" label="服务态度 (15%)" rules={[{ required: true }]}>
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="score4" label="价格合理性 (20%)" rules={[{ required: true }]}>
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="score5" label="资质能力 (10%)" rules={[{ required: true }]}>
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="comment" label="综合评价">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        title="评价详情"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={700}
      >
        {currentEvaluation && (
          <>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="供应商">{currentEvaluation.supplier?.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="分类">{currentEvaluation.supplier?.category?.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="评价周期">{currentEvaluation.period}</Descriptions.Item>
              <Descriptions.Item label="评价人">{currentEvaluation.evaluator}</Descriptions.Item>
              <Descriptions.Item label="评价日期">
                {currentEvaluation.evaluateDate ? currentEvaluation.evaluateDate.split('T')[0] : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusMap[currentEvaluation.status]?.color}>
                  {statusMap[currentEvaluation.status]?.text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="综合得分">
                <span style={{ fontSize: 24, fontWeight: 'bold', color: levelConfig[currentEvaluation.level]?.color }}>
                  {currentEvaluation.totalScore.toFixed(1)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="等级">
                <Tag color={levelConfig[currentEvaluation.level]?.color} style={{ fontSize: 16 }}>
                  {currentEvaluation.level}级
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 24 }}>
              <h4>评分明细</h4>
              <Table
                rowKey="itemName"
                dataSource={currentEvaluation.scores}
                pagination={false}
                size="small"
                columns={[
                  { title: '评价项', dataIndex: 'itemName' },
                  { title: '权重', dataIndex: 'weight', render: (w: number) => `${w}%` },
                  { title: '得分', dataIndex: 'score' },
                  {
                    title: '加权得分',
                    key: 'weightedScore',
                    render: (_, record) => ((record.score * record.weight) / 100).toFixed(2),
                  },
                ]}
              />
            </div>

            {currentEvaluation.comment && (
              <div style={{ marginTop: 16 }}>
                <h4>综合评价</h4>
                <p>{currentEvaluation.comment}</p>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  )
}
