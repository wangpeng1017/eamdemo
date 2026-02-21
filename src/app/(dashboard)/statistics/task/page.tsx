'use client'

import { useState, useEffect } from 'react'
import { Card, Row, Col, Table, Progress } from 'antd'
import type { ColumnsType } from 'antd/es/table'

const taskStatusText: Record<string, string> = {
    pending: '待开始',
    in_progress: '进行中',
    completed: '已完成',
    transferred: '已转交',
}

interface Stats {
    taskStatusDist?: Array<{ status: string; count: number }>
    assigneeStats?: Array<{ assignee: string; count: number }>
}

export default function TaskStatisticsPage() {
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

    const assigneeColumns: ColumnsType<{ assignee: string; count: number }> = [
        { title: '排名', key: 'rank', width: 60, render: (_, __, i) => i + 1 },
        { title: '人员', dataIndex: 'assignee' },
        { title: '任务数', dataIndex: 'count', width: 80 },
        {
            title: '工作量',
            key: 'workload',
            width: 150,
            render: (_, record) => {
                const max = Math.max(...(stats?.assigneeStats?.map((a) => a.count) || [1]))
                const percent = Math.round((record.count / max) * 100)
                return <Progress percent={percent} size="small" strokeColor="#52c41a" />
            },
        },
    ]

    return (
        <div>
            <h2 style={{ marginBottom: 24 }}>任务统计</h2>
            <Row gutter={16}>
                <Col span={12}>
                    <Card title="任务状态分布" size="small" loading={loading}>
                        {stats?.taskStatusDist?.map((item) => {
                            const total = stats.taskStatusDist?.reduce((a, b) => a + b.count, 0) || 1
                            const percent = Math.round((item.count / total) * 100)
                            const colors: Record<string, string> = {
                                pending: '#faad14',
                                in_progress: '#1890ff',
                                completed: '#52c41a',
                                transferred: '#722ed1',
                            }
                            return (
                                <div key={item.status} style={{ marginBottom: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span>{taskStatusText[item.status] || item.status}</span>
                                        <span>{item.count} ({percent}%)</span>
                                    </div>
                                    <Progress percent={percent} showInfo={false} strokeColor={colors[item.status] || '#1890ff'} />
                                </div>
                            )
                        })}
                    </Card>
                </Col>
                <Col span={12}>
                    <Card title="人员任务量排行 Top 10" size="small" loading={loading}>
                        <Table
                            rowKey="assignee"
                            columns={assigneeColumns}
                            dataSource={stats?.assigneeStats || []}
                            pagination={false}
                            size="small"
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    )
}
