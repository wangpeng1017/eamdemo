'use client'

import { Steps, Tag, Typography, Space, Card } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, UserOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

const { Text } = Typography

interface ApprovalRecord {
    id: string
    step: number
    action: 'approve' | 'reject'
    approverId: string
    approverName: string
    comment?: string | null
    createdAt: string
}

interface ApprovalTimelineProps {
    // 审批流程节点配置
    nodes?: Array<{
        step: number
        name: string
        role?: string
    }>
    // 当前审批步骤
    currentStep: number
    // 审批状态: pending | approved | rejected | cancelled
    status: string
    // 审批记录
    records?: ApprovalRecord[]
    // 提交人信息
    submitterName?: string
    submittedAt?: string
}

// 默认审批节点配置
const DEFAULT_NODES = [
    { step: 1, name: '销售审批', role: '销售经理' },
    { step: 2, name: '财务审批', role: '财务' },
]

/**
 * 审批流程时间线组件
 * 展示完整的审批节点状态和审批记录
 */
export function ApprovalTimeline({
    nodes = DEFAULT_NODES,
    currentStep,
    status,
    records = [],
    submitterName,
    submittedAt,
}: ApprovalTimelineProps) {
    // 根据节点和状态计算每个步骤的状态
    const getStepStatus = (step: number) => {
        // 审批被拒绝,当前步骤显示error
        if (status === 'rejected' && step === currentStep) {
            return 'error'
        }
        // 已审批通过的步骤
        if (step < currentStep) {
            return 'finish'
        }
        // 当前正在审批的步骤
        if (step === currentStep && status === 'pending') {
            return 'process'
        }
        // 全部通过
        if (status === 'approved') {
            return 'finish'
        }
        // 未到的步骤
        return 'wait'
    }

    // 获取步骤对应的审批记录
    const getRecordForStep = (step: number) => {
        return records.find(r => r.step === step)
    }

    // 渲染步骤描述
    const renderStepDescription = (node: typeof nodes[0]) => {
        const record = getRecordForStep(node.step)
        const stepStatus = getStepStatus(node.step)

        if (record) {
            return (
                <div style={{ marginTop: 8 }}>
                    <Space direction="vertical" size={2}>
                        <Space size={4}>
                            <Tag color={record.action === 'approve' ? 'success' : 'error'} style={{ margin: 0 }}>
                                {record.action === 'approve' ? '已通过' : '已驳回'}
                            </Tag>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {dayjs(record.createdAt).format('MM-DD HH:mm')}
                            </Text>
                        </Space>
                        <Text style={{ fontSize: 12 }}>
                            <UserOutlined style={{ marginRight: 4 }} />
                            {record.approverName}
                        </Text>
                        {record.comment && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                意见: {record.comment}
                            </Text>
                        )}
                    </Space>
                </div>
            )
        }

        if (stepStatus === 'process') {
            return (
                <div style={{ marginTop: 8 }}>
                    <Tag color="processing">待审批</Tag>
                </div>
            )
        }

        if (stepStatus === 'wait') {
            return (
                <div style={{ marginTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>待前序节点完成</Text>
                </div>
            )
        }

        return null
    }

    // 生成Steps的items
    const stepsItems = [
        // 提交节点
        {
            title: '提交审批',
            description: submitterName ? (
                <div style={{ marginTop: 8 }}>
                    <Space direction="vertical" size={2}>
                        <Tag color="blue" style={{ margin: 0 }}>已提交</Tag>
                        <Text style={{ fontSize: 12 }}>
                            <UserOutlined style={{ marginRight: 4 }} />
                            {submitterName}
                        </Text>
                        {submittedAt && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {dayjs(submittedAt).format('MM-DD HH:mm')}
                            </Text>
                        )}
                    </Space>
                </div>
            ) : null,
            status: 'finish' as const,
            icon: <CheckCircleOutlined />,
        },
        // 审批节点
        ...nodes.map(node => ({
            title: node.name,
            description: renderStepDescription(node),
            status: getStepStatus(node.step) as 'wait' | 'process' | 'finish' | 'error',
            icon: getStepStatus(node.step) === 'error'
                ? <CloseCircleOutlined />
                : getStepStatus(node.step) === 'process'
                    ? <ClockCircleOutlined />
                    : undefined,
        })),
        // 完成节点
        {
            title: '审批完成',
            description: status === 'approved' ? (
                <Tag color="success" style={{ marginTop: 8 }}>已通过</Tag>
            ) : status === 'rejected' ? (
                <Tag color="error" style={{ marginTop: 8 }}>已驳回</Tag>
            ) : null,
            status: (status === 'approved' ? 'finish' : status === 'rejected' ? 'error' : 'wait') as 'wait' | 'process' | 'finish' | 'error',
        },
    ]

    return (
        <Card size="small" style={{ background: '#fafafa' }}>
            <Steps
                direction="vertical"
                size="small"
                current={status === 'approved' ? stepsItems.length - 1 : currentStep}
                items={stepsItems}
            />
        </Card>
    )
}
