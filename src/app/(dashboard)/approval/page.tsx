'use client'

import { useEffect, useState } from 'react'
import { Table, Card, Tabs, Tag, Button, Space, Tooltip, message, Modal, Input } from 'antd'
import { CheckCircleOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface ApprovalInstance {
  id: string
  bizType: string
  bizId: string
  flowCode: string
  currentStep: number
  status: string
  submitterId: string
  submitterName: string
  submittedAt: string
  createdAt: string
  updatedAt: string
  // 关联的业务数据
  quotation?: {
    quotationNo: string
    subtotal: string
    taxTotal: string
  }
  contract?: {
    contractNo: string
    contractAmount: string
  }
  client?: {
    name: string
    shortName: string
  }
}

export default function ApprovalPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalInstance[]>([])
  const [myApprovals, setMyApprovals] = useState<ApprovalInstance[]>([])
  const [approvedByMe, setApprovedByMe] = useState<ApprovalInstance[]>([])
  const [rejectedByMe, setRejectedByMe] = useState<ApprovalInstance[]>([])
  const [activeTab, setActiveTab] = useState('pending')

  // 通过弹窗状态
  const [approveModalOpen, setApproveModalOpen] = useState(false)
  const [approveItemId, setApproveItemId] = useState('')
  const [approveLoading, setApproveLoading] = useState(false)

  // 驳回弹窗状态
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectItemId, setRejectItemId] = useState('')
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    if (session?.user) {
      fetchApprovals()
    }
  }, [session])

  const fetchApprovals = async () => {
    setLoading(true)
    try {
      // 获取待我审批的数据
      const pendingRes = await fetch('/api/approval?status=pending')
      if (pendingRes.ok) {
        const json = await pendingRes.json()
        const allPending = json.data || []
        const userRoles = session?.user?.roles || []

        const myPending = allPending.filter((item: ApprovalInstance) => {
          if (userRoles.includes('admin')) return true
          if (item.currentStep === 1 && userRoles.includes('sales_manager')) return true
          if (item.currentStep === 2 && userRoles.includes('finance')) return true
          if (item.currentStep === 3 && userRoles.includes('lab_director')) return true
          return false
        })

        setPendingApprovals(myPending)
      }

      // 获取我提交的审批
      if (session?.user?.id) {
        const myRes = await fetch(`/api/approval?submitterId=${session.user.id}`)
        if (myRes.ok) {
          const data = await myRes.json()
          setMyApprovals(data.data || [])
        }

        // 获取我已审批通过的数据
        const approvedRes = await fetch(`/api/approval?status=approved`)
        if (approvedRes.ok) {
          const data = await approvedRes.json()
          const allApproved = data.data || []
          setApprovedByMe(allApproved)
        }

        // 获取我已驳回的数据
        const rejectedRes = await fetch(`/api/approval?status=rejected`)
        if (rejectedRes.ok) {
          const data = await rejectedRes.json()
          const allRejected = data.data || []
          setRejectedByMe(allRejected)
        }
      }
    } catch (error) {
      console.error('获取审批列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (instanceId: string, action: 'approve' | 'reject', comment: string = '') => {
    try {
      const response = await fetch(`/api/approval/${instanceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          comment,
          approverId: session?.user?.id,
          approverName: session?.user?.name || '审批人'
        }),
      })
      if (response.ok) {
        message.success(action === 'approve' ? '审批通过' : '已驳回')
        fetchApprovals()
      } else {
        const data = await response.json()
        message.error(data.error || '操作失败')
      }
    } catch {
      message.error('操作失败')
    }
  }

  const getBizTypeTag = (bizType: string) => {
    const typeMap: Record<string, { color: string; text: string }> = {
      quotation: { color: 'blue', text: '报价单' },
      contract: { color: 'green', text: '合同' },
      client: { color: 'orange', text: '委托单位' },
    }
    const info = typeMap[bizType] || { color: 'default', text: bizType }
    return <Tag color={info.color}>{info.text}</Tag>
  }

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      pending: { color: 'processing', text: '审批中' },
      approved: { color: 'success', text: '已通过' },
      rejected: { color: 'error', text: '已驳回' },
      cancelled: { color: 'default', text: '已撤回' },
    }
    const info = statusMap[status] || { color: 'default', text: status }
    return <Tag color={info.color}>{info.text}</Tag>
  }

  const columns: ColumnsType<ApprovalInstance> = [
    {
      title: '业务类型',
      dataIndex: 'bizType',
      key: 'bizType',
      width: 120,
      render: (bizType: string) => getBizTypeTag(bizType),
    },
    {
      title: '业务编号',
      dataIndex: 'bizId',
      key: 'bizId',
      render: (bizId: string, record) => {
        if (record.bizType === 'quotation' && record.quotation) {
          const amount = Number(record.quotation.subtotal || 0) + Number(record.quotation.taxTotal || 0)
          return `${record.quotation.quotationNo} (¥${amount.toFixed(2)})`
        }
        if (record.bizType === 'contract' && record.contract) {
          return `${record.contract.contractNo} (¥${Number(record.contract.contractAmount || 0).toFixed(2)})`
        }
        if (record.bizType === 'client' && record.client) {
          return record.client.name
        }
        return bizId.substring(0, 8) + '...'
      },
    },
    {
      title: '提交人',
      dataIndex: 'submitterName',
      key: 'submitterName',
      width: 120,
    },
    {
      title: '当前步骤',
      dataIndex: 'currentStep',
      key: 'currentStep',
      width: 100,
      render: (step: number) => `第 ${step} 级`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '提交时间',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      width: 180,
      render: (date: string) => date ? new Date(date).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作', fixed: 'right',
      key: 'action',
      
      render: (_, record) => (
        <Space style={{ whiteSpace: 'nowrap' }}>
          {record.status === 'pending' && (
            <>
              <Tooltip title="通过">
                <Button
                  type="primary"
                  size="small"
                  icon={<CheckCircleOutlined />}
                  onClick={() => {
                    setApproveItemId(record.id)
                    setApproveModalOpen(true)
                  }}
                >
                  通过
                </Button>
              </Tooltip>
              <Tooltip title="驳回">
                <Button
                  danger
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={() => {
                    setRejectItemId(record.id)
                    setRejectReason('')
                    setRejectModalOpen(true)
                  }}
                >
                  驳回
                </Button>
              </Tooltip>
            </>
          )}
          <Tooltip title="查看详情">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                const path = record.bizType === 'quotation' ? '/entrustment/quotation'
                  : record.bizType === 'contract' ? '/entrustment/contract'
                    : record.bizType === 'client' ? '/entrustment/client'
                      : null
                if (path) router.push(path)
              }}
            >
              详情
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ]

  // 已审批记录的列配置(不显示通过/驳回按钮)
  const historyColumns = columns.filter(col => col.key !== 'action').concat([
    {
      title: '操作', fixed: 'right',
      key: 'action',
      
      render: (_: unknown, record: ApprovalInstance) => (
        <Space style={{ whiteSpace: 'nowrap' }}>
          <Tooltip title="查看详情">
            <Button
              size="small"
              icon={<EyeOutlined />}
            >
              详情
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ])

  const tabItems = [
    {
      key: 'pending',
      label: `待我审批 (${pendingApprovals.length})`,
      children: (
        <Table
          columns={columns}
          dataSource={pendingApprovals}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      ),
    },
    {
      key: 'approved',
      label: `已审批通过 (${approvedByMe.length})`,
      children: (
        <Table
          columns={historyColumns}
          dataSource={approvedByMe}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      ),
    },
    {
      key: 'rejected',
      label: `已审批驳回 (${rejectedByMe.length})`,
      children: (
        <Table
          columns={historyColumns}
          dataSource={rejectedByMe}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      ),
    },
    {
      key: 'my',
      label: `我的提交 (${myApprovals.length})`,
      children: (
        <Table
          columns={columns}
          dataSource={myApprovals}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      ),
    },
  ]

  return (
    <div>
      <Card title="审批中心" bordered={false}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>

      {/* 通过确认弹窗 */}
      <Modal
        title="确认审批通过"
        open={approveModalOpen}
        confirmLoading={approveLoading}
        onOk={async () => {
          setApproveLoading(true)
          try {
            await handleApprove(approveItemId, 'approve')
            setApproveModalOpen(false)
          } finally {
            setApproveLoading(false)
          }
        }}
        onCancel={() => setApproveModalOpen(false)}
        okText="确认通过"
        cancelText="取消"
      >
        <p>确认后将进入下一环节或完成审批。</p>
      </Modal>

      <Modal
        title="驳回审批"
        open={rejectModalOpen}
        onOk={async () => {
          if (!rejectReason.trim()) {
            message.error('请输入驳回原因')
            return
          }
          await handleApprove(rejectItemId, 'reject', rejectReason)
          setRejectModalOpen(false)
        }}
        onCancel={() => setRejectModalOpen(false)}
      >
        <Input.TextArea
          rows={4}
          placeholder="请输入驳回原因"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>
    </div>
  )
}
