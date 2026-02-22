// @file: 业务咨询登记页面
// @input: /api/consultation, /api/client
// @output: 咨询CRUD、生成报价
// @pos: 委托流程入口页 - 客户首次咨询
// ⚠️ 更新我时，请同步更新本注释及 entrustment/_INDEX.md

'use client'

import React, { useState, useEffect } from 'react'
import { Table, Button, Space, Modal, Form, Input, Select, DatePicker, Drawer, Row, Col, InputNumber, Divider, Tabs, Upload, Image, Tag, Alert, Descriptions, Popconfirm, Tooltip } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, FileTextOutlined, CloseCircleOutlined, TeamOutlined, SyncOutlined, PaperClipOutlined } from '@ant-design/icons'
import { StatusTag } from '@/components/StatusTag'
import UserSelect from '@/components/UserSelect'
import SampleTestItemTable, { SampleTestItemData } from '@/components/SampleTestItemTable'
import SampleItemAssessmentDetailsTab from '@/components/SampleItemAssessmentDetailsTab'
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
  clientPhone?: string | null
  clientEmail?: string | null
  clientAddress?: string | null
  clientRequirement?: string | null // Added
  estimatedQuantity?: string | null
  testItems?: string[]
  expectedDeadline?: string | null
  clientReportDeadline?: string | null
  budgetRange?: string | null
  feasibility?: string | null
  feasibilityNote?: string | null
  followerId?: string | null
  followerUser?: { id: string; name: string } | null
  quotationNo?: string | null
  quotationId?: string | null
  status: string
  createdAt: string
}

const FEASIBILITY_OPTIONS = [
  { value: 'feasible', label: '可行' },
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
    try {
      const res = await fetch(`/api/consultation/${record.id}`)
      const json = await res.json()
      if (json.success && json.data) {
        setCurrentConsultation(json.data)
      } else {
        setCurrentConsultation(record)
      }
    } catch (error) {
      console.error('获取咨询详情失败:', error)
      setCurrentConsultation(record)
    }
    setViewDrawerOpen(true)
  }

  const handleDelete = async (record: Consultation) => {
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
    console.log('>>> [生成报价单] 开始处理, ID:', consultation.id);

    // ✅ 前置状态检查：不允许在已报价/已关闭状态下重复生成
    if (consultation.status === 'quoted') {
      modal.info({
        title: '已生成报价单',
        content: (
          <div>
            <p>该咨询单已生成报价单{consultation.quotationNo ? `（${consultation.quotationNo}）` : ''}，无需重复操作。</p>
            <p style={{ color: '#999', marginTop: 8 }}>如需修改报价，请前往「检测报价」模块编辑对应的报价单。</p>
          </div>
        ),
        okText: '知道了',
      })
      return
    }

    if (consultation.status === 'closed') {
      modal.info({
        title: '咨询已关闭',
        content: '该咨询单已关闭，无法生成报价单。如需继续，请先重新打开咨询单。',
        okText: '知道了',
      })
      return
    }

    // ✅ 需求1：评估验证 - 检查所有样品检测项是否已评估通过
    try {
      const res = await fetch(`/api/consultation/${consultation.id}`)
      const result = await res.json()

      console.log('>>> [生成报价单] API 返回结果:', result);

      if (!res.ok || !result.success) {
        console.error('>>> [生成报价单] API 报错:', result);
        showError('获取咨询详情失败：无法加载咨询单信息')
        return
      }

      const data = result.data
      if (!data) {
        console.error('>>> [生成报价单] 数据 (result.data) 为空');
        showError('获取咨询详情失败：返回数据为空')
        return
      }

      const items = data.sampleTestItems || []
      console.log('>>> [生成报价单] 样品项明细 (sampleTestItems):', items);

      // 检查是否有未评估或评估未通过的项
      const unfinishedItems = items.filter(
        (item: any) => item.assessmentStatus !== 'passed'
      )

      console.log('>>> [生成报价单] 过滤出的未完成项:', unfinishedItems);

      if (unfinishedItems.length > 0) {
        console.log('>>> [生成报价单] 命中拦截，准备弹出原生警告(Hook版)');

        // 使用 Hook 方式调用，确保上下文正确
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
          okText: '知道了'
        });
        return;
      }

      // ✅ 验证通过，跳转到新建报价单页面
      console.log('>>> [生成报价单] 验证通过，正在跳转...');
      router.push(`/entrustment/quotation/create?consultationId=${consultation.id}`)

    } catch (error: any) {
      console.error('❌ [生成报价单] 捕获到异常:', error)
      showError(`操作失败: ${error.message || '未知错误'}`)
    }
  }

  // v2: "发起评估"功能已废弃，评估人在创建时通过样品检测项分配

  // 重新评估
  const handleReassessment = (consultation: Consultation) => {
    router.push(`/entrustment/consultation/edit/${consultation.id}?reassess=1`)
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
      width: 200,
      ellipsis: true,
      render: (_, record) => record.client?.name || '-'
    },
    {
      title: '检测项目',
      dataIndex: 'testItems',
      width: 250,
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
      dataIndex: 'clientReportDeadline',
      width: 180,
      render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD HH:mm:ss') : '-'
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 180,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '提交人',
      dataIndex: ['createdBy', 'name'],
      width: 100,
      render: (v: string) => v || '-'
    },
    {
      title: '联系人/电话',
      width: 160,
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
          <Tooltip title={
            record.status === 'quoted' ? `已生成报价单${record.quotationNo ? '（' + record.quotationNo + '）' : ''}` :
              record.status === 'closed' ? '咨询已关闭' : ''
          }>
            <Button
              size="small"
              type={record.status === 'quoted' || record.status === 'closed' ? 'default' : 'primary'}
              ghost={record.status !== 'quoted' && record.status !== 'closed'}
              icon={<FileTextOutlined />}
              disabled={false}
              style={record.status === 'quoted' || record.status === 'closed' ? { opacity: 0.5 } : {}}
              onClick={(e) => {
                e.stopPropagation()
                handleOpenGenerateQuoteForRecord(record)
              }}
            >
              生成报价单
            </Button>
          </Tooltip>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record)} />
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          {record.status === 'quoted' ? (
            <Tooltip title="已生成报价，无法删除">
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                style={{ opacity: 0.5 }}
                onClick={(e) => {
                  e.stopPropagation()
                  modal.warning({
                    title: '无法删除',
                    content: `该咨询单已生成报价单${record.quotationNo ? '（' + record.quotationNo + '）' : ''}，请先处理相关报价单后再尝试删除，或将状态更改为"已关闭"。`,
                    okText: '知道了',
                  })
                }}
              />
            </Tooltip>
          ) : (
            <Popconfirm
              title={record.status === 'closed' ? '彻底删除咨询单' : '确认删除咨询单'}
              description={record.status === 'closed' ? '该咨询单已关闭，确定要彻底删除吗？删除后无法恢复' : '确定要删除这条咨询记录吗？'}
              onConfirm={() => handleDelete(record)}
              okText="确定"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          )}
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

  // 引入 useModal 钩子
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
        scroll={{ x: 1600 }}
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
                  <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', paddingRight: 8 }}>
                    <Descriptions title="委托方信息" bordered size="small" column={2}>
                      <Descriptions.Item label="咨询单号">{currentConsultation.consultationNo}</Descriptions.Item>
                      <Descriptions.Item label="客户名称">{currentConsultation.client?.name || '-'}</Descriptions.Item>
                      <Descriptions.Item label="联系人">{currentConsultation.clientContactPerson || '-'}</Descriptions.Item>
                      <Descriptions.Item label="联系电话">{currentConsultation.clientPhone || currentConsultation.client?.phone || '-'}</Descriptions.Item>
                      <Descriptions.Item label="客户邮箱" span={2}>{currentConsultation.clientEmail || currentConsultation.client?.email || '-'}</Descriptions.Item>
                      <Descriptions.Item label="客户地址" span={2}>{currentConsultation.clientAddress || currentConsultation.client?.address || '-'}</Descriptions.Item>
                    </Descriptions>

                    <Divider style={{ margin: '16px 0' }} />

                    <Descriptions title="其他信息" bordered size="small" column={2}>
                      {currentConsultation.estimatedQuantity ? <Descriptions.Item label="预估数量">{currentConsultation.estimatedQuantity}</Descriptions.Item> : null}
                      {currentConsultation.testItems && currentConsultation.testItems.length > 0 ? <Descriptions.Item label="检测项目">{currentConsultation.testItems.join('、')}</Descriptions.Item> : null}
                      {(currentConsultation.clientReportDeadline || currentConsultation.expectedDeadline) ? (
                        <Descriptions.Item label="报告时间">
                          {dayjs(currentConsultation.clientReportDeadline || currentConsultation.expectedDeadline).format('YYYY-MM-DD')}
                        </Descriptions.Item>
                      ) : null}
                      {currentConsultation.budgetRange ? <Descriptions.Item label="预算范围">{currentConsultation.budgetRange}</Descriptions.Item> : null}
                      {currentConsultation.feasibility ? (
                        <Descriptions.Item label="可行性评估">
                          <StatusTag type="feasibility" status={currentConsultation.feasibility} />
                        </Descriptions.Item>
                      ) : null}
                      {currentConsultation.feasibilityNote ? <Descriptions.Item label="可行性说明">{currentConsultation.feasibilityNote}</Descriptions.Item> : null}
                      <Descriptions.Item label="跟单人">{currentConsultation.followerUser?.name || '-'}</Descriptions.Item>
                      <Descriptions.Item label="提交人">{(currentConsultation as any).createdBy?.name || '-'}</Descriptions.Item>
                      <Descriptions.Item label="状态">
                        <StatusTag type="consultation" status={currentConsultation.status} />
                      </Descriptions.Item>
                      <Descriptions.Item label="创建时间" span={2}>
                        {dayjs(currentConsultation.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                      </Descriptions.Item>
                    </Descriptions>

                    <Divider style={{ margin: '16px 0' }} orientation="left">样品检测项</Divider>
                    <SampleTestItemTable
                      bizType="consultation"
                      bizId={currentConsultation.id}
                      value={(currentConsultation as any).sampleTestItems}
                      readonly={true}
                    />
                  </div>
                )
              },
              {
                key: 'assessment',
                label: '评估结果',
                children: (
                  <SampleItemAssessmentDetailsTab
                    consultationId={currentConsultation.id}
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
    </div>
  )
}

