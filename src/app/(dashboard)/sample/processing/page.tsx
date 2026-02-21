'use client'

import { useState, useEffect } from 'react'
import { Table, Button, Space, Tag, Modal, Form, Input, Select, DatePicker, InputNumber, message, Descriptions, Popconfirm } from 'antd'
import { showSuccess, showError } from '@/lib/confirm'
import { CheckCircleOutlined, CloseCircleOutlined, EyeOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface ProcessingRecord {
    id: string
    processNo: string
    sampleId: string
    processorName: string
    processType: string
    description: string | null
    sentDate: string
    expectedReturnDate: string | null
    actualReturnDate: string | null
    result: string | null
    quantity: string | null
    cost: number | null
    remark: string | null
    status: string
    createdAt: string
    sample: {
        id: string
        sampleNo: string
        name: string
        specification: string | null
        entrustment?: { entrustmentNo: string }
    }
    createdBy?: { name: string }
}

const processTypeMap: Record<string, string> = {
    cutting: '切割',
    grinding: '研磨',
    mounting: '镶嵌',
    polishing: '抛光',
    other: '其他',
}

const statusMap: Record<string, { text: string; color: string }> = {
    pending: { text: '待加工', color: 'default' },
    processing: { text: '加工中', color: 'processing' },
    completed: { text: '已完成', color: 'success' },
    cancelled: { text: '已取消', color: 'error' },
}

const resultMap: Record<string, { text: string; color: string }> = {
    qualified: { text: '合格', color: 'success' },
    unqualified: { text: '不合格', color: 'error' },
    partial: { text: '部分合格', color: 'warning' },
}

export default function SampleProcessingPage() {
    const [data, setData] = useState<ProcessingRecord[]>([])
    const [loading, setLoading] = useState(false)
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [statusFilter, setStatusFilter] = useState<string>()
    const [completeModalOpen, setCompleteModalOpen] = useState(false)
    const [currentRecord, setCurrentRecord] = useState<ProcessingRecord | null>(null)
    const [detailDrawerOpen, setDetailDrawerOpen] = useState(false)
    const [completeForm] = Form.useForm()

    const fetchData = async (p = page) => {
        setLoading(true)
        try {
            const statusParam = statusFilter ? `&status=${statusFilter}` : ''
            const res = await fetch(`/api/sample-processing?page=${p}&pageSize=10${statusParam}`)
            const json = await res.json()
            if (json.success && json.data) {
                setData(json.data.list || [])
                setTotal(json.data.total || 0)
            }
        } catch {
            showError('加载数据失败')
        }
        setLoading(false)
    }

    useEffect(() => { fetchData() }, [page, statusFilter])

    // 标记完成
    const handleComplete = (record: ProcessingRecord) => {
        setCurrentRecord(record)
        completeForm.resetFields()
        completeForm.setFieldsValue({
            actualReturnDate: dayjs(),
            result: 'qualified',
        })
        setCompleteModalOpen(true)
    }

    const handleCompleteSubmit = async () => {
        if (!currentRecord) return
        try {
            const values = await completeForm.validateFields()
            const res = await fetch(`/api/sample-processing/${currentRecord.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'complete',
                    actualReturnDate: values.actualReturnDate?.format('YYYY-MM-DD'),
                    result: values.result,
                })
            })
            const json = await res.json()
            if (res.ok && json.success) {
                showSuccess('加工完成')
                setCompleteModalOpen(false)
                fetchData()
            } else {
                showError(json.error?.message || '操作失败')
            }
        } catch (e) {
            console.error(e)
        }
    }

    // 取消加工
    const handleCancel = async (id: string) => {
        try {
            const res = await fetch(`/api/sample-processing/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'cancel' })
            })
            const json = await res.json()
            if (res.ok && json.success) {
                showSuccess('已取消')
                fetchData()
            } else {
                showError(json.error?.message || '操作失败')
            }
        } catch {
            showError('操作失败')
        }
    }

    // 查看详情
    const handleView = (record: ProcessingRecord) => {
        setCurrentRecord(record)
        setDetailDrawerOpen(true)
    }

    const columns: ColumnsType<ProcessingRecord> = [
        { title: '加工单号', dataIndex: 'processNo', width: 160 },
        {
            title: '样品', width: 150,
            render: (_, r) => (
                <div>
                    <div>{r.sample?.name || '-'}</div>
                    <div style={{ fontSize: 12, color: '#999' }}>{r.sample?.sampleNo}</div>
                </div>
            )
        },
        {
            title: '委托编号', width: 130,
            render: (_, r) => r.sample?.entrustment?.entrustmentNo || '-'
        },
        { title: '加工商', dataIndex: 'processorName', width: 150, ellipsis: true },
        {
            title: '加工类型', dataIndex: 'processType', width: 90,
        },
        {
            title: '送出日期', dataIndex: 'sentDate', width: 110,
            render: (d: string) => d ? dayjs(d).format('YYYY-MM-DD') : '-'
        },
        {
            title: '预计回样', dataIndex: 'expectedReturnDate', width: 110,
            render: (d: string) => {
                if (!d) return '-'
                const date = dayjs(d)
                const isOverdue = date.isBefore(dayjs(), 'day')
                return <span style={{ color: isOverdue ? '#f5222d' : undefined, fontWeight: isOverdue ? 'bold' : 'normal' }}>{date.format('YYYY-MM-DD')}</span>
            }
        },
        {
            title: '实际回样', dataIndex: 'actualReturnDate', width: 110,
            render: (d: string) => d ? dayjs(d).format('YYYY-MM-DD') : '-'
        },
        {
            title: '加工结果', dataIndex: 'result', width: 90,
            render: (r: string) => r ? <Tag color={resultMap[r]?.color}>{resultMap[r]?.text || r}</Tag> : '-'
        },
        {
            title: '状态', dataIndex: 'status', width: 90,
            render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text || s}</Tag>
        },
        {
            title: '操作', fixed: 'right', width: 160,
            render: (_, record) => (
                <Space size="small" style={{ whiteSpace: 'nowrap' }}>
                    <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record)} />
                    {record.status === 'processing' && (
                        <>
                            <Button
                                size="small"
                                type="primary"
                                icon={<CheckCircleOutlined />}
                                onClick={() => handleComplete(record)}
                            >
                                记录回样
                            </Button>
                            <Popconfirm title="确认取消加工？" onConfirm={() => handleCancel(record.id)} okText="确定" cancelText="取消">
                                <Button size="small" danger icon={<CloseCircleOutlined />} />
                            </Popconfirm>
                        </>
                    )}
                </Space>
            )
        }
    ]

    return (
        <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>样品加工管理</h2>
                <Space>
                    <Select
                        placeholder="状态筛选"
                        allowClear
                        style={{ width: 130 }}
                        value={statusFilter}
                        onChange={(v) => { setPage(1); setStatusFilter(v || undefined) }}
                        options={Object.entries(statusMap).map(([k, v]) => ({ value: k, label: v.text }))}
                    />
                </Space>
            </div>

            <Table
                rowKey="id"
                columns={columns}
                dataSource={data}
                loading={loading}
                scroll={{ x: 1400 }}
                pagination={{
                    current: page, total, pageSize: 10,
                    onChange: setPage, showSizeChanger: false
                }}
            />

            {/* 记录回样弹窗 */}
            <Modal
                title="记录加工回样"
                open={completeModalOpen}
                onOk={handleCompleteSubmit}
                onCancel={() => setCompleteModalOpen(false)}
                width={500}
            >
                {currentRecord && (
                    <div style={{ marginBottom: 16, padding: 12, background: '#f6ffed', borderRadius: 6 }}>
                        <div><strong>加工单号：</strong>{currentRecord.processNo}</div>
                        <div><strong>样品：</strong>{currentRecord.sample?.name}（{currentRecord.sample?.sampleNo}）</div>
                        <div><strong>加工商：</strong>{currentRecord.processorName}</div>
                    </div>
                )}
                <Form form={completeForm} layout="vertical">
                    <Form.Item name="actualReturnDate" label="实际回样日期" rules={[{ required: true, message: '请选择日期' }]}>
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="result" label="加工结果" rules={[{ required: true, message: '请选择结果' }]}>
                        <Select options={[
                            { value: 'qualified', label: '合格' },
                            { value: 'unqualified', label: '不合格' },
                            { value: 'partial', label: '部分合格' },
                        ]} />
                    </Form.Item>
                </Form>
            </Modal>

            {/* 详情弹窗 */}
            <Modal
                title="加工记录详情"
                open={detailDrawerOpen}
                onCancel={() => setDetailDrawerOpen(false)}
                footer={null}
                width={600}
            >
                {currentRecord && (
                    <Descriptions column={2} bordered size="small">
                        <Descriptions.Item label="加工单号">{currentRecord.processNo}</Descriptions.Item>
                        <Descriptions.Item label="状态">
                            <Tag color={statusMap[currentRecord.status]?.color}>{statusMap[currentRecord.status]?.text}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="样品名称">{currentRecord.sample?.name}</Descriptions.Item>
                        <Descriptions.Item label="样品编号">{currentRecord.sample?.sampleNo}</Descriptions.Item>
                        <Descriptions.Item label="加工商">{currentRecord.processorName}</Descriptions.Item>
                        <Descriptions.Item label="加工类型">{currentRecord.processType}</Descriptions.Item>
                        <Descriptions.Item label="加工描述" span={2}>{currentRecord.description || '-'}</Descriptions.Item>
                        <Descriptions.Item label="送出日期">{dayjs(currentRecord.sentDate).format('YYYY-MM-DD')}</Descriptions.Item>
                        <Descriptions.Item label="预计回样">{currentRecord.expectedReturnDate ? dayjs(currentRecord.expectedReturnDate).format('YYYY-MM-DD') : '-'}</Descriptions.Item>
                        <Descriptions.Item label="实际回样">{currentRecord.actualReturnDate ? dayjs(currentRecord.actualReturnDate).format('YYYY-MM-DD') : '-'}</Descriptions.Item>
                        <Descriptions.Item label="加工结果">
                            {currentRecord.result ? <Tag color={resultMap[currentRecord.result]?.color}>{resultMap[currentRecord.result]?.text}</Tag> : '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="加工数量">{currentRecord.quantity || '-'}</Descriptions.Item>
                        <Descriptions.Item label="加工费用">{currentRecord.cost ? `¥${currentRecord.cost}` : '-'}</Descriptions.Item>
                        <Descriptions.Item label="备注" span={2}>{currentRecord.remark || '-'}</Descriptions.Item>
                        <Descriptions.Item label="操作人">{currentRecord.createdBy?.name || '-'}</Descriptions.Item>
                        <Descriptions.Item label="创建时间">{dayjs(currentRecord.createdAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
                    </Descriptions>
                )}
            </Modal>
        </div>
    )
}
