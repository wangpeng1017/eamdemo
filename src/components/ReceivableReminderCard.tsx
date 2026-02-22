'use client'

/**
 * @file 工作台应收提醒卡片
 * @desc 显示逾期和即将到期的应收款
 */

import { useState, useEffect } from 'react'
import { Card, List, Tag, Space, Typography, Badge, Empty } from 'antd'
import { DollarOutlined, WarningOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dayjs from 'dayjs'

const { Text } = Typography

interface ReceivableReminder {
    id: string
    receivableNo: string
    clientName: string | null
    amount: number
    receivedAmount: number
    remaining: number
    dueDate: string
    status: string
    daysOverdue: number
}

interface ReminderData {
    overdue: ReceivableReminder[]
    dueSoon: ReceivableReminder[]
    overdueCount: number
    dueSoonCount: number
    totalCount: number
}

export default function ReceivableReminderCard() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<ReminderData>({
        overdue: [], dueSoon: [],
        overdueCount: 0, dueSoonCount: 0, totalCount: 0,
    })

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/dashboard/receivable-reminder')
            const json = await res.json()
            if (json.success) {
                setData(json.data)
            }
        } catch (e) {
            console.error('获取应收提醒失败:', e)
        }
        setLoading(false)
    }

    const allItems = [...data.overdue, ...data.dueSoon]

    return (
        <Card
            title={
                <Space>
                    <DollarOutlined />
                    <span>应收提醒</span>
                    {data.totalCount > 0 && (
                        <Badge count={data.totalCount} />
                    )}
                </Space>
            }
            extra={<Link href="/finance/receivable" style={{ color: '#1890ff' }}>查看全部</Link>}
            loading={loading}
        >
            {allItems.length === 0 ? (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="暂无逾期或即将到期的应收款"
                    style={{ padding: '20px 0' }}
                />
            ) : (
                <List
                    dataSource={allItems.slice(0, 5)}
                    renderItem={(item) => {
                        const isOverdue = item.daysOverdue > 0
                        return (
                            <List.Item
                                style={{ cursor: 'pointer' }}
                                onClick={() => router.push('/finance/receivable')}
                            >
                                <List.Item.Meta
                                    title={
                                        <Space>
                                            {isOverdue ? (
                                                <Tag color="error" icon={<WarningOutlined />}>
                                                    逾期{item.daysOverdue}天
                                                </Tag>
                                            ) : (
                                                <Tag color="warning" icon={<ClockCircleOutlined />}>
                                                    {Math.abs(item.daysOverdue)}天后到期
                                                </Tag>
                                            )}
                                            <Text strong>{item.clientName || '未知客户'}</Text>
                                        </Space>
                                    }
                                    description={
                                        <Space direction="vertical" size={0}>
                                            <Text type="secondary" style={{ fontSize: 13 }}>
                                                {item.receivableNo} · 待收 ¥{item.remaining.toLocaleString()}
                                            </Text>
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                到期日: {dayjs(item.dueDate).format('YYYY-MM-DD')}
                                            </Text>
                                        </Space>
                                    }
                                />
                            </List.Item>
                        )
                    }}
                />
            )}
            {data.overdueCount > 0 && (
                <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: '#ff4d4f' }}>
                    ⚠ 共 {data.overdueCount} 笔逾期，请及时跟进
                </div>
            )}
        </Card>
    )
}
