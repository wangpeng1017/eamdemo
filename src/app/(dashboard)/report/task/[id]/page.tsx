'use client'

import { useState, useEffect } from 'react'
import RichTextEditor from '@/components/RichTextEditor'
import { showSuccess, showError } from '@/lib/confirm'
import { useParams, useRouter } from 'next/navigation'
import { Card, Descriptions, Button, Table, message, Tag, Space, Modal, Form, Input, Timeline } from 'antd'
import { ArrowLeftOutlined, PrinterOutlined, DownloadOutlined, CheckCircleOutlined, CloseCircleOutlined, SendOutlined, FileTextOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons'
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
    precautions: string | null
    tester: string | null
    reviewer: string | null
    status: string
    createdAt: string
    issuedDate: string | null
}

const statusMap: Record<string, { text: string; color: string }> = {
    draft: { text: '草稿', color: 'default' },
    reviewing: { text: '审核中', color: 'processing' },
    approved: { text: '已批准', color: 'success' },
    issued: { text: '已发布', color: 'cyan' },
}

const actionTextMap: Record<string, string> = {
    submit: '提交审核',
    review: '审核',
    approve: '批准',
    issue: '发布',
    reject: '驳回'
}

export default function ReportDetailPage() {
    const params = useParams()
    const router = useRouter()
    const reportId = params.id as string

    const [report, setReport] = useState<any>(null)
    const [testData, setTestData] = useState<TestData[]>([])
    const [originalReport, setOriginalReport] = useState<any>(null)
    const [originalTestData, setOriginalTestData] = useState<TestData[]>([])

    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editMode, setEditMode] = useState(false)
    const [approvalModalOpen, setApprovalModalOpen] = useState(false)
    const [approvalAction, setApprovalAction] = useState<string>('')
    const [form] = Form.useForm()

    useEffect(() => {
        fetchReport()
    }, [reportId])

    const fetchReport = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/test-report/${reportId}`)
            if (!res.ok) throw new Error('获取报告失败')

            const json = await res.json()
            const reportData = json.data || json
            setReport(reportData)
            setOriginalReport(JSON.parse(JSON.stringify(reportData)))

            // 解析 testResults
            if (reportData.testResults) {
                try {
                    const parsed = typeof reportData.testResults === 'string'
                        ? JSON.parse(reportData.testResults)
                        : reportData.testResults
                    const data = Array.isArray(parsed) ? parsed : []
                    setTestData(data)
                    setOriginalTestData(JSON.parse(JSON.stringify(data)))
                } catch (e) {
                    console.error('解析检测结果失败', e)
                }
            }
        } catch (error) {
            showError('获取报告失败')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        try {
            setSaving(true)

            const res = await fetch(`/api/test-report/${reportId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sampleName: report.sampleName,
                    specification: report.specification,
                    sampleQuantity: report.sampleQuantity,
                    overallConclusion: report.overallConclusion,
                    precautions: report.precautions,
                    testResults: JSON.stringify(testData)
                })
            })

            const json = await res.json()
            if (res.ok && json.success) {
                showSuccess('保存成功')
                setEditMode(false)
                setOriginalReport(JSON.parse(JSON.stringify(report)))
                setOriginalTestData(JSON.parse(JSON.stringify(testData)))
                fetchReport()
            } else {
                showError(json.error || '保存失败')
            }
        } catch (error) {
            showError('保存失败')
        } finally {
            setSaving(false)
        }
    }

    const handleCancelEdit = () => {
        setReport(JSON.parse(JSON.stringify(originalReport)))
        setTestData(JSON.parse(JSON.stringify(originalTestData)))
        setEditMode(false)
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

        } catch (error) {
            showError('导出失败')
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

            const res = await fetch(`/api/test-report/${reportId}`, {
                method: 'PATCH',
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
        {
            title: '检测项目',
            dataIndex: 'parameter',
            width: 200,
            render: (text, record, index) => editMode ? (
                <Input
                    value={text}
                    onChange={(e) => {
                        const newData = [...testData]
                        newData[index].parameter = e.target.value
                        setTestData(newData)
                    }}
                />
            ) : text
        },
        {
            title: '技术要求',
            dataIndex: 'standard',
            width: 150,
            render: (text, record, index) => editMode ? (
                <Input
                    value={text || ''}
                    onChange={(e) => {
                        const newData = [...testData]
                        newData[index].standard = e.target.value
                        setTestData(newData)
                    }}
                />
            ) : text || '-'
        },
        {
            title: '实测值',
            dataIndex: 'value',
            width: 120,
            render: (text, record, index) => editMode ? (
                <Input
                    value={text || ''}
                    onChange={(e) => {
                        const newData = [...testData]
                        newData[index].value = e.target.value
                        setTestData(newData)
                    }}
                />
            ) : text || '-'
        },
        {
            title: '单项判定',
            dataIndex: 'result',
            width: 100,
            render: (result, record, index) => {
                if (editMode) {
                    return (
                        <Input
                            value={result || ''}
                            onChange={(e) => {
                                const newData = [...testData]
                                newData[index].result = e.target.value
                                setTestData(newData)
                            }}
                        />
                    )
                }
                if (!result) return '-'
                const resultStr = String(result)
                const color = resultStr.includes('合格') || resultStr.includes('符合') ? 'success' : 'error'
                return <Tag color={color}>{result}</Tag>
            }
        },
        {
            title: '备注',
            dataIndex: 'remark',
            ellipsis: true,
            render: (text, record, index) => editMode ? (
                <Input
                    value={text || ''}
                    onChange={(e) => {
                        const newData = [...testData]
                        newData[index].remark = e.target.value
                        setTestData(newData)
                    }}
                />
            ) : text || '-'
        },
    ]

    const getApprovalButtons = () => {
        if (!report) return null

        switch (report.status) {
            case 'draft':
                return (
                    <Button type="primary" icon={<SendOutlined />} onClick={() => handleApprovalAction('submit')}>
                        提交审核
                    </Button>
                )
            case 'reviewing':
                return (
                    <>
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
                    <Button type="primary" icon={<FileTextOutlined />} onClick={() => handleApprovalAction('issue')}>
                        发布报告
                    </Button>
                )
            default:
                return null
        }
    }

    if (!report) {
        return <div className="p-6">加载中...</div>
    }

    const canEdit = report.status === 'draft' || report.status === 'rejected'

    return (
        <div className="p-6">
            <div className="mb-4 flex justify-between items-center no-print">
                <h1 className="text-2xl font-bold">检测报告详情</h1>
                <Space>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
                        返回
                    </Button>
                    {canEdit && !editMode && (
                        <Button type="primary" icon={<EditOutlined />} onClick={() => setEditMode(true)}>
                            编辑
                        </Button>
                    )}
                    {editMode && (
                        <>
                            <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
                                保存
                            </Button>
                            <Button onClick={handleCancelEdit}>
                                取消
                            </Button>
                        </>
                    )}
                    <Button icon={<PrinterOutlined />} onClick={handlePrint}>
                        打印
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
                    <Descriptions.Item label="样品名称">
                        {editMode ? (
                            <Input
                                value={report.sampleName || ''}
                                onChange={(e) => setReport({ ...report, sampleName: e.target.value })}
                            />
                        ) : (report.sampleName || '-')}
                    </Descriptions.Item>
                    <Descriptions.Item label="样品编号">{report.sampleNo || '-'}</Descriptions.Item>
                    <Descriptions.Item label="样品规格">
                        {editMode ? (
                            <Input
                                value={report.specification || ''}
                                onChange={(e) => setReport({ ...report, specification: e.target.value })}
                            />
                        ) : (report.specification || '-')}
                    </Descriptions.Item>
                    <Descriptions.Item label="样品数量">
                        {editMode ? (
                            <Input
                                value={report.sampleQuantity || ''}
                                onChange={(e) => setReport({ ...report, sampleQuantity: e.target.value })}
                            />
                        ) : (report.sampleQuantity || '-')}
                    </Descriptions.Item>
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

            {/* 注意事项 */}
            {(report.precautions || editMode) && (
                <Card title="注意事项" className="mb-4">
                    {editMode ? (
                        <RichTextEditor
                            content={report.precautions || ''}
                            onChange={(content) => setReport({ ...report, precautions: content })}
                            placeholder="请输入注意事项..."
                            minHeight="150px"
                        />
                    ) : (
                        <div
                            className="rich-editor-content"
                            dangerouslySetInnerHTML={{ __html: report.precautions || '暂无' }}
                        />
                    )}
                </Card>
            )}

            {/* 检测结论 */}
            <Card title="检测结论" className="mb-4">
                {editMode ? (
                    <RichTextEditor
                        content={report.overallConclusion || ''}
                        onChange={(content) => setReport({ ...report, overallConclusion: content })}
                        placeholder="请输入检测结论..."
                        minHeight="200px"
                    />
                ) : (
                    <div
                        className="rich-editor-content"
                        dangerouslySetInnerHTML={{ __html: report.overallConclusion || '暂无结论' }}
                    />
                )}
            </Card>

            {/* 审批历史 */}
            {report.approvalFlow && report.approvalFlow.length > 0 && (
                <Card title="审批历史" className="no-print">
                    <Timeline
                        items={report.approvalFlow.map((item: any) => ({
                            color: item.action === 'reject' ? 'red' : 'green',
                            children: (
                                <div>
                                    <div className="font-medium">
                                        {actionTextMap[item.action] || item.action}
                                        <Tag color={item.action === 'reject' ? 'error' : 'success'} className="ml-2">
                                            {item.action === 'reject' ? '驳回' : '通过'}
                                        </Tag>
                                    </div>
                                    <div className="text-gray-500 text-sm">
                                        {item.operator} · {dayjs(item.timestamp).format('YYYY-MM-DD HH:mm')}
                                    </div>
                                    {item.comment && (
                                        <div className="text-gray-600 mt-1">{item.comment}</div>
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

                .rich-editor-content {
                    padding: 16px;
                    background: #f5f5f5;
                    border-radius: 4px;
                    min-height: 60px;
                }

                .rich-editor-content h1 {
                    font-size: 2em;
                    font-weight: bold;
                    margin: 0.5em 0;
                }

                .rich-editor-content h2 {
                    font-size: 1.5em;
                    font-weight: bold;
                    margin: 0.5em 0;
                }

                .rich-editor-content h3 {
                    font-size: 1.17em;
                    font-weight: bold;
                    margin: 0.5em 0;
                }

                .rich-editor-content ul,
                .rich-editor-content ol {
                    margin-left: 20px;
                }

                .rich-editor-content ul {
                    list-style-type: disc;
                }

                .rich-editor-content ol {
                    list-style-type: decimal;
                }

                .rich-editor-content strong {
                    font-weight: bold;
                }

                .rich-editor-content em {
                    font-style: italic;
                }

                .rich-editor-content a {
                    color: #1890ff;
                }
            `}</style>
        </div>
    )
}
