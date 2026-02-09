'use client'

import { useState, useEffect } from 'react'
import { showSuccess, showError } from '@/lib/confirm'
import { Table, Button, Space, Tag, Card, Input, Select, Drawer, Descriptions, Tabs, Timeline } from 'antd'
import { EyeOutlined, PrinterOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useRouter } from 'next/navigation'

interface ClientReport {
    id: string
    reportNo: string
    projectName: string | null
    clientName: string
    sampleName: string
    sampleNo: string | null
    specification: string | null
    taskReportNos: string | null
    overallConclusion: string | null
    status: string
    preparer: string | null
    reviewer: string | null
    approver: string | null
    approvalFlow: string | null
    createdAt: string
    issuedDate: string | null
}

const statusMap: Record<string, { text: string; color: string }> = {
    draft: { text: '草稿', color: 'default' },
    pending_review: { text: '待审核', color: 'processing' },
    pending_approve: { text: '待批准', color: 'warning' },
    approved: { text: '已批准', color: 'success' },
    issued: { text: '已发布', color: 'cyan' },
}

const conclusionMap: Record<string, string> = {
    qualified: '合格',
    unqualified: '不合格',
}

export default function MyReportPage() {
    const router = useRouter()
    const [data, setData] = useState<ClientReport[]>([])
    const [loading, setLoading] = useState(false)
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [keyword, setKeyword] = useState('')
    const [statusFilter, setStatusFilter] = useState<string | null>(null)

    // 查看抽屉
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [current, setCurrent] = useState<ClientReport | null>(null)

    const fetchData = async (p = page) => {
        setLoading(true)
        try {
            let url = `/api/report/my?page=${p}&pageSize=10`
            if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`
            if (statusFilter) url += `&status=${statusFilter}`

            const res = await fetch(url)
            const json = await res.json()
            if (json.success && json.data) {
                setData(json.data.list || [])
                setTotal(json.data.total || 0)
            }
        } catch (error) {
            showError('获取报告列表失败')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [page])

    const handleSearch = () => {
        setPage(1)
        fetchData(1)
    }

    const handleView = (record: ClientReport) => {
        setCurrent(record)
        setDrawerOpen(true)
    }

    const handlePrint = (record: ClientReport) => {
        const printWindow = window.open(`/report/client/${record.id}`, '_blank')
        if (printWindow) {
            printWindow.addEventListener('load', () => {
                setTimeout(() => printWindow.print(), 500)
            })
        }
    }

    // 解析审批流程
    const parseApprovalFlow = (flowStr: string | null) => {
        if (!flowStr) return []
        try {
            return JSON.parse(flowStr) || []
        } catch {
            return []
        }
    }

    const columns: ColumnsType<ClientReport> = [
        { title: '报告编号', dataIndex: 'reportNo', width: 150 },
        { title: '项目名称', dataIndex: 'projectName', width: 150, ellipsis: true },
        { title: '客户名称', dataIndex: 'clientName', width: 150, ellipsis: true },
        { title: '样品名称', dataIndex: 'sampleName', width: 120, ellipsis: true },
        {
            title: '检测结论',
            dataIndex: 'overallConclusion',
            width: 90,
            render: (v: string) => conclusionMap[v] || v || '-',
        },
        {
            title: '状态',
            dataIndex: 'status',
            width: 90,
            render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text || s}</Tag>
        },
        { title: '编制人', dataIndex: 'preparer', width: 80 },
        {
            title: '创建时间',
            dataIndex: 'createdAt',
            width: 160,
            render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm')
        },
        {
            title: '操作',
            fixed: 'right',
            width: 120,
            onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' as const } }),
            render: (_, record) => (
                <Space size="small" style={{ whiteSpace: 'nowrap' }}>
                    <Button size="small" icon={<PrinterOutlined />} onClick={() => handlePrint(record)}>
                        打印
                    </Button>
                    <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record)} />
                </Space>
            )
        }
    ]

    const actionTextMap: Record<string, string> = {
        submit: '提交审核',
        review: '审核通过',
        approve: '批准通过',
        issue: '发放报告',
        reject: '驳回',
    }

    return (
        <div className="p-6">
            <Card title="我的报告">
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <Input
                        placeholder="搜索报告编号/客户/样品"
                        prefix={<SearchOutlined />}
                        value={keyword}
                        onChange={e => setKeyword(e.target.value)}
                        onPressEnter={handleSearch}
                        style={{ width: 250 }}
                        allowClear
                    />
                    <Select
                        placeholder="报告状态"
                        value={statusFilter}
                        onChange={setStatusFilter}
                        allowClear
                        style={{ width: 130 }}
                        options={Object.entries(statusMap).map(([k, v]) => ({ value: k, label: v.text }))}
                    />
                    <Button type="primary" onClick={handleSearch}>搜索</Button>
                    <Button icon={<ReloadOutlined />} onClick={() => { setKeyword(''); setStatusFilter(null); setPage(1); fetchData(1) }}>重置</Button>
                </div>

                <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={data}
                    loading={loading}
                    scroll={{ x: 1100 }}
                    pagination={{
                        current: page,
                        pageSize: 10,
                        total,
                        onChange: setPage,
                        showSizeChanger: false,
                        showTotal: (t) => `共 ${t} 条`
                    }}
                />
            </Card>

            {/* 查看详情抽屉 */}
            <Drawer
                title="客户报告详情"
                placement="right"
                width={750}
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
            >
                {current && (
                    <Tabs
                        defaultActiveKey="basic"
                        items={[
                            {
                                key: 'basic',
                                label: '基本信息',
                                children: (
                                    <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', paddingRight: 8 }}>
                                        <Descriptions column={2} bordered size="small">
                                            <Descriptions.Item label="报告编号">{current.reportNo}</Descriptions.Item>
                                            <Descriptions.Item label="状态">
                                                <Tag color={statusMap[current.status]?.color}>{statusMap[current.status]?.text}</Tag>
                                            </Descriptions.Item>
                                            <Descriptions.Item label="项目名称">{current.projectName || '-'}</Descriptions.Item>
                                            <Descriptions.Item label="客户名称">{current.clientName || '-'}</Descriptions.Item>
                                            <Descriptions.Item label="样品名称">{current.sampleName || '-'}</Descriptions.Item>
                                            <Descriptions.Item label="样品编号">{current.sampleNo || '-'}</Descriptions.Item>
                                            <Descriptions.Item label="规格型号">{current.specification || '-'}</Descriptions.Item>
                                            <Descriptions.Item label="编制人">{current.preparer || '-'}</Descriptions.Item>
                                            <Descriptions.Item label="审核人">{current.reviewer || '-'}</Descriptions.Item>
                                            <Descriptions.Item label="批准人">{current.approver || '-'}</Descriptions.Item>
                                            <Descriptions.Item label="创建时间">{dayjs(current.createdAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
                                            <Descriptions.Item label="发布日期">
                                                {current.issuedDate ? dayjs(current.issuedDate).format('YYYY-MM-DD') : '-'}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="检测结论" span={2}>
                                                {conclusionMap[current.overallConclusion || ''] || current.overallConclusion || '-'}
                                            </Descriptions.Item>
                                        </Descriptions>
                                    </div>
                                )
                            },
                            {
                                key: 'approval',
                                label: '审批记录',
                                children: (
                                    <div>
                                        {parseApprovalFlow(current.approvalFlow).length > 0 ? (
                                            <Timeline
                                                items={parseApprovalFlow(current.approvalFlow).map((item: any) => ({
                                                    color: item.action === 'reject' ? 'red' : 'green',
                                                    children: (
                                                        <div>
                                                            <div style={{ fontWeight: 500 }}>
                                                                {actionTextMap[item.action] || item.action}
                                                            </div>
                                                            <div style={{ color: '#999', fontSize: 12 }}>
                                                                {item.operator} · {dayjs(item.timestamp).format('YYYY-MM-DD HH:mm')}
                                                            </div>
                                                            {item.comment && (
                                                                <div style={{ color: '#666', marginTop: 4 }}>{item.comment}</div>
                                                            )}
                                                        </div>
                                                    )
                                                }))}
                                            />
                                        ) : (
                                            <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>暂无审批记录</div>
                                        )}
                                    </div>
                                )
                            }
                        ]}
                    />
                )}
            </Drawer>
        </div>
    )
}
