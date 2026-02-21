'use client'

import { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, Progress } from 'antd'

const deviceStatusText: Record<string, string> = {
    Running: '运行中',
    Maintenance: '维护中',
    Idle: '空闲',
    Scrapped: '已报废',
}

interface Stats {
    financeStats?: {
        totalReceivable: number
        totalReceived: number
        monthReceived: number
        yearReceived: number
        pendingInvoice: number
    }
    deviceStats?: Array<{ status: string; count: number }>
}

export default function FinanceStatisticsPage() {
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

    const totalReceivable = Number(stats?.financeStats?.totalReceivable || 0)
    const totalReceived = Number(stats?.financeStats?.totalReceived || 0)
    const completionPercent = Math.round((totalReceived / (totalReceivable || 1)) * 100)

    return (
        <div>
            <h2 style={{ marginBottom: 24 }}>财务统计</h2>

            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                    <Card size="small" loading={loading}>
                        <Statistic
                            title="应收总额"
                            value={totalReceivable}
                            precision={2}
                            prefix="¥"
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card size="small" loading={loading}>
                        <Statistic
                            title="已收总额"
                            value={totalReceived}
                            precision={2}
                            prefix="¥"
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card size="small" loading={loading}>
                        <Statistic
                            title="本月收款"
                            value={Number(stats?.financeStats?.monthReceived || 0)}
                            precision={2}
                            prefix="¥"
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card size="small" loading={loading}>
                        <Statistic
                            title="本年收款"
                            value={Number(stats?.financeStats?.yearReceived || 0)}
                            precision={2}
                            prefix="¥"
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
            </Row>

            <Row gutter={16}>
                <Col span={12}>
                    <Card title="收款完成率" size="small" loading={loading}>
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <Progress
                                type="circle"
                                percent={completionPercent}
                                format={(percent) => `${percent}%`}
                            />
                            <div style={{ marginTop: 16 }}>
                                <p>待收金额：¥{(totalReceivable - totalReceived).toLocaleString()}</p>
                                <p>待开票数：{stats?.financeStats?.pendingInvoice || 0}</p>
                            </div>
                        </div>
                    </Card>
                </Col>
                <Col span={12}>
                    <Card title="设备状态分布" size="small" loading={loading}>
                        {stats?.deviceStats?.map((item) => {
                            const total = stats.deviceStats?.reduce((a, b) => a + b.count, 0) || 1
                            const percent = Math.round((item.count / total) * 100)
                            const colors: Record<string, string> = {
                                Running: '#52c41a',
                                Maintenance: '#faad14',
                                Idle: '#1890ff',
                                Scrapped: '#ff4d4f',
                            }
                            return (
                                <div key={item.status} style={{ marginBottom: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span>{deviceStatusText[item.status] || item.status}</span>
                                        <span>{item.count} ({percent}%)</span>
                                    </div>
                                    <Progress percent={percent} showInfo={false} strokeColor={colors[item.status] || '#1890ff'} />
                                </div>
                            )
                        })}
                    </Card>
                </Col>
            </Row>
        </div>
    )
}
