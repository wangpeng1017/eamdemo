'use client'

import { useState, useEffect, useCallback } from 'react'
import { Table, Card, Input, Select, Tag, Button, Space, Tooltip } from 'antd'
import { SearchOutlined, DownloadOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

// 委托单状态标签
const entrustmentStatusMap: Record<string, { text: string; color: string }> = {
    pending: { text: '待受理', color: 'default' },
    draft: { text: '草稿', color: 'default' },
    accepted: { text: '已受理', color: 'processing' },
    submitted: { text: '已提交', color: 'processing' },
    testing: { text: '检测中', color: 'blue' },
    completed: { text: '已完成', color: 'green' },
    archived: { text: '已归档', color: 'purple' },
}

// 客户报告状态标签
const reportStatusMap: Record<string, { text: string; color: string }> = {
    draft: { text: '草稿', color: 'default' },
    pending_review: { text: '待审核', color: 'processing' },
    pending_approve: { text: '待审批', color: 'warning' },
    approved: { text: '已审批', color: 'cyan' },
    issued: { text: '已发布', color: 'green' },
}

interface ReportItem {
    id: string
    reportNo: string
    status: string
    issuedDate: string | null
}

interface MyReportRow {
    id: string
    entrustmentNo: string
    clientName: string
    contractNo: string | null
    sampleNames: string
    entrustmentStatus: string
    createdAt: string
    hasReport: boolean
    reportCount: number
    reports: ReportItem[]
    latestReportStatus: string | null
    latestReportNo: string | null
    latestReportId: string | null
}

export default function MyReportPage() {
    const [data, setData] = useState<MyReportRow[]>([])
    const [loading, setLoading] = useState(false)
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [keyword, setKeyword] = useState('')
    const [reportStatus, setReportStatus] = useState<string | undefined>(undefined)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                pageSize: pageSize.toString(),
            })
            if (keyword) params.set('keyword', keyword)
            if (reportStatus) params.set('reportStatus', reportStatus)

            const res = await fetch(`/api/report/my?${params.toString()}`)
            const json = await res.json()
            if (json.success && json.data) {
                setData(json.data.list || [])
                setTotal(json.data.total || 0)
            }
        } catch (error) {
            console.error('获取我的报告失败:', error)
        } finally {
            setLoading(false)
        }
    }, [page, pageSize, keyword, reportStatus])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // 下载 PDF
    const handleDownloadPdf = async (reportId: string, reportNo: string) => {
        try {
            const res = await fetch(`/api/report/client/${reportId}/export/pdf`)
            if (!res.ok) throw new Error('下载失败')
            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${reportNo}.pdf`
            a.click()
            URL.revokeObjectURL(url)
        } catch (err) {
            console.error('下载 PDF 失败:', err)
        }
    }

    const columns = [
        {
            title: '委托编号',
            dataIndex: 'entrustmentNo',
            width: 130,
            render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
        },
        {
            title: '客户名称',
            dataIndex: 'clientName',
            width: 150,
            ellipsis: true,
        },
        {
            title: '样品信息',
            dataIndex: 'sampleNames',
            width: 150,
            ellipsis: true,
            render: (text: string) => text || '-',
        },
        {
            title: '委托状态',
            dataIndex: 'entrustmentStatus',
            width: 90,
            render: (status: string) => {
                const config = entrustmentStatusMap[status] || { text: status, color: 'default' }
                return <Tag color={config.color}>{config.text}</Tag>
            },
        },
        {
            title: '客户报告状态',
            width: 110,
            render: (_: unknown, record: MyReportRow) => {
                if (!record.hasReport) {
                    return <Tag>未生成</Tag>
                }
                const status = record.latestReportStatus || 'draft'
                const config = reportStatusMap[status] || { text: status, color: 'default' }
                return <Tag color={config.color}>{config.text}</Tag>
            },
        },
        {
            title: '报告编号',
            width: 130,
            render: (_: unknown, record: MyReportRow) => {
                if (!record.hasReport) return '-'
                return (
                    <Tooltip title={record.reportCount > 1 ? `共 ${record.reportCount} 份报告` : undefined}>
                        <span>{record.latestReportNo}</span>
                        {record.reportCount > 1 && <Tag style={{ marginLeft: 4 }}>+{record.reportCount - 1}</Tag>}
                    </Tooltip>
                )
            },
        },
        {
            title: '委托日期',
            dataIndex: 'createdAt',
            width: 100,
            render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
        },
        {
            title: '操作',
            width: 140,
            fixed: 'right' as const,
            render: (_: unknown, record: MyReportRow) => {
                if (!record.hasReport) return <span style={{ color: '#999' }}>暂无报告</span>
                return (
                    <Space size="small">
                        <Button
                            type="link"
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => window.open(`/report/client/${record.latestReportId}`, '_blank')}
                        >
                            查看
                        </Button>
                        {(record.latestReportStatus === 'approved' || record.latestReportStatus === 'issued') && (
                            <Button
                                type="link"
                                size="small"
                                icon={<DownloadOutlined />}
                                onClick={() => handleDownloadPdf(record.latestReportId!, record.latestReportNo!)}
                            >
                                下载
                            </Button>
                        )}
                    </Space>
                )
            },
        },
    ]

    return (
        <div style={{ padding: '0 24px 24px' }}>
            <Card bordered={false}>
                {/* 筛选栏 */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                    <Input
                        placeholder="搜索委托编号/客户名称"
                        prefix={<SearchOutlined />}
                        style={{ width: 240 }}
                        value={keyword}
                        onChange={e => setKeyword(e.target.value)}
                        onPressEnter={() => { setPage(1); fetchData() }}
                        allowClear
                    />
                    <Select
                        placeholder="报告状态"
                        style={{ width: 150 }}
                        allowClear
                        value={reportStatus}
                        onChange={v => { setReportStatus(v); setPage(1) }}
                        options={[
                            { value: 'none', label: '未生成' },
                            { value: 'draft', label: '草稿' },
                            { value: 'pending_review', label: '待审核' },
                            { value: 'pending_approve', label: '待审批' },
                            { value: 'approved', label: '已审批' },
                            { value: 'issued', label: '已发布' },
                        ]}
                    />
                    <Button icon={<ReloadOutlined />} onClick={() => { setPage(1); fetchData() }}>
                        刷新
                    </Button>
                </div>

                {/* 数据表格 */}
                <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={data}
                    loading={loading}
                    scroll={{ x: 1000 }}
                    pagination={{
                        current: page,
                        pageSize,
                        total,
                        showSizeChanger: true,
                        showTotal: t => `共 ${t} 条`,
                        onChange: (p, ps) => { setPage(p); setPageSize(ps) },
                    }}
                />
            </Card>
        </div>
    )
}
