'use client'

import { useState, useEffect } from 'react'
import { Card, Row, Col, Table, Progress } from 'antd'
import type { ColumnsType } from 'antd/es/table'

interface Stats {
    monthlyTrend?: Array<{ month: string; entrustments: number; samples: number; reports: number }>
    topClients?: Array<{ clientName: string; count: number }>
}

export default function EntrustmentStatisticsPage() {
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

    const trendColumns: ColumnsType<{ month: string; entrustments: number; samples: number; reports: number }> = [
        { title: '月份', dataIndex: 'month', width: 100 },
        { title: '委托数', dataIndex: 'entrustments', width: 80 },
        { title: '样品数', dataIndex: 'samples', width: 80 },
        { title: '报告数', dataIndex: 'reports', width: 80 },
        {
            title: '趋势',
            key: 'trend',
            render: (_, record) => (
                <div style={{ display: 'flex', gap: 4 }}>
                    <div style={{ width: record.entrustments * 3, height: 16, background: '#1890ff', borderRadius: 2 }} />
                </div>
            ),
        },
    ]

    const clientColumns: ColumnsType<{ clientName: string; count: number }> = [
        { title: '排名', key: 'rank', width: 60, render: (_, __, i) => i + 1 },
        { title: '客户名称', dataIndex: 'clientName', ellipsis: true },
        { title: '委托数', dataIndex: 'count', width: 80 },
        {
            title: '占比',
            key: 'percent',
            width: 150,
            render: (_, record) => {
                const total = stats?.topClients?.reduce((a, b) => a + b.count, 0) || 1
                const percent = Math.round((record.count / total) * 100)
                return <Progress percent={percent} size="small" />
            },
        },
    ]

    return (
        <div>
            <h2 style={{ marginBottom: 24 }}>委托统计</h2>
            <Row gutter={16}>
                <Col span={12}>
                    <Card title="月度委托趋势（近6个月）" size="small" loading={loading}>
                        <Table
                            rowKey="month"
                            columns={trendColumns}
                            dataSource={stats?.monthlyTrend || []}
                            pagination={false}
                            size="small"
                        />
                    </Card>
                </Col>
                <Col span={12}>
                    <Card title="客户委托排行 Top 10" size="small" loading={loading}>
                        <Table
                            rowKey="clientName"
                            columns={clientColumns}
                            dataSource={stats?.topClients || []}
                            pagination={false}
                            size="small"
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    )
}
