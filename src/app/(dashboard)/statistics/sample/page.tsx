'use client'

import { useState, useEffect } from 'react'
import { Card, Row, Col, Table, Progress } from 'antd'
import type { ColumnsType } from 'antd/es/table'

const sampleStatusText: Record<string, string> = {
    received: '已收样',
    testing: '检测中',
    completed: '已完成',
    returned: '已归还',
    destroyed: '已销毁',
}

interface Stats {
    sampleStatusDist?: Array<{ status: string; count: number }>
    monthlyTrend?: Array<{ month: string; samples: number }>
}

export default function SampleStatisticsPage() {
    const [stats, setStats] = useState<Stats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/statistics?type=full')
            .then((res) => res.json())
            .then((data) => {
                setStats(data.success ? data.data : data)
                setLoading(false)
            })
    }, [])

    return (
        <div>
            <h2 style={{ marginBottom: 24 }}>样品统计</h2>
            <Row gutter={16}>
                <Col span={12}>
                    <Card title="样品状态分布" size="small" loading={loading}>
                        {stats?.sampleStatusDist?.map((item) => {
                            const total = stats.sampleStatusDist?.reduce((a, b) => a + b.count, 0) || 1
                            const percent = Math.round((item.count / total) * 100)
                            return (
                                <div key={item.status} style={{ marginBottom: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span>{sampleStatusText[item.status] || item.status}</span>
                                        <span>{item.count} ({percent}%)</span>
                                    </div>
                                    <Progress percent={percent} showInfo={false} strokeColor="#52c41a" />
                                </div>
                            )
                        })}
                    </Card>
                </Col>
                <Col span={12}>
                    <Card title="样品月度接收趋势" size="small" loading={loading}>
                        <Table
                            rowKey="month"
                            columns={[
                                { title: '月份', dataIndex: 'month' },
                                { title: '接收数量', dataIndex: 'samples' },
                                {
                                    title: '趋势',
                                    key: 'trend',
                                    render: (_: unknown, record: { samples: number }) => (
                                        <div style={{ width: record.samples * 5, height: 16, background: '#52c41a', borderRadius: 2 }} />
                                    ),
                                },
                            ]}
                            dataSource={stats?.monthlyTrend || []}
                            pagination={false}
                            size="small"
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    )
}
