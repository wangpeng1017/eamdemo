'use client'

import { useState, useEffect } from 'react'
import { showSuccess, showError } from '@/lib/confirm'
import { Table, Button, Space, Tag, Modal, Select, Card, Statistic, Row, Col, Form, Input, Divider, Drawer, Descriptions, Tabs, Timeline, Popconfirm } from 'antd'
import { PlusOutlined, EyeOutlined, EditOutlined, PrinterOutlined, SendOutlined, DeleteOutlined, FileTextOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useRouter } from 'next/navigation'

interface ClientReport {
    id: string
    reportNo: string
    projectName: string | null
    clientName: string
    sampleName: string
    taskReportNos: string | null
    overallConclusion: string | null
    status: string
    preparer: string | null
    reviewer: string | null
    approver: string | null
    approvalFlow: ApprovalRecord[]
    createdAt: string
}

interface ApprovalRecord {
    action: string
    operator: string
    comment: string
    timestamp: string
}

interface Entrustment {
    id: string
    entrustmentNo: string
    clientName: string
    projectName: string | null
    testTasks: {
        id: string
        taskNo: string
        sampleName: string | null
        status: string
        testReport?: { reportNo: string } | null
    }[]
}

interface ReportTemplate {
    id: string
    name: string
    code: string
}

const statusMap: Record<string, { text: string; color: string }> = {
    draft: { text: '草稿', color: 'default' },
    pending_review: { text: '待审核', color: 'processing' },
    pending_approve: { text: '待批准', color: 'warning' },
    approved: { text: '已批准', color: 'success' },
    issued: { text: '已发布', color: 'cyan' },
}

const actionTextMap: Record<string, string> = {
    submit: '提交审核',
    review: '审核通过',
    approve: '批准通过',
    issue: '发放报告',
    reject: '驳回',
}

export default function ClientReportGeneratePage() {
    const router = useRouter()
    const [data, setData] = useState<ClientReport[]>([])
    const [loading, setLoading] = useState(false)
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)

    // 生成报告弹窗
    const [generateModalOpen, setGenerateModalOpen] = useState(false)
    const [entrustments, setEntrustments] = useState<Entrustment[]>([])
    const [templates, setTemplates] = useState<ReportTemplate[]>([])
    const [selectedEntrustment, setSelectedEntrustment] = useState<Entrustment | null>(null)
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])
    const [generating, setGenerating] = useState(false)
    const [form] = Form.useForm()

    // 查看抽屉
    const [viewDrawerOpen, setViewDrawerOpen] = useState(false)
    const [currentReport, setCurrentReport] = useState<ClientReport | null>(null)

    // 提交审批弹窗
    const [submitModalOpen, setSubmitModalOpen] = useState(false)
    const [submitForm] = Form.useForm()
    const [submitting, setSubmitting] = useState(false)

    const fetchData = async (p = page) => {
        setLoading(true)
        try {
            const res = await fetch(`/api/client-report?page=${p}&pageSize=10`)
            const json = await res.json()
            if (json.success && json.data) {
                setData(json.data.list || [])
                setTotal(json.data.total || 0)
            } else {
                setData(json.list || [])
                setTotal(json.total || 0)
            }
        } catch (error) {
            showError('获取报告列表失败')
        } finally {
            setLoading(false)
        }
    }

    const fetchEntrustments = async () => {
        try {
            const res = await fetch('/api/entrustment?pageSize=100')
            const json = await res.json()
            const list = json.data?.list || json.list || []
            const filtered = list.filter((e: Entrustment) =>
                e.testTasks?.some(t => t.status === 'completed')
            )
            setEntrustments(filtered)
        } catch (error) {
            showError('获取委托单失败')
        }
    }

    const fetchTemplates = async () => {
        try {
            const res = await fetch('/api/report-template?category=client_report&status=active')
            const json = await res.json()
            if (json.success && json.data) {
                setTemplates(json.data.list || [])
            }
        } catch (error) {
            console.error('获取模板失败')
        }
    }

    useEffect(() => {
        fetchData()
        fetchTemplates()
    }, [page])

    // 生成报告
    const handleGenerate = () => {
        fetchEntrustments()
        setSelectedEntrustment(null)
        setSelectedTaskIds([])
        form.resetFields()
        if (templates.length > 0) {
            form.setFieldValue('templateId', templates[0].id)
        }
        setGenerateModalOpen(true)
    }

    const handleEntrustmentChange = (entrustmentId: string) => {
        const entrustment = entrustments.find(e => e.id === entrustmentId)
        setSelectedEntrustment(entrustment || null)
        setSelectedTaskIds([])
        if (entrustment) {
            form.setFieldsValue({
                clientName: entrustment.clientName,
                projectName: entrustment.projectName,
            })
        }
    }

    const handleGenerateSubmit = async () => {
        if (!selectedEntrustment || selectedTaskIds.length === 0) {
            showError('请选择委托单和至少一个任务')
            return
        }

        try {
            const values = await form.validateFields()
            setGenerating(true)

            const res = await fetch('/api/client-report/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    entrustmentId: selectedEntrustment.id,
                    taskIds: selectedTaskIds,
                    templateId: values.templateId,
                    clientName: values.clientName,
                    projectName: values.projectName,
                    sampleName: values.sampleName,
                    overallConclusion: values.overallConclusion,
                    backCoverData: values.backCoverContent ? { content: values.backCoverContent } : null
                })
            })

            const json = await res.json()

            if (res.ok && json.success) {
                showSuccess('客户报告生成成功')
                setGenerateModalOpen(false)
                fetchData()
            } else {
                showError(json.error || '报告生成失败')
            }
        } catch (error) {
            showError('报告生成失败')
        } finally {
            setGenerating(false)
        }
    }

    // 查看详情（打开抽屉）
    const handleView = (record: ClientReport) => {
        setCurrentReport(record)
        setViewDrawerOpen(true)
    }

    // 编辑
    const handleEdit = (record: ClientReport) => {
        router.push(`/report/client/edit/${record.id}`)
    }

    // 打印
    const handlePrint = (record: ClientReport) => {
        window.open(`/report/client/${record.id}`, '_blank')
    }

    // 提交审批
    const handleSubmitApproval = (record: ClientReport) => {
        setCurrentReport(record)
        submitForm.resetFields()
        setSubmitModalOpen(true)
    }

    const handleSubmitConfirm = async () => {
        if (!currentReport) return
        setSubmitting(true)
        try {
            const values = await submitForm.validateFields()
            const res = await fetch(`/api/report/client/${currentReport.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'submit',
                    operator: values.operator,
                    comment: values.comment,
                }),
            })
            const json = await res.json()
            if (json.success) {
                showSuccess('提交审批成功')
                setSubmitModalOpen(false)
                fetchData()
            } else {
                showError(json.error?.message || '提交审批失败')
            }
        } catch (error: any) {
            showError(error.message || '提交审批失败')
        } finally {
            setSubmitting(false)
        }
    }

    // 删除
    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/report/client/${id}`, { method: 'DELETE' })
            const json = await res.json()
            if (json.success) {
                showSuccess('删除成功')
                fetchData()
            } else {
                showError(json.error?.message || '删除失败')
            }
        } catch (error) {
            showError('删除失败')
        }
    }

    const columns: ColumnsType<ClientReport> = [
        { title: '报告编号', dataIndex: 'reportNo', width: 150 },
        { title: '项目名称', dataIndex: 'projectName', width: 150, ellipsis: true },
        { title: '客户名称', dataIndex: 'clientName', width: 150, ellipsis: true },
        { title: '样品名称', dataIndex: 'sampleName', width: 120, ellipsis: true },
        {
            title: '包含任务',
            dataIndex: 'taskReportNos',
            width: 100,
            render: (v: string) => {
                if (!v) return '-'
                try {
                    const arr = JSON.parse(v)
                    return Array.isArray(arr) ? arr.length + ' 个' : '-'
                } catch {
                    return '-'
                }
            }
        },
        {
            title: '状态',
            dataIndex: 'status',
            width: 90,
            render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag>
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
            width: 280,
            onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' as const } }),
            render: (_, record) => (
                <Space size="small" style={{ whiteSpace: 'nowrap' }}>
                    <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record)} title="查看" />
                    {record.status === 'draft' && (
                        <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} title="编辑" />
                    )}
                    {record.status === 'draft' && (
                        <Button size="small" type="primary" ghost icon={<SendOutlined />} onClick={() => handleSubmitApproval(record)}>
                            提交
                        </Button>
                    )}
                    <Button size="small" icon={<PrinterOutlined />} onClick={() => handlePrint(record)}>
                        打印
                    </Button>
                    {record.status === 'draft' && (
                        <Popconfirm title="确认删除该报告?" onConfirm={() => handleDelete(record.id)}>
                            <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    )}
                </Space>
            )
        }
    ]

    // 获取已完成的任务
    const completedTasks = selectedEntrustment?.testTasks?.filter(t => t.status === 'completed') || []

    return (
        <div className="p-6">
            <div className="mb-4">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h2 style={{ margin: 0 }}>客户报告生成</h2>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleGenerate}>
                        生成客户报告
                    </Button>
                </div>
                <Row gutter={16} className="mb-4">
                    <Col span={6}>
                        <Card size="small">
                            <Statistic title="客户报告总数" value={total} prefix={<FileTextOutlined />} />
                        </Card>
                    </Col>
                </Row>
            </div>

            <Table
                rowKey="id"
                columns={columns}
                dataSource={data}
                loading={loading}
                scroll={{ x: 1200 }}
                pagination={{
                    current: page,
                    pageSize: 10,
                    total,
                    onChange: setPage,
                    showSizeChanger: false,
                    showTotal: (total) => `共 ${total} 条`
                }}
            />

            {/* 查看详情抽屉 */}
            <Drawer
                title="客户报告详情"
                placement="right"
                width={700}
                open={viewDrawerOpen}
                onClose={() => setViewDrawerOpen(false)}
            >
                {currentReport && (
                    <Tabs
                        defaultActiveKey="basic"
                        items={[
                            {
                                key: 'basic',
                                label: '基本信息',
                                children: (
                                    <Descriptions column={2} bordered size="small">
                                        <Descriptions.Item label="报告编号">{currentReport.reportNo}</Descriptions.Item>
                                        <Descriptions.Item label="状态">
                                            <Tag color={statusMap[currentReport.status]?.color}>
                                                {statusMap[currentReport.status]?.text}
                                            </Tag>
                                        </Descriptions.Item>
                                        <Descriptions.Item label="客户名称">{currentReport.clientName}</Descriptions.Item>
                                        <Descriptions.Item label="项目名称">{currentReport.projectName || '-'}</Descriptions.Item>
                                        <Descriptions.Item label="样品名称">{currentReport.sampleName}</Descriptions.Item>
                                        <Descriptions.Item label="编制人">{currentReport.preparer || '-'}</Descriptions.Item>
                                        <Descriptions.Item label="审核人">{currentReport.reviewer || '-'}</Descriptions.Item>
                                        <Descriptions.Item label="批准人">{currentReport.approver || '-'}</Descriptions.Item>
                                        <Descriptions.Item label="总体结论" span={2}>
                                            {currentReport.overallConclusion || '-'}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="创建时间" span={2}>
                                            {dayjs(currentReport.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                                        </Descriptions.Item>
                                    </Descriptions>
                                )
                            },
                            {
                                key: 'approval',
                                label: '审批记录',
                                children: (
                                    <div>
                                        {currentReport.approvalFlow?.length > 0 ? (
                                            <Timeline
                                                items={currentReport.approvalFlow.map(item => ({
                                                    color: item.action === 'reject' ? 'red' : 'green',
                                                    children: (
                                                        <div>
                                                            <strong>{actionTextMap[item.action] || item.action}</strong>
                                                            <span style={{ marginLeft: 8, color: '#999' }}>
                                                                {item.operator} - {dayjs(item.timestamp).format('YYYY-MM-DD HH:mm')}
                                                            </span>
                                                            {item.comment && <div style={{ color: '#666' }}>{item.comment}</div>}
                                                        </div>
                                                    ),
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

            {/* 生成客户报告弹窗 */}
            <Modal
                title="生成客户报告"
                open={generateModalOpen}
                onOk={handleGenerateSubmit}
                onCancel={() => setGenerateModalOpen(false)}
                confirmLoading={generating}
                okText="生成"
                cancelText="取消"
                width={700}
            >
                <div className="py-4">
                    <Form form={form} layout="vertical">
                        <Form.Item label="选择报告模板" name="templateId" rules={[{ required: true, message: '请选择模板' }]}>
                            <Select placeholder="选择客户报告模板" options={templates.map(t => ({ label: t.name, value: t.id }))} />
                        </Form.Item>

                        <Divider />

                        <Form.Item label="选择委托单" required>
                            <Select
                                style={{ width: '100%' }}
                                placeholder="选择委托单"
                                onChange={handleEntrustmentChange}
                                options={entrustments.map(e => ({
                                    value: e.id,
                                    label: `${e.entrustmentNo} - ${e.clientName}`
                                }))}
                                showSearch
                                filterOption={(input, option) =>
                                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                            />
                        </Form.Item>

                        {selectedEntrustment && (
                            <>
                                <Form.Item label="选择任务报告（可多选）" required>
                                    <Select
                                        mode="multiple"
                                        style={{ width: '100%' }}
                                        placeholder="选择要合并的任务报告"
                                        value={selectedTaskIds}
                                        onChange={setSelectedTaskIds}
                                        options={completedTasks.map(t => ({
                                            value: t.id,
                                            label: `${t.taskNo} - ${t.sampleName || '未命名'} ${t.testReport ? `(${t.testReport.reportNo})` : ''}`
                                        }))}
                                    />
                                    {completedTasks.length === 0 && (
                                        <p className="mt-2 text-gray-500 text-sm">该委托单暂无已完成的任务</p>
                                    )}
                                </Form.Item>

                                <div className="grid grid-cols-2 gap-4">
                                    <Form.Item name="clientName" label="客户名称" rules={[{ required: true }]}>
                                        <Input />
                                    </Form.Item>
                                    <Form.Item name="projectName" label="项目名称">
                                        <Input />
                                    </Form.Item>
                                </div>

                                <Form.Item name="sampleName" label="样品名称" rules={[{ required: true }]}>
                                    <Input />
                                </Form.Item>

                                <Form.Item name="overallConclusion" label="总体结论">
                                    <Input.TextArea rows={2} placeholder="总结论" />
                                </Form.Item>

                                <Form.Item name="backCoverContent" label="封底自定义内容">
                                    <Input.TextArea rows={3} placeholder="如有特殊声明或备注，请在此填写（将显示在报告封底）" />
                                </Form.Item>
                            </>
                        )}
                    </Form>
                </div>
            </Modal>

            {/* 提交审批弹窗 */}
            <Modal
                title="提交审批"
                open={submitModalOpen}
                onOk={handleSubmitConfirm}
                onCancel={() => setSubmitModalOpen(false)}
                confirmLoading={submitting}
                okText="确认提交"
                cancelText="取消"
            >
                <Form form={submitForm} layout="vertical">
                    <Form.Item name="operator" label="操作人">
                        <Input placeholder="请填写操作人" />
                    </Form.Item>
                    <Form.Item name="comment" label="审批意见">
                        <Input.TextArea rows={3} placeholder="选填，可以填写审批意见" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    )
}
