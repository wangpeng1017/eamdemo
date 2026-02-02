// @file: 业务咨询登记页面
// @input: /api/consultation, /api/client
// @output: 咨询CRUD、生成报价
// @pos: 委托流程入口页 - 客户首次咨询
// ⚠️ 更新我时，请同步更新本注释及 entrustment/_INDEX.md

'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Space, Modal, Form, Input, Select, DatePicker, Drawer, Row, Col, InputNumber, Divider, Tabs, Upload, Image, Tag, Alert } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, FileTextOutlined, CloseCircleOutlined, TeamOutlined, SyncOutlined, PaperClipOutlined } from '@ant-design/icons'
import { StatusTag } from '@/components/StatusTag'
import UserSelect from '@/components/UserSelect'
import SampleTestItemTable, { SampleTestItemData } from '@/components/SampleTestItemTable'
// ConsultationAssessmentModal 已废弃 - v2系统中评估人在创建咨询单时通过样品检测项分配
import ReassessmentModal from '@/components/ReassessmentModal'
import AssessmentResultTab from '@/components/AssessmentResultTab'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useRouter } from 'next/navigation'
import { showConfirm, showWarning, showSuccess, showError, showWarningMessage, showLoading } from '@/lib/confirm'

interface Client {
  id: string
  name: string
  shortName?: string
  contact?: string
  phone?: string
  email?: string
  address?: string
}

interface TestTemplate {
  id: string
  templateNo: string
  name: string
  category?: string
  method?: string
}

interface Attachment {
  id: string
  originalName: string
  fileName: string
  fileSize: number
  mimeType: string
  fileUrl: string
  uploadedAt: string
  uploadedBy?: string
}

interface Consultation {
  id: string
  consultationNo: string
  clientId?: string
  client?: Client
  clientContactPerson?: string
  clientRequirement?: string | null // Added
  estimatedQuantity?: string | null
  testItems?: string[]
  expectedDeadline?: string | null
  budgetRange?: string | null
  feasibility?: string | null
  feasibilityNote?: string | null
  follower?: string | null
  status: string
  createdAt: string
}

const FEASIBILITY_OPTIONS = [
  { value: 'feasible', label: '可行' },
  { value: 'difficult', label: '困难' },
  { value: 'infeasible', label: '不可行' },
]

export default function ConsultationPage() {
  const router = useRouter()
  const [data, setData] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  // const [modalOpen, setModalOpen] = useState(false) // 移除
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false)
  // const [editingId, setEditingId] = useState<string | null>(null) // 移除
  const [currentConsultation, setCurrentConsultation] = useState<Consultation | null>(null)
  // const [clients, setClients] = useState<Client[]>([]) // 移除
  // const [clientsLoading, setClientsLoading] = useState(false) // 移除
  const [testTemplates, setTestTemplates] = useState<TestTemplate[]>([])
  // const [form] = Form.useForm() // 移除
  const [filters, setFilters] = useState<any>({})

  // 行选择
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [selectedRows, setSelectedRows] = useState<Consultation[]>([])
  // 弹窗
  const [closeConsultModalOpen, setCloseConsultModalOpen] = useState(false)
  const [closeReasonForm] = Form.useForm()
  // const [sampleTestItems, setSampleTestItems] = useState<SampleTestItemData[]>([])

  // 评估相关状态
  const [reassessmentModalOpen, setReassessmentModalOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  // 附件上传相关 - 移除
  // const [fileList, setFileList] = useState<any[]>([])
  // const [uploading, setUploading] = useState(false)

  // 获取检测项目列表
  const fetchTestTemplates = async () => {
    try {
      const res = await fetch('/api/test-template?pageSize=1000')
      const json = await res.json()
      if (json.success && json.data) {
        setTestTemplates(json.data.list || [])
      } else {
        setTestTemplates(json.list || [])
      }
    } catch (error) {
      showError('获取检测项目列表失败')
    }
  }

  const fetchData = async (p = page, f = filters) => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(p),
      pageSize: '10',
      ...Object.fromEntries(Object.entries(f).filter(([_, v]) => v !== undefined && v !== '')),
    })
    const res = await fetch(`/api/consultation?${params}`)
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

  useEffect(() => {
    fetchData()
    // fetchClients() // 移除
    fetchTestTemplates()
    fetchCurrentUser()
  }, [page])

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me')
      const json = await res.json()
      if (json.success && json.data) {
        setCurrentUser(json.data)
      }
    } catch (error) {
      console.error('[Consultation] 获取当前用户信息失败:', error)
      showError('获取用户信息失败：无法获取当前用户信息')
    }
  }

  const handleAdd = () => {
    router.push('/entrustment/consultation/create')
  }

  const handleEdit = async (record: Consultation) => {
    router.push(`/entrustment/consultation/edit/${record.id}`)
  }

  const handleView = async (record: Consultation) => {
    setCurrentConsultation(record)
    setViewDrawerOpen(true)
  }

  const handleDelete = async (record: Consultation) => {
    let title = '确认删除'
    let content = '确定要删除这条咨询记录吗？'
    let okType: 'danger' | 'primary' = 'primary'

    if (record.status === 'quoted') {
      title = '无法删除'
      content = '该咨询单已生成报价，请先处理相关报价单后再尝试删除，或将状态更改为"已关闭"。'
      showWarning(title, content)
      return
    }

    if (record.status === 'closed') {
      content = '该咨询单已关闭，确定要彻底删除吗？删除后无法恢复。'
      okType = 'danger'
    }

    modal.confirm({
      title,
      content,
      okType,
      onOk: async () => {
        try {
          const res = await fetch(`/api/consultation/${record.id}`, { method: 'DELETE' })
          const json = await res.json()
          if (res.ok && json.success) {
            showSuccess('删除成功')
            fetchData()
          } else {
            showError(json.error?.message || '删除失败')
          }
        } catch (error) {
          showError('删除异常')
        }
      }
    })
  }



  // 打开关闭咨询弹窗
  const handleOpenCloseConsult = () => {
    if (selectedRows.length === 0) {
      showWarningMessage('请选择咨询记录')
      return
    }
    closeReasonForm.resetFields()
    setCloseConsultModalOpen(true)
  }

  // 关闭咨询提交
  const handleCloseConsult = async () => {
    const values = await closeReasonForm.validateFields()

    for (const row of selectedRows) {
      await fetch(`/api/consultation/${row.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'closed',
        }),
      })
    }

    showSuccess('咨询已关闭')
    setCloseConsultModalOpen(false)
    setSelectedRowKeys([])
    setSelectedRows([])
    fetchData()
  }



  // 针对单条记录生成报价单
  const handleOpenGenerateQuoteForRecord = async (consultation: Consultation) => {
    // ✅ 需求1：评估验证 - 检查所有样品检测项是否已评估通过
    try {
      const res = await fetch(`/api/consultation/${consultation.id}`)
      const result = await res.json()

      if (!res.ok || !result.success) {
        showError('获取咨询详情失败：无法加载咨询单信息')
        return
      }

      const data = result.data
      const items = data.sampleTestItems || []

      // 检查是否有未评估或评估未通过的项
      const unfinishedItems = items.filter(
        (item: any) => item.assessmentStatus !== 'passed'
      )

      if (unfinishedItems.length > 0) {
        // 使用 modal 实例（来自 useModal hook）而非静态 Modal.warning
        modal.warning({
          title: '评估未完成',
          width: 700,
          centered: true,
          content: (
            <div>
              <p>以下 <strong>{unfinishedItems.length}</strong> 个样品检测项尚未完成评估：</p>
              <Table
                dataSource={unfinishedItems}
                rowKey="id"
                pagination={false}
                size="small"
                bordered
                columns={[
                  { title: '样品名称', dataIndex: 'sampleName', width: 120 },
                  { title: '检测项目', dataIndex: 'testItemName', width: 150 },
                  { title: '检测标准', dataIndex: 'testStandard', width: 150 },
                  {
                    title: '评估状态',
                    dataIndex: 'assessmentStatus',
                    width: 100,
                    render: (s: string) => ({
                      'pending': <Tag color="default">待评估</Tag>,
                      'assessing': <Tag color="processing">评估中</Tag>,
                      'passed': <Tag color="success">评估通过</Tag>,
                      'failed': <Tag color="error">评估不可行</Tag>,
                      'rejected': <Tag color="error">已驳回</Tag>,
                    } as Record<string, React.ReactNode>)[s] || <Tag>{s}</Tag>
                  },
                  { title: '评估人', dataIndex: 'currentAssessorName', width: 100 },
                ]}
                scroll={{ y: 300 }}
              />
              <Alert
                message="💡 提示"
                description="请先完成以上项目的评估后再生成报价单"
                type="info"
                showIcon
                style={{ marginTop: 16 }}
              />
            </div>
          ),
          okText: '我知道了'
        })
        return
      }

      // ✅ 验证通过，跳转到新建报价单页面
      router.push(`/entrustment/quotation/create?consultationId=${consultation.id}`)

    } catch (error) {
      console.error('❌ [生成报价单] 异常:', error)
      showError('生成报价单失败，请重试')
    }
  }

  // v2: "发起评估"功能已废弃，评估人在创建时通过样品检测项分配

  // 重新评估
  const handleReassessment = (consultation: Consultation) => {
    setCurrentConsultation(consultation)
    setReassessmentModalOpen(true)
  }

  // 关闭咨询单
  const handleCloseConsultation = async (consultation: Consultation) => {
    showConfirm(
      '确认关闭咨询单',
      `确定要关闭咨询单 ${consultation.consultationNo} 吗？关闭后将无法继续评估。`,
      async () => {
        try {
          const res = await fetch(`/api/consultation/${consultation.id}/close`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
          const json = await res.json()
          if (json.success) {
            showSuccess('咨询单已关闭')
            fetchData()
          } else {
            showError(json.error?.message || '关闭失败')
          }
        } catch (error) {
          console.error('关闭咨询单失败:', error)
          showError('关闭失败')
        }
      }
    )
  }

  const columns: ColumnsType<Consultation> = [
    { title: '咨询单号', dataIndex: 'consultationNo', width: 140 },
    {
      title: '客户名称',
      width: 150,
      ellipsis: true,
      render: (_, record) => record.client?.name || '-'
    },
    {
      title: '检测项目',
      dataIndex: 'testItems',
      width: 180,
      ellipsis: true,
      render: (items: string[]) => {
        if (!items || items.length === 0) return '-'
        const displayItems = items.slice(0, 2)
        const extra = items.length > 2 ? ` 等${items.length}项` : ''
        return displayItems.join('、') + extra
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: string) => <StatusTag type="consultation" status={s} />
    },
    {
      title: '报告时间',
      dataIndex: 'expectedDeadline',
      width: 160,
      render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD HH:mm:ss') : '-'
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '联系人/电话',
      width: 130,
      render: (_, record) => (
        <div>
          <div>{record.clientContactPerson || '-'}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{record.client?.phone || '-'}</div>
        </div>
      )
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      render: (_, record) => (
        <Space size="small" style={{ whiteSpace: 'nowrap' }}>
          {record.status === 'assessment_failed' && (
            <>
              <Button
                size="small"
                icon={<SyncOutlined />}
                onClick={() => handleReassessment(record)}
              >
                重新评估
              </Button>
              <Button
                size="small"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => handleCloseConsultation(record)}
              >
                关闭
              </Button>
            </>
          )}
          <Button
            size="small"
            icon={<FileTextOutlined />}
            onClick={(e) => {
              e.stopPropagation()
              handleOpenGenerateQuoteForRecord(record)
            }}
          >
            生成报价单
          </Button>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record)} />
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
        </Space>
      )
    }
  ]

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[], rows: Consultation[]) => {
      setSelectedRowKeys(keys)
      setSelectedRows(rows)
    },
  }

  // 引用 useModal
  const [modal, contextHolder] = Modal.useModal()

  return (
    <div>
      {contextHolder}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>业务咨询</h2>
        <Space style={{ whiteSpace: 'nowrap' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增咨询</Button>
        </Space>
      </div>

      {/* 筛选条件 */}
      <div style={{ background: '#f5f5f5', padding: 16, marginBottom: 16, borderRadius: 4 }}>
        <Form layout="inline" onFinish={(values) => { setFilters(values); setPage(1); fetchData(1, values) }}>
          <Form.Item name="keyword" label="关键词">
            <Input placeholder="咨询单号/客户名称/联系人" allowClear style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select placeholder="全部状态" allowClear style={{ width: 120 }}>
              <Select.Option value="following">跟进中</Select.Option>
              <Select.Option value="quoted">已报价</Select.Option>
              <Select.Option value="rejected">已拒绝</Select.Option>
              <Select.Option value="closed">已关闭</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">查询</Button>
          </Form.Item>
        </Form>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        rowSelection={rowSelection}
        scroll={{ x: 1050 }}
        pagination={{ current: page, total, pageSize: 10, onChange: setPage, showSizeChanger: false }}
      />



      {/* 查看详情抽屉 */}
      <Drawer
        title="咨询详情"
        placement="right"
        width={800}
        open={viewDrawerOpen}
        onClose={() => setViewDrawerOpen(false)}
      >
        {currentConsultation && (
          <Tabs
            defaultActiveKey="basic"
            items={[
              {
                key: 'basic',
                label: '基本信息',
                children: (
                  <div>
                    <Descriptions title="基本信息" data={currentConsultation} />
                    <Divider />
                    <Descriptions title="其他信息" data={currentConsultation} />
                  </div>
                )
              },
              {
                key: 'assessment',
                label: '评估结果',
                children: (
                  <AssessmentResultTab
                    consultationId={currentConsultation.id}
                    consultationNo={currentConsultation.consultationNo}
                    currentUserId={currentUser?.id}
                  />
                )
              }
            ]}
          />
        )}
      </Drawer>



      {/* 关闭咨询弹窗 */}
      <Modal
        title="关闭咨询"
        open={closeConsultModalOpen}
        onOk={handleCloseConsult}
        onCancel={() => setCloseConsultModalOpen(false)}
      >
        <Form form={closeReasonForm} layout="vertical">
          <Form.Item
            name="closeReason"
            label="关闭原因"
            rules={[{ required: true, message: '请输入关闭原因' }]}
          >
            <Input.TextArea rows={4} placeholder="请输入关闭原因" />
          </Form.Item>
        </Form>
      </Modal>

      {/* v2: 发起评估弹窗已废弃，评估人在创建咨询单时通过样品检测项分配 */}

      {/* 重新评估弹窗 */}
      <ReassessmentModal
        open={reassessmentModalOpen}
        consultationId={currentConsultation?.id || null}
        consultationNo={currentConsultation?.consultationNo}
        currentRequirement={currentConsultation?.clientRequirement || undefined}
        onCancel={() => {
          setReassessmentModalOpen(false)
          setCurrentConsultation(null)
        }}
        onSuccess={() => {
          setReassessmentModalOpen(false)
          setCurrentConsultation(null)
          fetchData()
        }}
      />
    </div>
  )
}

// 详情展示组件
function Descriptions({ title, data }: { title: string; data: Consultation }) {
  const items = [
    { label: '咨询单号', value: data.consultationNo },
    { label: '客户名称', value: data.client?.name || '-' },
    { label: '联系人', value: data.clientContactPerson || '-' },
    { label: '联系电话', value: data.client?.phone || '-' },
    { label: '客户邮箱', value: data.client?.email || '-' },
    { label: '客户地址', value: data.client?.address || '-' },
    { label: '预估数量', value: data.estimatedQuantity },
    { label: '检测项目', value: data.testItems?.join(', ') },
    { label: '报告时间', value: data.expectedDeadline ? dayjs(data.expectedDeadline).format('YYYY-MM-DD HH:mm:ss') : '-' },
    { label: '预算范围', value: data.budgetRange },
    { label: '可行性评估', value: <StatusTag type="feasibility" status={data.feasibility} /> },
    { label: '可行性说明', value: data.feasibilityNote },
    { label: '跟单人', value: data.follower },
    { label: '状态', value: <StatusTag type="consultation" status={data.status} /> },
    { label: '创建时间', value: dayjs(data.createdAt).format('YYYY-MM-DD HH:mm:ss') },
  ]

  const relevantItems = title === '基本信息'
    ? items.slice(0, 6)
    : title === '其他信息'
      ? items.slice(6)
      : []

  return (
    <div>
      <h4 style={{ marginBottom: 16 }}>{title}</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
        {relevantItems.map((item, index) => (
          <div key={index}>
            <span style={{ color: '#666', fontSize: 12 }}>{item.label}：</span>
            <span style={{ marginLeft: 8 }}>{item.value || '-'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
