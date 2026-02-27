'use client'

import { useState, useEffect, useCallback } from 'react'
import { showError } from '@/lib/confirm'
import { Table, Button, Space, Tag, Card, Input, Select, Drawer, Descriptions, Tabs } from 'antd'
import { EyeOutlined, PrinterOutlined, SearchOutlined, ReloadOutlined, EditOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useRouter } from 'next/navigation'

// 任务报告已去掉审批流程，不再需要状态管理

const clientStatusMap: Record<string, { text: string; color: string }> = {
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
    const [reportType, setReportType] = useState<'task' | 'client'>('task')
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [keyword, setKeyword] = useState('')
    const [statusFilter, setStatusFilter] = useState<string | null>(null)

    // 查看抽屉
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [current, setCurrent] = useState<any>(null)

    const fetchData = useCallback(async (p = page) => {
        setLoading(true)
        try {
            let url = `/api/report/my?type=${reportType}&page=${p}&pageSize=10`
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
    }, [reportType, keyword, statusFilter, page])

    useEffect(() => {
        fetchData(page)
    }, [page, reportType])

    const handleSearch = () => {
        setPage(1)
        fetchData(1)
    }

    const handleView = (record: any) => {
        setCurrent(record)
        setDrawerOpen(true)
    }

    const handleEdit = (record: any) => {
        if (reportType === 'task') {
            router.push(`/report/task/${record.id}`)
        }
    }

    const statusMap = clientStatusMap

    // 任务报告列
    const taskColumns: ColumnsType<any> = [
        { title: '报告编号', dataIndex: 'reportNo', width: 160 },
        { title: '样品名称', dataIndex: 'sampleName', width: 120, ellipsis: true },
        { title: '客户名称', dataIndex: 'clientName', width: 120, ellipsis: true },
        { title: '检测人', dataIndex: 'tester', width: 80 },
        {
            title: '检测结论', dataIndex: 'overallConclusion', width: 90,
            render: (v: string) => conclusionMap[v] || v || '-',
        },

        {
            title: '创建时间', dataIndex: 'createdAt', width: 160,
            render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm')
        },
        {
            title: '操作', fixed: 'right', width: 120,
            render: (_, record) => (
                <Space size="small">
                    <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
                    <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record)} />
                </Space>
            )
        }
    ]

    // 客户报告列
    const clientColumns: ColumnsType<any> = [
        { title: '报告编号', dataIndex: 'reportNo', width: 160 },
        { title: '项目名称', dataIndex: 'projectName', width: 150, ellipsis: true },
        { title: '客户名称', dataIndex: 'clientName', width: 120, ellipsis: true },
        { title: '样品名称', dataIndex: 'sampleName', width: 120, ellipsis: true },
        {
            title: '检测结论', dataIndex: 'overallConclusion', width: 90,
            render: (v: string) => conclusionMap[v] || v || '-',
        },
        {
            title: '状态', dataIndex: 'status', width: 90,
            render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text || s}</Tag>
        },
        { title: '编制人', dataIndex: 'preparer', width: 80 },
        {
            title: '创建时间', dataIndex: 'createdAt', width: 160,
            render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm')
        },
        {
            title: '操作', fixed: 'right', width: 120,
            render: (_, record) => (
                <Space size="small">
                    <Button size="small" icon={<PrinterOutlined />} onClick={() => {
                        const printWindow = window.open(`/report/client/${record.id}`, '_blank')
                        if (printWindow) {
                            printWindow.addEventListener('load', () => setTimeout(() => printWindow.print(), 500))
                        }
                    }}>打印</Button>
                    <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record)} />
                </Space>
            )
        }
    ]

    const columns = reportType === 'task' ? taskColumns : clientColumns

    return (
        <div className="p-6">
            <Card
                title="我的报告"
                tabList={[
                    { key: 'task', tab: '任务报告' },
                    { key: 'client', tab: '客户报告' },
                ]}
                activeTabKey={reportType}
                onTabChange={key => {
                    setReportType(key as 'task' | 'client')
                    setPage(1)
                    setKeyword('')
                    setStatusFilter(null)
                }}
            >
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
                    {reportType === 'client' && (
                        <Select
                            placeholder="报告状态"
                            value={statusFilter}
                            onChange={setStatusFilter}
                            allowClear
                            style={{ width: 130 }}
                            options={Object.entries(statusMap).map(([k, v]) => ({ value: k, label: v.text }))}
                        />
                    )}
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
                title={reportType === 'task' ? '任务报告详情' : '客户报告详情'}
                placement="right"
                width={700}
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
            >
                {current && (
                    <Descriptions column={2} bordered size="small">
                        <Descriptions.Item label="报告编号">{current.reportNo}</Descriptions.Item>
                        {reportType === 'client' && (
                            <Descriptions.Item label="状态">
                                <Tag color={statusMap[current.status]?.color}>{statusMap[current.status]?.text}</Tag>
                            </Descriptions.Item>
                        )}
                        <Descriptions.Item label="客户名称">{current.clientName || '-'}</Descriptions.Item>
                        <Descriptions.Item label="样品名称">{current.sampleName || '-'}</Descriptions.Item>
                        <Descriptions.Item label="样品编号">{current.sampleNo || '-'}</Descriptions.Item>
                        {reportType === 'task' ? (
                            <>
                                <Descriptions.Item label="检测人">{current.tester || '-'}</Descriptions.Item>
                                <Descriptions.Item label="审核人">{current.reviewer || '-'}</Descriptions.Item>
                                <Descriptions.Item label="任务编号">{current.task?.taskNo || '-'}</Descriptions.Item>
                            </>
                        ) : (
                            <>
                                <Descriptions.Item label="项目名称">{current.projectName || '-'}</Descriptions.Item>
                                <Descriptions.Item label="编制人">{current.preparer || '-'}</Descriptions.Item>
                                <Descriptions.Item label="审核人">{current.reviewer || '-'}</Descriptions.Item>
                            </>
                        )}
                        <Descriptions.Item label="创建时间">{dayjs(current.createdAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
                        <Descriptions.Item label="检测结论" span={2}>
                            {conclusionMap[current.overallConclusion || ''] || current.overallConclusion || '-'}
                        </Descriptions.Item>
                    </Descriptions>
                )}
            </Drawer>
        </div>
    )
}
