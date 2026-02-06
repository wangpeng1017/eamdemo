
'use client'

import { useState, useEffect } from 'react'
import { showSuccess, showError } from '@/lib/confirm'
import { useParams, useRouter } from 'next/navigation'
import { Card, Descriptions, Button, Table, message, Tag, Space, Modal, Form, Input, Timeline } from 'antd'
import { ArrowLeftOutlined, PrinterOutlined, DownloadOutlined, CheckCircleOutlined, CloseCircleOutlined, SendOutlined, FileTextOutlined, EditOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import RichTextEditor from '@/components/editor/RichTextEditor'

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
    const [approvalModalOpen, setApprovalModalOpen] = useState(false)
    const [approvalAction, setApprovalAction] = useState<string>('')
    const [richContentModalOpen, setRichContentModalOpen] = useState(false)
    const [richContent, setRichContent] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [form] = Form.useForm()

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

            // 设置富文本内容
            if (reportData.richContent) {
                setRichContent(reportData.richContent)
            }

            // 解析 testResults
            if (reportData.testResults) {
                try {
                    const parsed = typeof reportData.testResults === 'string'
                        ? JSON.parse(reportData.testResults)
                        : reportData.testResults
                    setTestData(Array.isArray(parsed) ? parsed : [])
                } catch (e) {
                    console.error('[Report] 解析检测结果失败:', e)
                    showError('检测结果解析失败', '无法解析检测结果，请检查数据格式')
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
            // 静默失败，不影响主要功能
        }
    }

    const handlePrint = () => {
        window.print()
    }

    const handleExport = async () => {
        try {
            message.loading({ content: '正在生成 Excel...', key: 'export' })
            const response = await fetch(`/api/report/${reportId}/export`)

            if (!response.ok) {
                throw new Error('导出失败')
            }

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `检测报告_${report?.reportNo}.xlsx`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)

            showSuccess({ content: '导出成功', key: 'export' })
        } catch (error) {
            showError({ content: '导出失败', key: 'export' })
        }
    }

    // 打开富文本编辑Modal
    const handleEditRichContent = () => {
        if (report?.richContent) {
            setRichContent(report.richContent)
        }
        setRichContentModalOpen(true)
    }

    // 保存富文本内容
    const handleSaveRichContent = async () => {
        try {
            setSubmitting(true)

            const res = await fetch(`/api/test-report/${reportId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    richContent: richContent
                })
            })

            const json = await res.json()
            if (res.ok && json.success) {
                showSuccess('保存成功')
                setRichContentModalOpen(false)
                fetchReport() // 刷新报告数据
            } else {
                showError(json.error || '保存失败')
            }
        } catch (error) {
            console.error('保存富文本失败:', error)
            showError('保存失败')
        } finally {
            setSubmitting(false)
        }
    }

    const handleApprovalAction = (action: string) => {
        setApprovalAction(action)
        setApprovalModalOpen(true)
    }

    const handleApprovalSubmit = async () => {
        try {
            const values = await form.validateFields()
            setLoading(true)

            const res = await fetch(`/api/report/${reportId}/approval`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: approvalAction,
                    comment: values.comment
                })
            })

            const json = await res.json()
            if (res.ok && json.success) {
                showSuccess(json.message)
                setApprovalModalOpen(false)
                form.resetFields()
                fetchReport()
                fetchApprovals()
            } else {
                showError(json.error || '操作失败')
            }
        } catch (error) {
            showError('操作失败')
        } finally {
            setLoading(false)
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

    const getApprovalButtons = () => {
        if (!report) return null

        switch (report.status) {
            case 'draft':
                return (
                    <>
                        <Button icon={<EditOutlined />} onClick={handleEditRichContent} className="mr-2">
                            编辑富文本
                        </Button>
                        <Button type="primary" icon={<SendOutlined />} onClick={() => handleApprovalAction('submit')}>
                            提交审核
                        </Button>
                    </>
                )
            case 'reviewing':
                return (
                    <>
                        <Button icon={<EditOutlined />} onClick={handleEditRichContent} className="mr-2">
                            编辑富文本
                        </Button>
                        <Button danger icon={<CloseCircleOutlined />} onClick={() => handleApprovalAction('reject')}>
                            驳回
                        </Button>
                        <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => handleApprovalAction('approve')}>
                            审核通过
                        </Button>
                    </>
                )
            case 'approved':
                return (
                    <>
                        <Button icon={<EditOutlined />} onClick={handleEditRichContent} className="mr-2">
                            编辑富文本
                        </Button>
                        <Button type="primary" icon={<FileTextOutlined />} onClick={() => handleApprovalAction('issue')}>
                            发布报告
                        </Button>
                    </>
                )
            default:
                return (
                    <Button icon={<EditOutlined />} onClick={handleEditRichContent}>
                        查看富文本
                    </Button>
                )
        }
    }

    if (!report) {
        return <div className="p-6">加载中...</div>
    }

    return (
        <div className="p-6">
            <div className="mb-4 flex justify-between items-center no-print">
                <h1 className="text-2xl font-bold">检测报告详情</h1>
                <Space>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
                        返回
                    </Button>
                    <Button icon={<PrinterOutlined />} onClick={handlePrint}>
                        打印
                    </Button>
                    <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>
                        导出 Excel
                    </Button>
                    {getApprovalButtons()}
                </Space>
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

            {/* 检测结论 - 支持富文本 */}
            <Card
                title="检测结论"
                className="mb-4"
                extra={
                    <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={handleEditRichContent}
                        className="no-print"
                    >
                        编辑
                    </Button>
                }
            >
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
                <Card title="审批历史" className="no-print">
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

            {/* 审批确认弹窗 */}
            <Modal
                title={approvalAction === 'reject' ? '驳回报告' : '确认操作'}
                open={approvalModalOpen}
                onOk={handleApprovalSubmit}
                onCancel={() => {
                    setApprovalModalOpen(false)
                    form.resetFields()
                }}
                confirmLoading={loading}
                okText="确定"
                cancelText="取消"
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        name="comment"
                        label="审批意见"
                        rules={approvalAction === 'reject' ? [{ required: true, message: '驳回时必须填写原因' }] : []}
                    >
                        <Input.TextArea
                            rows={4}
                            placeholder={approvalAction === 'reject' ? '必填，请说明驳回原因' : '选填，可以填写审批意见'}
                        />
                    </Form.Item>
                </Form>
            </Modal>

            {/* 富文本编辑弹窗 */}
            <Modal
                title="编辑检测结论（富文本）"
                open={richContentModalOpen}
                onOk={handleSaveRichContent}
                onCancel={() => setRichContentModalOpen(false)}
                confirmLoading={submitting}
                width={1000}
                okText="保存"
                cancelText="取消"
                style={{ top: 20 }}
            >
                <RichTextEditor
                    value={richContent}
                    onChange={setRichContent}
                    placeholder="请输入检测结论..."
                    height="600px"
                />
            </Modal>

            <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .ant-card {
            box-shadow: none !important;
            border: 1px solid #d9d9d9 !important;
          }
        }
      `}</style>
        </div>
    )
}
