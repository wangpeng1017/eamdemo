'use client'

import { useState, useEffect } from 'react'
import { showError } from '@/lib/confirm'
import { Card, Descriptions, Table, Tag, Button, Space, message, Divider, Image } from 'antd'
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
    backCoverData: string | null // JSON { content: "..." }
    preparer: string | null
    reviewer: string | null
    approver: string | null
    status: string
    createdAt: string
    taskReports: TaskReport[]
    template?: {
        name: string
        fileUrl: string | null
    }
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

    // 解析封底数据
    let backCoverContent = ''
    try {
        if (report.backCoverData) {
            const data = JSON.parse(report.backCoverData)
            backCoverContent = data.content || ''
        }
    } catch (e) { }

    // 组合所有数据用于详情展示（也可以用于打印的第二页）
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
            {/* 操作栏 (打印时隐藏) */}
            <div className="mb-4 flex justify-between items-center no-print">
                <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
                    返回列表
                </Button>
                <Space>
                    <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>
                        打印报告
                    </Button>
                </Space>
            </div>

            {/* ==================== 封面页 (Page 1) ==================== */}
            <div className="print-page cover-page flex flex-col items-center justify-center text-center p-12 bg-white mb-8 shadow-sm">
                {/* Logo */}
                <div className="mb-16">
                    {report.template?.fileUrl ? (
                        <img src={report.template.fileUrl} alt="Logo" className="h-20" />
                    ) : (
                        <div className="text-3xl font-bold text-gray-300">LIMS LOGO</div>
                    )}
                </div>

                <h1 className="text-4xl font-bold mb-20 text-black">检测报告</h1>

                <div className="w-full max-w-xl text-left text-lg">
                    <div className="grid grid-cols-3 gap-y-6 mb-4">
                        <div className="font-bold text-gray-600">报告编号：</div>
                        <div className="col-span-2 border-b border-black">{report.reportNo}</div>

                        <div className="font-bold text-gray-600">项目名称：</div>
                        <div className="col-span-2 border-b border-black">{report.projectName || '-'}</div>

                        <div className="font-bold text-gray-600">委托单位：</div>
                        <div className="col-span-2 border-b border-black">{report.clientName}</div>

                        <div className="font-bold text-gray-600">样品名称：</div>
                        <div className="col-span-2 border-b border-black">{report.sampleName}</div>

                        <div className="font-bold text-gray-600">报告日期：</div>
                        <div className="col-span-2 border-b border-black">{dayjs(report.createdAt).format('YYYY年MM月DD日')}</div>
                    </div>
                </div>

                <div className="mt-20 text-sm text-gray-500">
                    本报告未经授权不得复制
                </div>
            </div>

            {/* ==================== 内容页 (Page 2+) ==================== */}
            <div className="print-page content-page p-8 bg-white mb-8 shadow-sm">
                <div className="flex justify-between border-b pb-2 mb-6">
                    <span className="text-sm text-gray-500">报告编号：{report.reportNo}</span>
                    <span className="text-sm text-gray-500">第 1 页 / 共 2 页</span>
                </div>

                <h2 className="text-xl font-bold mb-6 text-center">检测结果汇总</h2>

                <Descriptions bordered column={2} className="mb-6" size="small">
                    <Descriptions.Item label="客户名称">{report.clientName}</Descriptions.Item>
                    <Descriptions.Item label="联系人">-</Descriptions.Item>
                    <Descriptions.Item label="样品名称">{report.sampleName}</Descriptions.Item>
                    <Descriptions.Item label="样品状态">完好</Descriptions.Item>
                    <Descriptions.Item label="检测项目" span={2}>
                        {report.testItems ? JSON.parse(report.testItems).join('、') : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="检测依据" span={2}>
                        {report.testStandards ? JSON.parse(report.testStandards).join('、') : '-'}
                    </Descriptions.Item>
                </Descriptions>

                {/* 循环渲染每个任务的数据 */}
                {report.taskReports?.map((tr, index) => (
                    <div key={tr.reportNo} className="mb-8">
                        <div className="font-bold mb-2 bg-gray-100 p-2">任务 #{index + 1}: {tr.task?.taskNo}</div>
                        <Table
                            rowKey={(r, i) => `${tr.reportNo}-${i}`}
                            columns={columns}
                            dataSource={tr.task.testData || []}
                            pagination={false}
                            size="small"
                            bordered
                        />
                    </div>
                ))}

                <div className="mt-6 border-t pt-4">
                    <h3 className="font-bold mb-2">总体结论：</h3>
                    <p className="p-4 bg-gray-50 rounded min-h-[80px]">
                        {report.overallConclusion || '（无结论）'}
                    </p>
                </div>

                <div className="mt-8 flex justify-end space-x-12">
                    <div>编制人：{report.preparer || '__________'}</div>
                    <div>审核人：{report.reviewer || '__________'}</div>
                    <div>批准人：{report.approver || '__________'}</div>
                </div>
            </div>

            {/* ==================== 封底页 (Last Page) ==================== */}
            <div className="print-page back-cover-page flex flex-col justify-between p-12 bg-white shadow-sm min-h-[1100px]">
                <div>
                    <h2 className="text-xl font-bold mb-6 border-b pb-2">声明 / 注意事项</h2>
                    <div className="text-base leading-relaxed whitespace-pre-wrap">
                        {backCoverContent || (
                            <>
                                1. 本报告无“检验检测专用章”无效。<br />
                                2. 报告无编制、审核、批准人签字无效。<br />
                                3. 报告涂改无效。<br />
                                4. 对检测报告若有异议，请于收到报告之日起十五日内向本公司提出。<br />
                                5. 未经本公司书面批准，不得复制本报告（全文复制除外）。<br />
                                6. 本报告检测结果仅对来样负责。
                            </>
                        )}
                    </div>
                </div>

                <div className="text-center mt-20">
                    <div className="mb-4 text-xl font-bold">江苏国轻检测技术有限公司</div>
                    <div className="text-gray-600">地址：江苏省某某市某某区某某路88号</div>
                    <div className="text-gray-600">电话：0512-12345678</div>
                    <div className="text-gray-600">网址：www.example.com</div>
                </div>
            </div>

            <style jsx global>{`
                /* 屏幕样式微调 */
                .print-page {
                    min-height: 297mm; /* A4 height */
                    width: 210mm;      /* A4 width */
                    margin: 0 auto 20px auto;
                    border: 1px solid #eee;
                }

                @media print {
                    @page { 
                        size: A4; 
                        margin: 0; 
                    }
                    body { 
                        background: white; 
                        -webkit-print-color-adjust: exact;
                    }
                    .no-print { 
                        display: none !important; 
                    }
                    .print-page {
                        border: none;
                        margin: 0;
                        box-shadow: none;
                        page-break-after: always; /* 强制分页 */
                        width: 100%;
                        min-height: 100vh;
                        padding: 20mm; /* 打印时的内边距 */
                    }
                    .print-page:last-child {
                        page-break-after: auto;
                    }
                    
                    /* 覆盖 AntD 表格打印样式问题 */
                    .ant-table-wrapper {
                        margin-bottom: 0 !important;
                    }
                }
            `}</style>
        </div>
    )
}
