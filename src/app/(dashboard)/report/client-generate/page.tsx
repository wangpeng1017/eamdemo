'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Space, Tag, Modal, Select, message, Card, Statistic, Row, Col, Form, Input, Descriptions } from 'antd'
import { PlusOutlined, EyeOutlined, FileTextOutlined } from '@ant-design/icons'
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
    createdAt: string
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

const statusMap: Record<string, { text: string; color: string }> = {
    draft: { text: '草稿', color: 'default' },
    pending_review: { text: '待审核', color: 'processing' },
    pending_approve: { text: '待批准', color: 'warning' },
    approved: { text: '已批准', color: 'success' },
    issued: { text: '已发布', color: 'cyan' },
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
    const [selectedEntrustment, setSelectedEntrustment] = useState<Entrustment | null>(null)
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])
    const [generating, setGenerating] = useState(false)
    const [form] = Form.useForm()

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
            message.error('获取报告列表失败')
        } finally {
            setLoading(false)
        }
    }

    const fetchEntrustments = async () => {
        try {
            const res = await fetch('/api/entrustment?pageSize=100')
            const json = await res.json()
            const list = json.data?.list || json.list || []
            // 只显示有已完成任务的委托单
            const filtered = list.filter((e: Entrustment) =>
                e.testTasks?.some(t => t.status === 'completed')
            )
            setEntrustments(filtered)
        } catch (error) {
            message.error('获取委托单失败')
        }
    }

    useEffect(() => {
        fetchData()
    }, [page])

    const handleGenerate = () => {
        fetchEntrustments()
        setSelectedEntrustment(null)
        setSelectedTaskIds([])
        form.resetFields()
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
            message.error('请选择委托单和至少一个任务')
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
                    clientName: values.clientName,
                    projectName: values.projectName,
                    sampleName: values.sampleName,
                    overallConclusion: values.overallConclusion,
                })
            })

            const json = await res.json()

            if (res.ok && json.success) {
                message.success('客户报告生成成功')
                setGenerateModalOpen(false)
                fetchData()
            } else {
                message.error(json.error || '报告生成失败')
            }
        } catch (error) {
            message.error('报告生成失败')
        } finally {
            setGenerating(false)
        }
    }

    const handleView = (id: string) => {
        router.push(`/report/client/${id}`)
    }

    const columns: ColumnsType<ClientReport> = [
        { title: '报告编号', dataIndex: 'reportNo', width: 150 },
        { title: '项目名称', dataIndex: 'projectName', width: 150 },
        { title: '客户名称', dataIndex: 'clientName', width: 150 },
        { title: '样品名称', dataIndex: 'sampleName', width: 150 },
        {
            title: '包含任务',
            dataIndex: 'taskReportNos',
            width: 150,
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
            width: 100,
            render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag>
        },
        { title: '编制人', dataIndex: 'preparer', width: 100 },
        {
            title: '创建时间',
            dataIndex: 'createdAt',
            width: 160,
            render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm')
        },
        {
            title: '操作',
            width: 80,
            render: (_, record) => (
                <Button
                    size="small"
                    type="link"
                    icon={<EyeOutlined />}
                    onClick={() => handleView(record.id)}
                />
            )
        }
    ]

    // 获取已完成的任务
    const completedTasks = selectedEntrustment?.testTasks?.filter(t => t.status === 'completed') || []

    return (
        <div className="p-6">
            <div className="mb-4">
                <h1 className="text-2xl font-bold mb-4">客户报告生成</h1>

                <Row gutter={16} className="mb-4">
                    <Col span={6}>
                        <Card>
                            <Statistic title="客户报告总数" value={total} prefix={<FileTextOutlined />} />
                        </Card>
                    </Col>
                </Row>
            </div>

            <div className="mb-4 flex justify-between">
                <div></div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleGenerate}
                >
                    生成客户报告
                </Button>
            </div>

            <Table
                rowKey="id"
                columns={columns}
                dataSource={data}
                loading={loading}
                pagination={{
                    current: page,
                    pageSize: 10,
                    total,
                    onChange: setPage,
                    showSizeChanger: false,
                    showTotal: (total) => `共 ${total} 条`
                }}
            />

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

                                <Form.Item name="clientName" label="客户名称" rules={[{ required: true }]}>
                                    <Input />
                                </Form.Item>

                                <Form.Item name="projectName" label="项目名称">
                                    <Input />
                                </Form.Item>

                                <Form.Item name="sampleName" label="样品名称" rules={[{ required: true }]}>
                                    <Input />
                                </Form.Item>

                                <Form.Item name="overallConclusion" label="总体结论">
                                    <Input.TextArea rows={3} placeholder="请填写客户报告的总体结论" />
                                </Form.Item>
                            </>
                        )}
                    </Form>
                </div>
            </Modal>
        </div>
    )
}
