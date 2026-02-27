'use client'

import { useState, useEffect, useMemo } from 'react'
import { showSuccess, showError } from '@/lib/confirm'
import { useParams, useRouter } from 'next/navigation'
import { Card, Button, Tag, Space, Form, Input, DatePicker, App, Spin } from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { useGoBack } from '@/hooks/useGoBack'
import dayjs from 'dayjs'

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

    createdAt: string
    issuedDate: string | null
    taskId: string | null
    task?: {
        id: string
        taskNo: string
    }
}



import { parseSheetData, type CellInfo } from '@/lib/sheet-parser'

export default function ReportEditPage() {
    const params = useParams()
    const router = useRouter()
    const goBack = useGoBack('/report/task-generate')
    const { message } = App.useApp()
    const reportId = params.id as string

    const [report, setReport] = useState<Report | null>(null)
    const [rawSheetData, setRawSheetData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [form] = Form.useForm()

    const tableData = useMemo(() => {
        if (!rawSheetData) return { headers: [], rows: [] }
        return parseSheetData(rawSheetData)
    }, [rawSheetData])

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

            // 从关联的任务加载 sheetData
            if (reportData.taskId) {
                try {
                    const taskRes = await fetch(`/api/task/${reportData.taskId}`)
                    if (taskRes.ok) {
                        const taskJson = await taskRes.json()
                        const taskData = taskJson.data || taskJson
                        if (taskData?.sheetData) {
                            setRawSheetData(taskData.sheetData)
                        }
                    }
                } catch (e) {
                    console.error('[Report] 加载任务 sheetData 失败:', e)
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
                message.success({ content: '保存成功', duration: 3 })
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

    if (loading) {
        return <div className="p-6 text-center"><Spin size="large" /></div>
    }

    if (!report) {
        return <div className="p-6 text-center text-gray-500">报告不存在</div>
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* 顶部操作栏 */}
            <div className="mb-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Button
                        icon={<ArrowLeftOutlined />}
                        onClick={() => goBack()}
                    >
                        返回
                    </Button>
                    <h1 className="text-xl font-medium m-0">
                        报告编辑 - {report.reportNo}
                    </h1>
                </div>
                <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
                    保存
                </Button>
            </div>

            {/* 报告基本信息 */}
            <Card className="mb-4" title="报告信息">
                <Form form={form} layout="vertical">
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
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Card>

            {/* 检测数据 - 支持合并单元格 */}
            <Card title="检测数据" className="mb-4">
                {tableData.headers.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: '13px',
                        }}>
                            <thead>
                                <tr>
                                    {tableData.headers.map((h, i) => (
                                        <th key={i} style={{
                                            border: '1px solid #d9d9d9',
                                            padding: '8px 12px',
                                            backgroundColor: '#fafafa',
                                            fontWeight: 600,
                                            textAlign: 'center',
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {h || `列${i + 1}`}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {tableData.rows.map((row, ri) => (
                                    <tr key={ri}>
                                        {row.map((cell, ci) => {
                                            if (cell.hidden) return null
                                            return (
                                                <td
                                                    key={ci}
                                                    rowSpan={cell.rowSpan}
                                                    colSpan={cell.colSpan}
                                                    style={{
                                                        border: '1px solid #d9d9d9',
                                                        padding: '6px 12px',
                                                        textAlign: ci === 0 ? 'center' : 'left',
                                                        verticalAlign: cell.rowSpan && cell.rowSpan > 1 ? 'middle' : undefined,
                                                        fontWeight: ci === 0 ? 500 : undefined,
                                                    }}
                                                >
                                                    {cell.text}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    loading ? (
                        <div className="p-8 text-center text-gray-400">加载检测数据中...</div>
                    ) : (
                        <div className="p-8 text-center text-gray-400">
                            暂无检测数据
                        </div>
                    )
                )}
            </Card>
        </div>
    )
}
