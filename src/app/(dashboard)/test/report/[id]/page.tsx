
'use client'

import { useState, useEffect } from 'react'
import { showError } from '@/lib/confirm'
import { useParams, useRouter } from 'next/navigation'
import { Card, Descriptions, Table, Tag, Timeline } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface TestData {
    id: string
    parameter: string
    value: string | null
    standard: string | null
    result: string | null
    remark: string | null
}

interface Report {
    id: string
    reportNo: string
    sampleName: string | null
    sampleNo: string | null
    clientName: string | null
    specification: string | null
    sampleQuantity: string | null
    receivedDate: string | null
    testParameters: string | null
    testResults: string | null
    overallConclusion: string | null
    richContent?: string | null
    tester: string | null
    reviewer: string | null
    status: string
    createdAt: string
    issuedDate: string | null
    lastEditedAt?: string | null
    lastEditedBy?: string | null
}

interface Approval {
    id: string
    reviewType: string
    reviewer: string
    result: string
    comments: string | null
    reviewDate: string
}

const statusMap: Record<string, { text: string; color: string }> = {
    draft: { text: '草稿', color: 'default' },
    reviewing: { text: '审核中', color: 'processing' },
    approved: { text: '已批准', color: 'success' },
    issued: { text: '已发布', color: 'cyan' },
}

const reviewTypeMap: Record<string, string> = {
    submit: '提交审核',
    review: '审核',
    issue: '发布'
}

export default function ReportDetailPage() {
    const params = useParams()
    const router = useRouter()
    const reportId = params.id as string

    const [report, setReport] = useState<Report | null>(null)
    const [testData, setTestData] = useState<TestData[]>([])
    const [approvals, setApprovals] = useState<Approval[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        fetchReport()
        fetchApprovals()
    }, [reportId])

    const fetchReport = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/test-report/${reportId}`)
            if (!res.ok) throw new Error('获取报告失败')

            const json = await res.json()
            const reportData = json.data || json
            setReport(reportData)

            // 解析 testResults
            if (reportData.testResults) {
                try {
                    const parsed = typeof reportData.testResults === 'string'
                        ? JSON.parse(reportData.testResults)
                        : reportData.testResults
                    setTestData(Array.isArray(parsed) ? parsed : [])
                } catch (e) {
                    console.error('[Report] 解析检测结果失败:', e)
                }
            }
        } catch (error) {
            showError('获取报告失败')
        } finally {
            setLoading(false)
        }
    }

    const fetchApprovals = async () => {
        try {
            const res = await fetch(`/api/report/${reportId}/approval`)
            const json = await res.json()
            if (json.success) {
                setApprovals(json.data || [])
            }
        } catch (error) {
            console.error('[Report] 获取审批历史失败:', error)
        }
    }

    const columns: ColumnsType<TestData> = [
        { title: '序号', width: 60, render: (_, __, index) => index + 1 },
        { title: '检测项目', dataIndex: 'parameter', width: 200 },
        { title: '技术要求', dataIndex: 'standard', width: 150 },
        { title: '实测值', dataIndex: 'value', width: 120 },
        {
            title: '单项判定',
            dataIndex: 'result',
            width: 100,
            render: (result: string) => {
                if (!result) return '-'
                const color = result.includes('合格') || result.includes('符合') ? 'success' : 'error'
                return <Tag color={color}>{result}</Tag>
            }
        },
        { title: '备注', dataIndex: 'remark', ellipsis: true },
    ]

    if (!report) {
        return <div className="p-6">加载中...</div>
    }

    return (
        <div className="p-6">
            {/* 左上角返回 */}
            <div className="mb-4 flex justify-between items-center">
                <a onClick={() => router.back()} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#1677ff' }}>
                    <ArrowLeftOutlined /> 返回
                </a>
                <h1 className="text-2xl font-bold" style={{ margin: 0 }}>检测报告详情</h1>
                <div style={{ width: 60 }} />
            </div>

            {/* 报告基本信息 */}
            <Card title="报告信息" className="mb-4">
                <Descriptions column={2} bordered>
                    <Descriptions.Item label="报告编号">{report.reportNo}</Descriptions.Item>
                    <Descriptions.Item label="报告状态">
                        <Tag color={statusMap[report.status]?.color}>
                            {statusMap[report.status]?.text}
                        </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="客户名称">{report.clientName || '-'}</Descriptions.Item>
                    <Descriptions.Item label="样品名称">{report.sampleName || '-'}</Descriptions.Item>
                    <Descriptions.Item label="样品编号">{report.sampleNo || '-'}</Descriptions.Item>
                    <Descriptions.Item label="样品规格">{report.specification || '-'}</Descriptions.Item>
                    <Descriptions.Item label="样品数量">{report.sampleQuantity || '-'}</Descriptions.Item>
                    <Descriptions.Item label="收样日期">
                        {report.receivedDate ? dayjs(report.receivedDate).format('YYYY-MM-DD') : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="检测人员">{report.tester || '-'}</Descriptions.Item>
                    <Descriptions.Item label="审核人员">{report.reviewer || '-'}</Descriptions.Item>
                    <Descriptions.Item label="报告日期">
                        {dayjs(report.createdAt).format('YYYY-MM-DD')}
                    </Descriptions.Item>
                    <Descriptions.Item label="发布日期">
                        {report.issuedDate ? dayjs(report.issuedDate).format('YYYY-MM-DD') : '-'}
                    </Descriptions.Item>
                    {report.lastEditedAt && (
                        <Descriptions.Item label="最后编辑" span={2}>
                            {report.lastEditedBy} · {dayjs(report.lastEditedAt).format('YYYY-MM-DD HH:mm')}
                        </Descriptions.Item>
                    )}
                </Descriptions>
            </Card>

            {/* 检测数据 */}
            <Card title="检测数据" className="mb-4">
                <Table
                    columns={columns}
                    dataSource={testData}
                    rowKey="id"
                    pagination={false}
                    bordered
                    size="middle"
                />
            </Card>

            {/* 检测结论 */}
            <Card title="检测结论" className="mb-4">
                {report.richContent ? (
                    <div
                        className="p-4 bg-gray-50 rounded"
                        dangerouslySetInnerHTML={{ __html: report.richContent }}
                    />
                ) : (
                    <div className="p-4 bg-gray-50 rounded">
                        <p className="text-base whitespace-pre-wrap">
                            {report.overallConclusion || '暂无结论'}
                        </p>
                    </div>
                )}
            </Card>

            {/* 审批历史 */}
            {approvals.length > 0 && (
                <Card title="审批历史">
                    <Timeline
                        items={approvals.map(item => ({
                            color: item.result === 'pass' ? 'green' : 'red',
                            children: (
                                <div>
                                    <div className="font-medium">
                                        {reviewTypeMap[item.reviewType] || item.reviewType}
                                        <Tag color={item.result === 'pass' ? 'success' : 'error'} className="ml-2">
                                            {item.result === 'pass' ? '通过' : '驳回'}
                                        </Tag>
                                    </div>
                                    <div className="text-gray-500 text-sm">
                                        {item.reviewer} · {dayjs(item.reviewDate).format('YYYY-MM-DD HH:mm')}
                                    </div>
                                    {item.comments && (
                                        <div className="text-gray-600 mt-1">{item.comments}</div>
                                    )}
                                </div>
                            )
                        }))}
                    />
                </Card>
            )}
        </div>
    )
}
