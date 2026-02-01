'use client'

import { useState, useEffect } from 'react'
import { showError } from '@/lib/confirm'
import { Card, Descriptions, Table, Tag, Button, Space, message, Divider } from 'antd'
import { ArrowLeftOutlined, PrinterOutlined, DownloadOutlined } from '@ant-design/icons'
import { useParams, useRouter } from 'next/navigation'
import dayjs from 'dayjs'

interface TaskReport {
    reportNo: string
    task: {
        taskNo: string
        sampleName: string | null
        testData: {
            parameter: string
            value: string | null
            standard: string | null
            result: string | null
            remark: string | null
        }[]
    }
}

interface ClientReport {
    id: string
    reportNo: string
    projectName: string | null
    clientName: string
    sampleName: string
    taskReportNos: string | null
    testItems: string | null
    testStandards: string | null
    overallConclusion: string | null
    preparer: string | null
    reviewer: string | null
    approver: string | null
    status: string
    createdAt: string
    taskReports: TaskReport[]
}

const statusMap: Record<string, { text: string; color: string }> = {
    draft: { text: '草稿', color: 'default' },
    pending_review: { text: '待审核', color: 'processing' },
    pending_approve: { text: '待批准', color: 'warning' },
    approved: { text: '已批准', color: 'success' },
    issued: { text: '已发布', color: 'cyan' },
}

export default function ClientReportDetailPage() {
    const params = useParams()
    const router = useRouter()
    const reportId = params.id as string

    const [report, setReport] = useState<ClientReport | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchReport()
    }, [reportId])

    const fetchReport = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/client-report/${reportId}`)
            const json = await res.json()
            if (json.success) {
                setReport(json.data)
            } else {
                showError('获取报告失败')
            }
        } catch (error) {
            showError('获取报告失败')
        } finally {
            setLoading(false)
        }
    }

    const handlePrint = () => {
        window.print()
    }

    if (loading) {
        return <div className="p-6 text-center">加载中...</div>
    }

    if (!report) {
        return <div className="p-6 text-center">报告不存在</div>
    }

    // 合并所有任务的检测数据
    const allTestData = report.taskReports?.flatMap(tr =>
        (tr.task?.testData || []).map(td => ({
            ...td,
            taskNo: tr.task?.taskNo,
            reportNo: tr.reportNo
        }))
    ) || []

    const columns = [
        { title: '任务编号', dataIndex: 'taskNo', width: 120 },
        { title: '检测项目', dataIndex: 'parameter', width: 150 },
        { title: '技术要求', dataIndex: 'standard', width: 150 },
        { title: '实测值', dataIndex: 'value', width: 120 },
        { title: '单项判定', dataIndex: 'result', width: 100 },
        { title: '备注', dataIndex: 'remark' },
    ]

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="mb-4 flex justify-between items-center no-print">
                <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
                    返回
                </Button>
                <Space>
                    <Button icon={<PrinterOutlined />} onClick={handlePrint}>
                        打印
                    </Button>
                </Space>
            </div>

            <Card className="print-section">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold">客户检测报告</h1>
                    <p className="text-gray-500">报告编号: {report.reportNo}</p>
                </div>

                <Descriptions bordered column={2} className="mb-6">
                    <Descriptions.Item label="客户名称">{report.clientName}</Descriptions.Item>
                    <Descriptions.Item label="项目名称">{report.projectName || '-'}</Descriptions.Item>
                    <Descriptions.Item label="样品名称">{report.sampleName}</Descriptions.Item>
                    <Descriptions.Item label="状态">
                        <Tag color={statusMap[report.status]?.color}>
                            {statusMap[report.status]?.text}
                        </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="编制人">{report.preparer || '-'}</Descriptions.Item>
                    <Descriptions.Item label="创建日期">{dayjs(report.createdAt).format('YYYY-MM-DD')}</Descriptions.Item>
                    <Descriptions.Item label="包含任务报告" span={2}>
                        {report.taskReportNos
                            ? JSON.parse(report.taskReportNos).join('、')
                            : '-'
                        }
                    </Descriptions.Item>
                </Descriptions>

                <Divider>检测数据</Divider>

                {allTestData.length > 0 ? (
                    <Table
                        rowKey={(r, i) => `${r.taskNo}-${r.parameter}-${i}`}
                        columns={columns}
                        dataSource={allTestData}
                        pagination={false}
                        size="small"
                        bordered
                    />
                ) : (
                    <div className="text-center text-gray-400 py-8">暂无检测数据</div>
                )}

                <Divider>总体结论</Divider>
                <div className="bg-gray-50 p-4 rounded">
                    {report.overallConclusion || '暂无结论'}
                </div>
            </Card>

            <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          .print-section { box-shadow: none !important; }
        }
      `}</style>
        </div>
    )
}
