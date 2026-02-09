'use client'

import { useState, useEffect } from 'react'
import { showSuccess, showError } from '@/lib/confirm'
import { useParams, useRouter } from 'next/navigation'
import { Card, Descriptions, Button, Table, Tag, Space, Form, Input, DatePicker } from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
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

export default function ReportEditPage() {
    const params = useParams()
    const router = useRouter()
    const reportId = params.id as string

    const [report, setReport] = useState<Report | null>(null)
    const [testData, setTestData] = useState<TestData[]>([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
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

            // 填充表单
            form.setFieldsValue({
                sampleName: reportData.sampleName,
                sampleNo: reportData.sampleNo,
                clientName: reportData.clientName,
                specification: reportData.specification,
                sampleQuantity: reportData.sampleQuantity,
                receivedDate: reportData.receivedDate ? dayjs(reportData.receivedDate) : null,
                tester: reportData.tester,
                reviewer: reportData.reviewer,
                overallConclusion: reportData.overallConclusion,
            })

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

    const handleSave = async () => {
        try {
            const values = await form.validateFields()
            setSaving(true)

            const res = await fetch(`/api/test-report/${reportId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sampleName: values.sampleName,
                    sampleNo: values.sampleNo,
                    clientName: values.clientName,
                    specification: values.specification,
                    sampleQuantity: values.sampleQuantity,
                    receivedDate: values.receivedDate ? values.receivedDate.toISOString() : null,
                    tester: values.tester,
                    reviewer: values.reviewer,
                    overallConclusion: values.overallConclusion,
                }),
            })

            const json = await res.json()
            if (res.ok && (json.success || json.data)) {
                showSuccess('保存成功')
                fetchReport()
            } else {
                showError(json.error?.message || json.error || '保存失败')
            }
        } catch (error: any) {
            showError(error.message || '保存失败')
        } finally {
            setSaving(false)
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

    const isEditable = report?.status === 'draft'

    if (!report) {
        return <div className="p-6">加载中...</div>
    }

    return (
        <div className="p-6">
            {/* 顶部操作栏 */}
            <div className="mb-4 flex justify-between items-center">
                <a onClick={() => router.back()} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#1677ff' }}>
                    <ArrowLeftOutlined /> 返回
                </a>
                <Space>
                    <Tag color={statusMap[report.status]?.color} style={{ fontSize: 14, padding: '4px 12px' }}>
                        {statusMap[report.status]?.text}
                    </Tag>
                    {isEditable && (
                        <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
                            保存
                        </Button>
                    )}
                </Space>
            </div>

            {/* 状态信息 */}
            <Card className="mb-4" size="small">
                <Descriptions column={4}>
                    <Descriptions.Item label="报告编号">{report.reportNo}</Descriptions.Item>
                    <Descriptions.Item label="创建时间">{dayjs(report.createdAt).format('YYYY-MM-DD')}</Descriptions.Item>
                    <Descriptions.Item label="发布日期">{report.issuedDate ? dayjs(report.issuedDate).format('YYYY-MM-DD') : '-'}</Descriptions.Item>
                </Descriptions>
            </Card>

            {/* 报告表单 */}
            <Card title="报告信息" className="mb-4">
                <Form form={form} layout="vertical" disabled={!isEditable}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                        <Form.Item name="clientName" label="客户名称">
                            <Input />
                        </Form.Item>
                        <Form.Item name="sampleName" label="样品名称">
                            <Input />
                        </Form.Item>
                        <Form.Item name="sampleNo" label="样品编号">
                            <Input />
                        </Form.Item>
                        <Form.Item name="specification" label="规格型号">
                            <Input />
                        </Form.Item>
                        <Form.Item name="sampleQuantity" label="样品数量">
                            <Input />
                        </Form.Item>
                        <Form.Item name="receivedDate" label="收样日期">
                            <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name="tester" label="检测人员">
                            <Input />
                        </Form.Item>
                        <Form.Item name="reviewer" label="审核人员">
                            <Input />
                        </Form.Item>
                    </div>
                    <Form.Item name="overallConclusion" label="检测结论">
                        <Input.TextArea rows={4} />
                    </Form.Item>
                </Form>
            </Card>

            {/* 检测数据（只读） */}
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
        </div>
    )
}
