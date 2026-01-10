'use client'

import { useEffect, useState } from 'react'
import { Table, Card, Tabs, Tag, Button, Space, Tooltip, message } from 'antd'
import { CheckCircleOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

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
    totalAmount: string
  }
  contract?: {
    contractNo: string
    amount: string
  }
  client?: {
    name: string
    shortName: string
  }
}

export default function ApprovalPage() {
  const [loading, setLoading] = useState(false)
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalInstance[]>([])
  const [myApprovals, setMyApprovals] = useState<ApprovalInstance[]>([])
  const [activeTab, setActiveTab] = useState('pending')

  useEffect(() => {
    fetchApprovals()
  }, [])

  const fetchApprovals = async () => {
    setLoading(true)
    try {
      // 获取待我审批的数据
      const pendingRes = await fetch('/api/approval?status=pending')
      if (pendingRes.ok) {
        const data = await pendingRes.json()
        setPendingApprovals(data.data || [])
      }

      // 获取我提交的审批
      const myRes = await fetch('/api/approval?submitterId=admin')
      if (myRes.ok) {
        const data = await myRes.json()
        setMyApprovals(data.data || [])
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
          approverId: 'admin', // 简化处理，实际应从 auth 获取
          approverName: '系统管理员'
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
          return record.quotation.quotationNo
        }
        if (record.bizType === 'contract' && record.contract) {
          return record.contract.contractNo
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
