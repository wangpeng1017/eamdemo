'use client'

import { useEffect, useState } from 'react'
import { showSuccess, showError } from '@/lib/confirm'
import { Table, Card, Tabs, Tag, Button, Space, Tooltip } from 'antd'
import { CheckCircleOutlined, EyeOutlined, ExperimentOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import SampleItemAssessmentModal from '@/components/SampleItemAssessmentModal'

interface SampleTestItem {
    id: string
    sampleName: string | null
    testItemName: string | null
    testStandard: string | null
    quantity: number | null
    material: string | null
    assessmentStatus: string | null
    currentAssessorId: string | null
    currentAssessorName: string | null
    currentAssessor: string | null
    assessedAt: string | null
    feasibility: string | null
    feasibilityNote: string | null
    consultationId: string
    consultationNo: string
    clientName: string
    createdAt: string
}

interface PendingGroup {
    consultationId: string
    consultationNo: string
    clientName: string
    createdAt: string
    sampleTestItems: SampleTestItem[]
}

export default function AssessmentCenterPage() {
    const { data: session } = useSession()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState('pending')

    // 数据状态
    const [pendingItems, setPendingItems] = useState<SampleTestItem[]>([])
    const [assessedItems, setAssessedItems] = useState<SampleTestItem[]>([])

    // 评估弹窗状态
    const [assessmentModalOpen, setAssessmentModalOpen] = useState(false)
    const [currentItem, setCurrentItem] = useState<SampleTestItem | null>(null)

    useEffect(() => {
        if (session?.user) {
            fetchAssessmentData()
        }
    }, [session])

    const fetchAssessmentData = async () => {
        setLoading(true)
        try {
            // 获取待评估数据
            const pendingRes = await fetch('/api/consultation/assessment/my-pending')
            if (pendingRes.ok) {
                const json = await pendingRes.json()
                const groups: PendingGroup[] = json.data || []
                // 展平为单条记录
                const items = groups.flatMap(g =>
                    g.sampleTestItems.map(item => ({
                        ...item,
                        consultationId: g.consultationId,
                        consultationNo: g.consultationNo,
                        clientName: g.clientName,
                        createdAt: g.createdAt,
                    }))
                )
                setPendingItems(items)
            }

            // 获取已评估数据（当前用户评估过的）
            const assessedRes = await fetch('/api/consultation/assessment/my-history?status=assessed')
            if (assessedRes.ok) {
                const json = await assessedRes.json()
                setAssessedItems(json.data || [])
            }
        } catch (error) {
            console.error('获取评估数据失败:', error)
        } finally {
            setLoading(false)
        }
    }

    const getStatusTag = (status: string | null) => {
        const statusMap: Record<string, { color: string; text: string }> = {
            pending: { color: 'default', text: '待评估' },
            assessing: { color: 'processing', text: '评估中' },
            passed: { color: 'success', text: '已通过' },
            failed: { color: 'error', text: '不可行' },
        }
        const info = statusMap[status || ''] || { color: 'default', text: status || '-' }
        return <Tag color={info.color}>{info.text}</Tag>
    }

    const getFeasibilityTag = (feasibility: string | null) => {
        const map: Record<string, { color: string; text: string }> = {
            feasible: { color: 'success', text: '可行' },
            difficult: { color: 'warning', text: '有难度' },
            infeasible: { color: 'error', text: '不可行' },
        }
        if (!feasibility) return '-'
        const info = map[feasibility] || { color: 'default', text: feasibility }
        return <Tag color={info.color}>{info.text}</Tag>
    }

    const handleAssess = (item: SampleTestItem) => {
        setCurrentItem(item)
        setAssessmentModalOpen(true)
    }

    // 待评估列配置
    const pendingColumns: ColumnsType<SampleTestItem> = [
        {
            title: '咨询单号',
            dataIndex: 'consultationNo',
            key: 'consultationNo',
            width: 140,
            render: (no: string, record) => (
                <a onClick={() => router.push(`/entrustment/consultation`)}>{no}</a>
            ),
        },
        {
            title: '客户',
            dataIndex: 'clientName',
            key: 'clientName',
            width: 120,
            ellipsis: true,
        },
        {
            title: '样品名称',
            dataIndex: 'sampleName',
            key: 'sampleName',
            width: 120,
            render: (v: string | null) => v || '-',
        },
        {
            title: '检测项目',
            dataIndex: 'testItemName',
            key: 'testItemName',
            width: 150,
            render: (v: string | null) => v || '-',
        },
        {
            title: '检测标准',
            dataIndex: 'testStandard',
            key: 'testStandard',
            width: 150,
            ellipsis: true,
            render: (v: string | null) => v || '-',
        },
        {
            title: '状态',
            dataIndex: 'assessmentStatus',
            key: 'assessmentStatus',
            width: 100,
            render: (status: string | null) => getStatusTag(status),
        },
        {
            title: '创建时间',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 160,
            render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
        },
        {
            title: '操作',
            key: 'action',
            fixed: 'right',
            width: 100,
            render: (_, record) => (
                <Button
                    type="primary"
                    size="small"
                    icon={<CheckCircleOutlined />}
                    onClick={() => handleAssess(record)}
                >
                    评估
                </Button>
            ),
        },
    ]

    // 已评估/已驳回列配置
    const historyColumns: ColumnsType<SampleTestItem> = [
        {
            title: '咨询单号',
            dataIndex: 'consultationNo',
            key: 'consultationNo',
            width: 140,
        },
        {
            title: '客户',
            dataIndex: 'clientName',
            key: 'clientName',
            width: 120,
            ellipsis: true,
        },
        {
            title: '样品名称',
            dataIndex: 'sampleName',
            key: 'sampleName',
            width: 120,
            render: (v: string | null) => v || '-',
        },
        {
            title: '检测项目',
            dataIndex: 'testItemName',
            key: 'testItemName',
            width: 150,
            render: (v: string | null) => v || '-',
        },
        {
            title: '可行性',
            dataIndex: 'feasibility',
            key: 'feasibility',
            width: 100,
            render: (v: string | null) => getFeasibilityTag(v),
        },
        {
            title: '评估说明',
            dataIndex: 'feasibilityNote',
            key: 'feasibilityNote',
            width: 200,
            ellipsis: true,
            render: (v: string | null) => v || '-',
        },
        {
            title: '评估时间',
            dataIndex: 'assessedAt',
            key: 'assessedAt',
            width: 160,
            render: (date: string | null) => date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-',
        },
        {
            title: '状态',
            dataIndex: 'assessmentStatus',
            key: 'assessmentStatus',
            width: 100,
            render: (status: string | null) => getStatusTag(status),
        },
    ]

    const tabItems = [
        {
            key: 'pending',
            label: `待评估 (${pendingItems.length})`,
            children: (
                <Table
                    columns={pendingColumns}
                    dataSource={pendingItems}
                    loading={loading}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 1100 }}
                />
            ),
        },
        {
            key: 'assessed',
            label: `已评估 (${assessedItems.length})`,
            children: (
                <Table
                    columns={historyColumns}
                    dataSource={assessedItems}
                    loading={loading}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 1100 }}
                />
            ),
        },
    ]

    return (
        <div>
            <Card
                title={
                    <Space>
                        <ExperimentOutlined />
                        <span>评估中心</span>
                    </Space>
                }
                bordered={false}
            >
                <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
            </Card>

            <SampleItemAssessmentModal
                open={assessmentModalOpen}
                sampleItem={currentItem}
                onCancel={() => {
                    setAssessmentModalOpen(false)
                    setCurrentItem(null)
                }}
                onSuccess={() => {
                    setAssessmentModalOpen(false)
                    setCurrentItem(null)
                    fetchAssessmentData()
                }}
            />
        </div>
    )
}
