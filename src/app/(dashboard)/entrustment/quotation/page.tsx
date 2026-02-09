// @file: 检测报价管理页面
// @input: /api/quotation, /api/consultation, /api/client
// @output: 报价CRUD、提交审批、生成PDF、生成合同
// @pos: 委托流程核心页 - 咨询后生成报价
// ⚠️ 更新我时，请同步更新本注释及 entrustment/_INDEX.md

'use client'

import { useState, useEffect } from 'react'
import { showSuccess, showError, showWarningMessage } from '@/lib/confirm'
import { Table, Button, Space, Modal, Form, Input, Select, DatePicker, Drawer, Row, Col, Divider, Popconfirm, Radio, Upload, Descriptions, Tabs, Tooltip } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, SendOutlined, FolderOutlined, UploadOutlined, FileTextOutlined, PrinterOutlined } from '@ant-design/icons'
import { StatusTag } from '@/components/StatusTag'
import { ApprovalTimeline } from '@/components/ApprovalTimeline'
import { RejectModal } from '@/components/RejectModal'
import { CreateEntrustmentButton } from '@/components/CreateEntrustmentButton'
import { QuotationPDFButton } from '@/components/QuotationPDFButton'
import { QuotationApprovalRecords } from '@/components/QuotationApprovalRecords'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import QuotationPrint from '@/components/business/QuotationPrint'

interface Client {
  id: string
  name: string
  shortName?: string
  contact?: string
  phone?: string
  email?: string
  address?: string
}

interface QuotationItem {
  id?: string
  sampleName: string
  serviceItem: string
  methodStandard: string
  quantity: string
  unitPrice: number
  totalPrice: number
  remark?: string
}

interface QuotationApproval {
  id: string
  level: number
  role: string
  approver: string
  action: string
  comment?: string
  timestamp: string
}

interface Quotation {
  id: string
  quotationNo: string
  consultationNo?: string | null
  clientId?: string
  client?: Client
  clientContactPerson?: string
  clientPhone?: string | null
  clientEmail?: string | null
  clientAddress?: string | null
  consultationId?: string | null
  quotationDate: string
  validDays: number
  totalAmount: number
  taxRate: number
  taxAmount: number
  totalWithTax: number
  discountAmount?: number
  discountReason?: string | null
  finalAmount: number
  paymentTerms?: string | null
  deliveryTerms?: string | null
  remark?: string | null
  clientResponse?: string | null
  clientReportDeadline?: string | null
  followerId?: string | null
  serviceContact?: string | null
  status: string
  createdAt: string
  items?: QuotationItem[]
  approvals?: QuotationApproval[]
}

const STATUS_OPTIONS = [
  { value: 'draft', label: '草稿' },
  { value: 'pending_sales', label: '待销售审批' },
  { value: 'pending_finance', label: '待财务审批' },
  { value: 'pending_lab', label: '待实验室审批' },
  { value: 'approved', label: '已批准' },
  { value: 'rejected', label: '已拒绝' },
  { value: 'archived', label: '已归档' },
]

const CLIENT_RESPONSE_OPTIONS = [
  { value: 'pending', label: '待反馈' },
  { value: 'ok', label: '接受' },
  { value: 'ng', label: '拒绝' },
]

export default function QuotationPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [data, setData] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  const [viewDrawerOpen, setViewDrawerOpen] = useState(false)
  const [approvalModalOpen, setApprovalModalOpen] = useState(false)

  const [currentQuotation, setCurrentQuotation] = useState<Quotation | null>(null)

  const [approvalForm] = Form.useForm()
  const [filters, setFilters] = useState<any>({})

  // 行选择
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [selectedRows, setSelectedRows] = useState<Quotation[]>([])

  // 新功能弹窗
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const [feedbackForm] = Form.useForm()

  // 🆕 新功能：驳回对话框状态
  const [rejectModalVisible, setRejectModalVisible] = useState(false)
  const [selectedQuotationForReject, setSelectedQuotationForReject] = useState<Quotation | null>(null)

  // 打印相关
  const [printData, setPrintData] = useState<any>(null)

  const fetchData = async (p = page, f = filters) => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(p),
      pageSize: '10',
      ...Object.fromEntries(Object.entries(f).filter(([_, v]) => v !== undefined && v !== '')),
    })
    const res = await fetch(`/api/quotation?${params}`)
    const json = await res.json()
    if (json.success && json.data) {
      setData(json.data.list || [])
      setTotal(json.data.total || 0)
    } else {
      if (json.success && json.data) {
        setData(json.data.list || [])
        setTotal(json.data.total || 0)
      } else {
        setData(json.list || [])
        setTotal(json.total || 0)
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [page])

  const handleAdd = () => {
    router.push('/entrustment/quotation/create')
  }

  const handleEdit = async (record: Quotation) => {
    router.push(`/entrustment/quotation/edit/${record.id}`)
  }

  const handleView = async (record: Quotation) => {
    // 调用详情API获取完整数据（包含approvalInstance和approvalFlow）
    try {
      const res = await fetch(`/api/quotation/${record.id}`)
      const json = await res.json()
      if (res.ok && json.success) {
        setCurrentQuotation(json.data)
      } else {
        setCurrentQuotation(record) // 降级方案
      }
    } catch (e) {
      console.error('获取报价详情失败:', e)
      setCurrentQuotation(record) // 降级方案
    }
    setViewDrawerOpen(true)
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/quotation/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (res.ok && json.success) {
      showSuccess('删除成功')
      fetchData()
    } else {
      showError(json.error?.message || '删除失败')
    }
  }

  const handleApproval = async () => {
    const values = await approvalForm.validateFields()
    // 自动附加当前用户作为审批人
    const submitData = {
      ...values,
      approver: session?.user?.id,
      submitterName: session?.user?.name || session?.user?.email || '未知用户'
    }

    const res = await fetch(`/api/quotation/${currentQuotation!.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submitData),
    })

    if (res.ok) {
      showSuccess('审批提交成功')
      setApprovalModalOpen(false)
      fetchData()
      setViewDrawerOpen(false)
    } else {
      const error = await res.json()
      showError(error.message || '审批失败')
    }
  }

  const handleClientResponse = async (response: string) => {
    await fetch(`/api/quotation/${currentQuotation!.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientResponse: response }),
    })
    showSuccess('客户反馈更新成功')
    fetchData()
    setViewDrawerOpen(false)
  }

  // ===== 新功能处理函数 =====

  // 提交审批
  const handleSubmitApproval = async () => {
    if (selectedRows.length !== 1) {
      showWarningMessage('请选择一条记录')
      return
    }

    // 检查用户登录状态
    if (!session?.user?.id) {
      showError('无法获取用户信息，请刷新页面或重新登录')
      return
    }

    const quotation = selectedRows[0]
    if (quotation.status !== 'draft') {
      showWarningMessage('只有草稿状态可以提交审批')
      return
    }
    const res = await fetch(`/api/quotation/${quotation.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'submit',
        approver: session.user.id,
        submitterName: session.user.name || session.user.email || '未知用户',
        comment: ''
      }),
    })
    if (res.ok) {
      showSuccess('已提交审批')
      setSelectedRowKeys([])
      setSelectedRows([])
      fetchData()
    } else {
      const error = await res.json()
      showError(error.message || '提交失败')
    }
  }

  // 生成PDF
  const handleGeneratePDF = () => {
    if (selectedRows.length !== 1) {
      showWarningMessage('请选择一条记录')
      return
    }
    window.open(`/api/quotation/${selectedRows[0].id}/pdf`, '_blank')
  }

  // 归档
  const handleArchive = async () => {
    if (selectedRows.length === 0) {
      showWarningMessage('请选择记录')
      return
    }
    // 检查状态，只有已批准或已拒绝的可以归档
    const invalidRows = selectedRows.filter(row => !['approved', 'rejected'].includes(row.status))
    if (invalidRows.length > 0) {
      const invalidNos = invalidRows.map(r => r.quotationNo).join(', ')
      showWarningMessage(`以下报价单无法归档：${invalidNos}。当前仅支持“已批准”或“已拒绝”状态的单据进行归档。`)
      return
    }

    try {
      for (const row of selectedRows) {
        const res = await fetch(`/api/quotation/${row.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'archived' }),
        })
        if (!res.ok) {
          const error = await res.json()
          showError(error.message || `归档失败: ${row.quotationNo}`)
          return
        }
      }
      showSuccess('已归档')
      setSelectedRowKeys([])
      setSelectedRows([])
      fetchData()
    } catch (error) {
      showError('归档失败，请重试')
      console.error('Archive error:', error)
    }
  }

  // 打开客户反馈弹窗
  const handleOpenFeedback = () => {
    if (selectedRows.length !== 1) {
      showWarningMessage('请选择一条记录')
      return
    }
    feedbackForm.resetFields()
    setFeedbackModalOpen(true)
  }

  // 提交客户反馈
  const handleFeedbackSubmit = async () => {
    const values = await feedbackForm.validateFields()
    await fetch(`/api/quotation/${selectedRows[0].id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientResponse: values.clientResponse,
        status: values.clientResponse === 'ok' ? 'archived' : 'rejected',
      }),
    })
    showSuccess('客户反馈已保存')
    setFeedbackModalOpen(false)
    setSelectedRowKeys([])
    setSelectedRows([])
    fetchData()
  }

  // 打开生成合同页面
  const handleOpenContract = () => {
    if (selectedRows.length !== 1) {
      showWarningMessage('请选择一条报价单')
      return
    }
    const quotation = selectedRows[0]
    if (quotation.status !== 'approved') {
      showWarningMessage('只有已批准的报价单可以生成合同')
      return
    }
    router.push(`/entrustment/contract/create?quotationId=${quotation.id}`)
  }

  // 针对单条记录的处理函数
  const handleSubmitApprovalForRecord = async (record: Quotation) => {
    if (!session?.user?.id) {
      showError('无法获取用户信息，请刷新页面或重新登录')
      return
    }
    if (record.status !== 'draft') {
      showWarningMessage('只有草稿状态可以提交审批')
      return
    }
    const res = await fetch(`/api/quotation/${record.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'submit',
        approver: session.user.id,
        submitterName: session.user.name || session.user.email || '未知用户',
        comment: ''
      }),
    })
    if (res.ok) {
      showSuccess('已提交审批')
      fetchData()
    } else {
      const error = await res.json()
      showError(error.message || '提交失败')
    }
  }

  const handleOpenContractForRecord = (record: Quotation) => {
    if (record.status !== 'approved') {
      showWarningMessage('只有已批准的报价单可以生成合同')
      return
    }
    router.push(`/entrustment/contract/create?quotationId=${record.id}`)
  }

  // 打印报价单
  const handlePrint = async (record: Quotation) => {
    try {
      const res = await fetch(`/api/quotation/${record.id}`)
      const json = await res.json()
      if (res.ok && json.success) {
        setPrintData(json.data)
        setTimeout(() => {
          window.print()
        }, 300)
      } else {
        showError('获取报价详情失败')
      }
    } catch (e) {
      console.error('打印失败:', e)
      showError('打印失败')
    }
  }

  const columns: ColumnsType<Quotation> = [
    { title: '报价单号', dataIndex: 'quotationNo', width: 150 },
    {
      title: '咨询单号',
      dataIndex: 'consultationNo',
      width: 140,
      render: (no: string) => no ? (
        <a
          style={{ color: '#1890ff' }}
          onClick={() => router.push(`/entrustment/consultation?id=${no}`)}
        >
          {no}
        </a>
      ) : '-'
    },
    {
      title: '客户名称',
      dataIndex: 'client',
      ellipsis: true,
      render: (client: Client) => client?.name || '-'
    },
    {
      title: '报价金额',
      dataIndex: 'finalAmount',
      width: 120,
      render: (v) => v ? `¥${Number(v).toFixed(2)}` : '-',
    },
    {
      title: '客户反馈',
      dataIndex: 'clientResponse',
      width: 100,
      render: (s: string) => <StatusTag type="quotation_client" status={s} />,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 150,
      render: (s: string, record: any) => (
        <div>
          {/* 如果是pending状态且有currentApproverName，显示"待XXX审批" */}
          {s.startsWith('pending_') && record.currentApproverName ? (
            <StatusTag type="quotation" status={s} text={`待${record.currentApproverName}审批`} color="processing" />
          ) : (
            <StatusTag type="quotation" status={s} />
          )}
          {s === 'rejected' && record.lastRejectReason && (
            <Tooltip title={record.lastRejectReason}>
              <div style={{ fontSize: 11, color: '#f5222d', marginTop: 4, maxWidth: 120 }} className="truncate">
                原因: {record.lastRejectReason}
              </div>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: '报告时间',
      dataIndex: 'clientReportDeadline',
      width: 120,
      render: (t: string) => {
        if (!t) return '-'
        const deadline = dayjs(t)
        const now = dayjs()
        const daysUntil = deadline.diff(now, 'day')

        let color = '#52c41a' // 绿色 - 正常
        if (daysUntil < 0) color = '#f5222d' // 红色 - 过期
        else if (daysUntil <= 7) color = '#fa8c16' // 橙色 - 7天内

        return <span style={{ color, fontWeight: daysUntil < 0 ? 'bold' : 'normal' }}>{deadline.format('YYYY-MM-DD')}</span>
      },
    },
    {
      title: '创建日期',
      dataIndex: 'createdAt',
      width: 160,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm:ss'),
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
      onCell: () => ({ style: { whiteSpace: 'nowrap' as const } }),
      onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' as const } }),
      render: (_, record) => {
        const canAudit = (
          (record.status === 'pending_sales' && session?.user?.roles?.includes('sales_manager')) ||
          (record.status === 'pending_finance' && session?.user?.roles?.includes('finance')) ||
          (record.status === 'pending_lab' && session?.user?.roles?.includes('lab_director'))
        )

        // 判断是否为审批中状态（任意pending状态）
        const isPending = record.status.startsWith('pending_') || record.status === 'pending'

        return (
          <Space size="small" style={{ whiteSpace: 'nowrap' }}>
            {/* 业务按钮（带文字） */}
            {record.status === 'draft' && (
              <Button size="small" icon={<SendOutlined />} onClick={() => handleSubmitApprovalForRecord(record)}>提交审批</Button>
            )}

            {/* 生成委托单按钮（只对approved状态） */}
            <Tooltip title={record.status !== 'approved' ? '需审批通过后才能生成委托单' : ''}>
              <CreateEntrustmentButton
                quotationId={record.id}
                quotationStatus={record.status as any}
                onSuccess={() => {
                  showSuccess('委托单创建成功')
                  fetchData()
                }}
                buttonText="生成委托单"
                icon={<FileTextOutlined />}
                size="small"
                type="default"
              />
            </Tooltip>


            {/* 审批操作已移至"工作台-审批中心"统一处理 */}

            {record.status === 'approved' && (
              <Button size="small" icon={<FolderOutlined />} onClick={() => handleOpenContractForRecord(record)}>生成合同</Button>
            )}

            {/* 通用按钮（仅图标） */}
            <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record)} />
            <Button size="small" icon={<PrinterOutlined />} onClick={() => handlePrint(record)} title="打印" />
            <Tooltip title={record.status !== 'draft' ? '仅草稿状态可编辑' : ''}>
              <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} disabled={record.status !== 'draft'} />
            </Tooltip>
            <Tooltip title={record.status !== 'draft' ? '仅草稿状态可删除' : ''}>
              <Popconfirm title="确认删除" onConfirm={() => handleDelete(record.id)} disabled={record.status !== 'draft'}>
                <Button size="small" danger icon={<DeleteOutlined />} disabled={record.status !== 'draft'} />
              </Popconfirm>
            </Tooltip>
          </Space>
        )
      },
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>报价管理</h2>
        <Space style={{ whiteSpace: 'nowrap' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增报价</Button>
        </Space>
      </div>

      {/* 筛选条件 */}
      <div style={{ background: '#f5f5f5', padding: 16, marginBottom: 16, borderRadius: 4 }}>
        <Form layout="inline" onFinish={(values) => { setFilters(values); setPage(1); fetchData(1, values) }}>
          <Form.Item name="keyword" label="关键词">
            <Input placeholder="报价单号/客户/联系人" allowClear />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select placeholder="全部" allowClear style={{ width: 140 }}>
              {STATUS_OPTIONS.map(opt => (
                <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="clientResponse" label="客户反馈">
            <Select placeholder="全部" allowClear style={{ width: 120 }}>
              {CLIENT_RESPONSE_OPTIONS.map(opt => (
                <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
              ))}
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
        scroll={{ x: 1600 }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys, rows) => {
            setSelectedRowKeys(keys)
            setSelectedRows(rows)
          },
        }}
        pagination={{ current: page, total, pageSize: 10, onChange: setPage, showSizeChanger: false }}
      />

      {/* 查看详情抽屉 */}
      <Drawer
        title="报价详情"
        placement="right"
        width={700}
        open={viewDrawerOpen}
        onClose={() => setViewDrawerOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <Button onClick={() => setViewDrawerOpen(false)}>关闭</Button>
          </div>
        }
      >
        {currentQuotation && (
          <Tabs
            defaultActiveKey="1"
            items={[
              {
                key: '1',
                label: '报价详情',
                children: (
                  <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', paddingRight: 8 }}>
                    <Descriptions column={2} bordered size="small">
                      <Descriptions.Item label="报价单号">{currentQuotation.quotationNo}</Descriptions.Item>
                      <Descriptions.Item label="客户名称">{currentQuotation.client?.name || '-'}</Descriptions.Item>
                      <Descriptions.Item label="联系人">{currentQuotation.clientContactPerson || '-'}</Descriptions.Item>
                      <Descriptions.Item label="联系电话">{currentQuotation.clientPhone || currentQuotation.client?.phone || '-'}</Descriptions.Item>
                      <Descriptions.Item label="客户邮箱">{currentQuotation.clientEmail || currentQuotation.client?.email || '-'}</Descriptions.Item>
                      <Descriptions.Item label="客户地址">{currentQuotation.clientAddress || currentQuotation.client?.address || '-'}</Descriptions.Item>
                      <Descriptions.Item label="跟单人">{(currentQuotation as any).followerUser?.name || '-'}</Descriptions.Item>
                      <Descriptions.Item label="服务联系人">{currentQuotation.serviceContact || '-'}</Descriptions.Item>
                      <Descriptions.Item label="报告时间">
                        {currentQuotation.clientReportDeadline ? dayjs(currentQuotation.clientReportDeadline).format('YYYY-MM-DD') : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="创建日期">
                        {dayjs(currentQuotation.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                      </Descriptions.Item>
                      <Descriptions.Item label="有效期">{currentQuotation.validDays}天</Descriptions.Item>
                      <Descriptions.Item label="报价合计">¥{Number(currentQuotation.totalAmount || 0).toFixed(2)}</Descriptions.Item>
                      <Descriptions.Item label="税额">¥{Number(currentQuotation.taxAmount || 0).toFixed(2)}</Descriptions.Item>
                      <Descriptions.Item label="含税合计">¥{Number(currentQuotation.totalWithTax || 0).toFixed(2)}</Descriptions.Item>
                      <Descriptions.Item label="优惠金额">
                        {currentQuotation.discountAmount ? `¥${currentQuotation.discountAmount}` : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="最终金额" style={{ fontWeight: 'bold', color: '#f5222d' }}>
                        ¥{Number(currentQuotation.finalAmount || 0).toFixed(2)}
                      </Descriptions.Item>
                      <Descriptions.Item label="状态">
                        <StatusTag type="quotation" status={currentQuotation.status} />
                      </Descriptions.Item>
                      <Descriptions.Item label="客户反馈">
                        <StatusTag type="quotation_client" status={currentQuotation.clientResponse} />
                      </Descriptions.Item>
                    </Descriptions>

                    <Divider orientationMargin="0">报价明细</Divider>
                    <Table
                      columns={[
                        { title: '检测项目', dataIndex: 'serviceItem' },
                        { title: '方法/标准', dataIndex: 'methodStandard' },
                        { title: '数量', dataIndex: 'quantity' },
                        { title: '单价', dataIndex: 'unitPrice', render: (v: number) => `¥${v}` },
                        { title: '小计', dataIndex: 'totalPrice', render: (v: number) => `¥${Number(v || 0).toFixed(2)}` },
                      ]}
                      dataSource={currentQuotation.items}
                      rowKey="id"
                      pagination={false}
                      size="small"
                    />

                    {currentQuotation.paymentTerms && (
                      <>
                        <Divider orientationMargin="0">付款与交付</Divider>
                        <p><strong>付款方式：</strong>{currentQuotation.paymentTerms}</p>
                        {currentQuotation.deliveryTerms && <p><strong>交付方式：</strong>{currentQuotation.deliveryTerms}</p>}
                      </>
                    )}

                    {currentQuotation.remark && (
                      <>
                        <Divider orientationMargin="0">备注</Divider>
                        <p>{currentQuotation.remark}</p>
                      </>
                    )}
                  </div>
                )
              },
              {
                key: '2',
                label: '审批记录',
                children: (
                  <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                    <QuotationApprovalRecords quotation={currentQuotation} />
                  </div>
                )
              }
            ]}
          />
        )}
      </Drawer>

      {/* 审批模态框 */}
      <Modal
        title="审批"
        open={approvalModalOpen}
        onOk={handleApproval}
        onCancel={() => setApprovalModalOpen(false)}
      >
        <Form form={approvalForm} layout="vertical">
          <Form.Item name="action" label="审批结果" rules={[{ required: true }]} initialValue="approve">
            <Radio.Group>
              <Radio value="approve">通过</Radio>
              <Radio value="reject">拒绝</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="comment" label="审批意见">
            <Input.TextArea rows={4} placeholder="请输入审批意见" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 客户反馈弹窗 */}
      <Modal
        title="客户反馈处理"
        open={feedbackModalOpen}
        onOk={handleFeedbackSubmit}
        onCancel={() => setFeedbackModalOpen(false)}
      >
        <Form form={feedbackForm} layout="vertical">
          <Form.Item
            name="clientResponse"
            label="反馈结果"
            rules={[{ required: true, message: '请选择反馈结果' }]}
          >
            <Radio.Group>
              <Radio value="ok">客户确认OK</Radio>
              <Radio value="ng">客户拒绝(NG)</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="attachmentUrl" label="上传盖章合同">
            <Upload maxCount={1} accept=".pdf,.jpg,.png">
              <Button icon={<UploadOutlined />}>选择合同文件</Button>
            </Upload>
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
              支持PDF、JPG、PNG格式，文件大小不超过10MB
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* 🆕 新功能：驳回对话框 */}
      <RejectModal
        visible={rejectModalVisible}
        documentId={selectedQuotationForReject?.id || ''}
        documentType="quotation"
        onSuccess={() => {
          fetchData()
          setSelectedQuotationForReject(null)
        }}
        onCancel={() => {
          setRejectModalVisible(false)
          setSelectedQuotationForReject(null)
        }}
      />

      {/* 打印隐藏区域 */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          #quotation-print-area, #quotation-print-area * { visibility: visible !important; }
          #quotation-print-area { position: absolute; left: 0; top: 0; width: 100%; display: block !important; }
        }
      `}</style>
      <div id="quotation-print-area" style={{ display: 'none' }}>
        {printData && <QuotationPrint data={printData} />}
      </div>
    </div>
  )
}
