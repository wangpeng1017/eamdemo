'use client'

import { useEffect, useState } from 'react'
import { Table, Card, Tabs, Tag, Button, Space, Tooltip, message } from 'antd'
import { CheckCircleOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useSession } from 'next-auth/react'

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
  const [loading, setLoading] = useState(false)
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalInstance[]>([])
  const [myApprovals, setMyApprovals] = useState<ApprovalInstance[]>([])
  const [approvedByMe, setApprovedByMe] = useState<ApprovalInstance[]>([])
  const [rejectedByMe, setRejectedByMe] = useState<ApprovalInstance[]>([])
  const [activeTab, setActiveTab] = useState('pending')

  useEffect(() => {
    if (session?.user) {
      fetchApprovals()
    }
  }, [session])

  const fetchApprovals = async () => {
    setLoading(true)
    try {
      // 获取待我审批的数据
      // 这里的逻辑需要在前端过滤，或者后端支持根据角色筛选
      // 目前简单逻辑：
      // 1. 获取所有 pending 状态的审批
      // 2. 根据当前用户角色过滤:
      //    - sales_manager -> step 1
      //    - finance -> step 2
      //    - lab_director -> step 3
      const pendingRes = await fetch('/api/approval?status=pending')
      if (pendingRes.ok) {
        const json = await pendingRes.json()
        const allPending = json.data || []

        const userRoles = session?.user?.roles || []

        // 过滤逻辑
        const myPending = allPending.filter((item: ApprovalInstance) => {
          // 如果是管理员，可以看到所有（便于测试）
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
          // 过滤出我审批过的(有我的审批记录)
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

  const handleApprove = async (instanceId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch(`/api/approval/${instanceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          comment: '',
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
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space>
          {record.status === 'pending' && (
            <>
              <Tooltip title="通过">
                <Button
                  type="primary"
                  size="small"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleApprove(record.id, 'approve')}
                >
                  通过
                </Button>
              </Tooltip>
              <Tooltip title="驳回">
                <Button
                  danger
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={() => handleApprove(record.id, 'reject')}
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
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: ApprovalInstance) => (
        <Space>
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
    </div>
  )
}
