// @file: 检测合同管理页面
// @input: /api/contract, /api/client, /api/user
// @output: 合同CRUD、生成PDF、生成委托单
// @pos: 委托流程核心页 - 报价后签合同
// ⚠️ 更新我时，请同步更新本注释及 entrustment/_INDEX.md

'use client'

import { useState, useEffect } from 'react'
import { showSuccess, showError, showWarningMessage } from '@/lib/confirm'
import { Table, Button, Space, Form, Input, Select, Drawer, Tag, Popconfirm, Tabs, Descriptions, Divider } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, FileTextOutlined, FilePdfOutlined, FileAddOutlined } from '@ant-design/icons'
import { StatusTag } from '@/components/StatusTag'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useRouter } from 'next/navigation'

interface Contract {
  id: string
  contractNo: string
  contractName: string | null
  quotationId?: string | null
  quotationNo?: string | null
  partyACompany: string | null  // 甲方公司名称
  clientName?: string | null  // 兼容字段，从 client.name 或 partyACompany 获取
  clientContact?: string | null
  clientPhone?: string | null
  clientAddress?: string | null
  amount: number | null
  prepaymentAmount?: number | null
  prepaymentRatio?: number | null
  signDate: string | null
  startDate: string | null
  endDate: string | null
  paymentTerms?: string | null
  deliveryTerms?: string | null
  qualityTerms?: string | null
  confidentialityTerms?: string | null
  breachTerms?: string | null
  disputeTerms?: string | null
  otherTerms?: string | null
  attachmentUrl?: string | null
  remark?: string | null
  status: string
  createdAt: string
  items?: ContractItem[]
  client?: {
    id: string
    name: string
    contact?: string
    phone?: string
    address?: string
  }
}

interface ContractItem {
  id?: string
  serviceItem: string
  methodStandard: string
  quantity: number
  unitPrice: number
  totalPrice: number
  sort?: number
}

interface Client {
  id: string
  name: string
  shortName?: string
  contact?: string
  phone?: string
  email?: string
  address?: string
}

const STATUS_OPTIONS = [
  { value: 'draft', label: '草稿' },
  { value: 'signed', label: '已签订' },
  { value: 'executing', label: '执行中' },
  { value: 'completed', label: '已完成' },
  { value: 'terminated', label: '已终止' },
]

export default function ContractPage() {
  const router = useRouter()
  const [data, setData] = useState<Contract[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  // State
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false)
  const [currentContract, setCurrentContract] = useState<Contract | null>(null)
  const [filters, setFilters] = useState<any>({})
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  const fetchData = async (p = page, f = filters) => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(p),
      pageSize: '10',
      ...Object.fromEntries(Object.entries(f).filter(([_, v]) => v !== undefined && v !== '')),
    })
    const res = await fetch(`/api/contract?${params}`)
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

  useEffect(() => { fetchData() }, [page])
  const handleAdd = () => {
    router.push('/entrustment/contract/create')
  }

  const handleEdit = (record: Contract) => {
    router.push(`/entrustment/contract/edit/${record.id}`)
  }

  const handleView = (record: Contract) => {
    setCurrentContract(record)
    setViewDrawerOpen(true)
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/contract/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (res.ok && json.success) {
      showSuccess('删除成功')
      fetchData()
    } else {
      showError(json.error?.message || '删除失败')
    }
  }

  const handleStatusChange = async (status: string) => {
    if (!currentContract) return
    await fetch(`/api/contract/${currentContract.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    showSuccess('状态更新成功')
    fetchData()
    setViewDrawerOpen(false)
  }

  const handleGeneratePDF = () => {
    if (selectedRowKeys.length !== 1) {
      showWarningMessage('请选择一条合同记录')
      return
    }
    const contract = data.find(c => c.id === selectedRowKeys[0])
    if (!contract) return

    window.open(`/api/contract/${contract.id}/pdf`, '_blank')
  }


  const handleGenerateEntrustment = async () => {
    if (selectedRowKeys.length !== 1) {
      showWarningMessage('请选择一条合同记录')
      return
    }
    const contract = data.find(c => c.id === selectedRowKeys[0])
    if (!contract) return

    // 获取报价单检测项目
    let testProjects: { name: string; method: string }[] = []
    if (contract.quotationId) {
      try {
        const res = await fetch(`/api/quotation/${contract.quotationId}`)
        const json = await res.json()
        if (json.success && json.data?.items) {
          testProjects = json.data.items.map((item: { serviceItem: string; methodStandard: string }) => ({
            name: item.serviceItem,
            method: item.methodStandard,
          }))
        }
      } catch (e) {
        console.error('[Contract] 获取报价单失败:', e)
        showError('获取报价单失败：无法加载报价单数据，请重试')
      }
    }

    const params = new URLSearchParams({
      contractId: contract.id, // 添加合同ID用于复制样品检测项
      contractNo: contract.contractNo,
      clientName: contract.partyACompany || contract.client?.name || contract.clientName || '',
      contactPerson: contract.clientContact || '',
      contactPhone: contract.clientPhone || '',
      clientAddress: contract.clientAddress || '',
    })

    // 如果有检测项目，通过 URL 参数传递
    if (testProjects.length > 0) {
      params.set('projects', JSON.stringify(testProjects))
    }

    // 传递报告时间和跟单人
    if ((contract as any).clientReportDeadline) {
      params.set('clientReportDeadline', (contract as any).clientReportDeadline)
    }
    if ((contract as any).followerId) {
      params.set('followerId', (contract as any).followerId)
    }

    router.push(`/entrustment/list/create?${params.toString()}`)
    setSelectedRowKeys([])
  }

  const columns: ColumnsType<Contract> = [
    { title: '合同编号', dataIndex: 'contractNo', width: 150 },
    {
      title: '报价单号',
      dataIndex: 'quotationNo',
      width: 140,
      render: (no: string) => no ? (
        <a style={{ color: '#1890ff' }}>{no}</a>
      ) : '-'
    },
    {
      title: '客户名称',
      dataIndex: 'partyACompany',
      width: 150,
      ellipsis: true,
      render: (_, record) => record.partyACompany || record.client?.name || record.clientName || '-'
    },
    {
      title: '合同金额',
      dataIndex: 'amount',
      width: 120,
      render: (v) => v ? `¥${v.toLocaleString()}` : '-',
    },
    {
      title: '预付款比例',
      dataIndex: 'prepaymentRatio',
      width: 110,
      render: (v) => v ? `${v}%` : '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD HH:mm:ss') : '-',
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
      title: '合同期限',
      key: 'period',
      width: 160,
      render: (_, record) => {
        const start = record.startDate ? dayjs(record.startDate).format('MM-DD') : '-'
        const end = record.endDate ? dayjs(record.endDate).format('YYYY-MM-DD HH:mm:ss') : '-'
        return `${start} ~ ${end}`
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s: string) => <StatusTag type="contract" status={s} />,
    },
    {
      title: '联系人/电话',
      width: 140,
      render: (_, record) => (
        <div>
          <div>{record.clientContact || '-'}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{record.clientPhone || '-'}</div>
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
          {/* 业务按钮（带文字） */}
          <Button size="small" icon={<FilePdfOutlined />} onClick={() => {
            window.open(`/api/contract/${record.id}/pdf`, '_blank')
          }}>生成PDF</Button>
          <Button size="small" icon={<FileAddOutlined />} onClick={() => {
            // 生成委托单逻辑
            const params = new URLSearchParams({
              contractId: record.id, // 添加合同ID用于复制样品检测项
              contractNo: record.contractNo,
              clientName: record.partyACompany || record.client?.name || record.clientName || '',
              contactPerson: record.clientContact || '',
              contactPhone: record.clientPhone || '',
              clientAddress: record.clientAddress || '',
            })
            // 传递报告时间和跟单人
            if ((record as any).clientReportDeadline) {
              params.set('clientReportDeadline', (record as any).clientReportDeadline)
            }
            if ((record as any).followerId) {
              params.set('followerId', (record as any).followerId)
            }
            router.push(`/entrustment/list/create?${params.toString()}`)
          }}>生成委托单</Button>
          {/* 通用按钮（仅图标） */}
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record)} />
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="确认删除" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>合同管理</h2>
        <Space style={{ whiteSpace: 'nowrap' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增合同</Button>
        </Space>
      </div>

      {/* 筛选条件 */}
      <div style={{ background: '#f5f5f5', padding: 16, marginBottom: 16, borderRadius: 4 }}>
        <Form layout="inline" onFinish={(values) => { setFilters(values); setPage(1); fetchData(1, values) }}>
          <Form.Item name="keyword" label="关键词">
            <Input placeholder="合同编号/客户名称" allowClear />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select placeholder="全部" allowClear style={{ width: 120 }}>
              {STATUS_OPTIONS.map(opt => (
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
        pagination={{ current: page, total, pageSize: 10, onChange: setPage, showSizeChanger: false }}
        rowSelection={{
          type: 'radio',
          selectedRowKeys,
          onChange: (selectedKeys) => setSelectedRowKeys(selectedKeys),
        }}
      />

      {/* 查看详情抽屉 */}
      <Drawer
        title="合同详情"
        placement="right"
        width={700}
        open={viewDrawerOpen}
        onClose={() => setViewDrawerOpen(false)}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Space style={{ whiteSpace: 'nowrap' }}>
              {currentContract?.status === 'signed' && (
                <Button type="primary" onClick={() => handleStatusChange('executing')}>开始执行</Button>
              )}
              {currentContract?.status === 'executing' && (
                <Button type="primary" onClick={() => handleStatusChange('completed')}>标记为完成</Button>
              )}
              {!['draft', 'completed', 'terminated'].includes(currentContract?.status || '') && (
                <Button danger onClick={() => handleStatusChange('terminated')}>终止合同</Button>
              )}
            </Space>
            <Button onClick={() => setViewDrawerOpen(false)}>关闭</Button>
          </div>
        }
      >
        {currentContract && (
          <Tabs
            items={[
              {
                key: 'basic',
                label: '基本信息',
                children: (
                  <div>
                    <Descriptions column={2} bordered size="small">
                      <Descriptions.Item label="合同编号">{currentContract.contractNo}</Descriptions.Item>
                      <Descriptions.Item label="客户名称">
                        {currentContract.partyACompany || currentContract.client?.name || currentContract.clientName || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="明细项数">共 {currentContract.items?.length || 0} 项</Descriptions.Item>
                      <Descriptions.Item label="合计金额">¥{Number(currentContract.amount || 0).toLocaleString()}</Descriptions.Item>
                      <Descriptions.Item label="联系人">{currentContract.clientContact}</Descriptions.Item>
                      <Descriptions.Item label="联系电话">{currentContract.clientPhone}</Descriptions.Item>
                      <Descriptions.Item label="客户地址" span={2}>{currentContract.clientAddress || '-'}</Descriptions.Item>
                      <Descriptions.Item label="合同金额" style={{ fontWeight: 'bold', color: '#f5222d' }}>
                        ¥{currentContract.amount?.toLocaleString()}
                      </Descriptions.Item>
                      <Descriptions.Item label="预付款比例">{currentContract.prepaymentRatio}%</Descriptions.Item>
                      <Descriptions.Item label="预付款金额">
                        ¥{currentContract.prepaymentAmount?.toLocaleString()}
                      </Descriptions.Item>
                      <Descriptions.Item label="签订日期">
                        {currentContract.signDate ? dayjs(currentContract.signDate).format('YYYY-MM-DD') : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="合同开始日期">
                        {currentContract.startDate ? dayjs(currentContract.startDate).format('YYYY-MM-DD') : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="合同结束日期">
                        {currentContract.endDate ? dayjs(currentContract.endDate).format('YYYY-MM-DD') : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="状态">
                        <StatusTag type="contract" status={currentContract.status} />
                      </Descriptions.Item>
                      <Descriptions.Item label="创建日期">
                        {dayjs(currentContract.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                      </Descriptions.Item>
                    </Descriptions>

                    {currentContract.attachmentUrl && (
                      <>
                        <Divider orientationMargin="0">附件</Divider>
                        <Button icon={<FileTextOutlined />}>
                          <a href={currentContract.attachmentUrl} target="_blank" rel="noopener noreferrer">
                            查看盖章合同
                          </a>
                        </Button>
                      </>
                    )}
                  </div>
                ),
              },
              {
                key: 'items',
                label: '报价明细',
                children: (
                  <Table
                    dataSource={currentContract.items || []}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    columns={[
                      { title: '检测项目', dataIndex: 'serviceItem' },
                      { title: '方法/标准', dataIndex: 'methodStandard' },
                      { title: '数量', dataIndex: 'quantity', width: 80 },
                      { title: '单价', dataIndex: 'unitPrice', width: 100, render: v => `¥${Number(v).toFixed(2)}` },
                      { title: '总价', dataIndex: 'totalPrice', width: 100, render: v => `¥${Number(v).toFixed(2)}` },
                    ]}
                  />
                )
              },
              {
                key: 'terms',
                label: '合同条款',
                children: (
                  <div>
                    {currentContract.paymentTerms && (
                      <>
                        <h4 style={{ marginBottom: 8 }}>付款条款</h4>
                        <p style={{ marginBottom: 16, background: '#f5f5f5', padding: 12 }}>{currentContract.paymentTerms}</p>
                      </>
                    )}
                    {currentContract.deliveryTerms && (
                      <>
                        <h4 style={{ marginBottom: 8 }}>交付条款</h4>
                        <p style={{ marginBottom: 16, background: '#f5f5f5', padding: 12 }}>{currentContract.deliveryTerms}</p>
                      </>
                    )}
                    {currentContract.qualityTerms && (
                      <>
                        <h4 style={{ marginBottom: 8 }}>质量条款</h4>
                        <p style={{ marginBottom: 16, background: '#f5f5f5', padding: 12 }}>{currentContract.qualityTerms}</p>
                      </>
                    )}
                    {currentContract.confidentialityTerms && (
                      <>
                        <h4 style={{ marginBottom: 8 }}>保密条款</h4>
                        <p style={{ marginBottom: 16, background: '#f5f5f5', padding: 12 }}>{currentContract.confidentialityTerms}</p>
                      </>
                    )}
                    {currentContract.breachTerms && (
                      <>
                        <h4 style={{ marginBottom: 8 }}>违约责任</h4>
                        <p style={{ marginBottom: 16, background: '#f5f5f5', padding: 12 }}>{currentContract.breachTerms}</p>
                      </>
                    )}
                    {currentContract.disputeTerms && (
                      <>
                        <h4 style={{ marginBottom: 8 }}>争议解决</h4>
                        <p style={{ marginBottom: 16, background: '#f5f5f5', padding: 12 }}>{currentContract.disputeTerms}</p>
                      </>
                    )}
                    {currentContract.otherTerms && (
                      <>
                        <h4 style={{ marginBottom: 8 }}>其他条款</h4>
                        <p style={{ marginBottom: 16, background: '#f5f5f5', padding: 12 }}>{currentContract.otherTerms}</p>
                      </>
                    )}
                    {!currentContract.paymentTerms && !currentContract.deliveryTerms && !currentContract.qualityTerms &&
                      !currentContract.confidentialityTerms && !currentContract.breachTerms && !currentContract.disputeTerms && !currentContract.otherTerms && (
                        <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>暂无合同条款</div>
                      )}
                  </div>
                ),
              },
            ]}
          />
        )}
      </Drawer>
    </div>
  )
}
