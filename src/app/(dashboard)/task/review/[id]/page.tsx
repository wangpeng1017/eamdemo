'use client'

import { useState, useEffect } from 'react'
import { showSuccess, showError } from '@/lib/confirm'
import { useParams, useRouter } from 'next/navigation'
import { Card, Descriptions, Button, Modal, Form, Input, message, Tag, Space, Spin } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import dynamic from 'next/dynamic'

// ⚠️ 关键修复：禁用 SSR，避免 Fortune-sheet 在服务端执行 DOM 操作
const DataSheet = dynamic(() => import('@/components/DataSheet'), {
    ssr: false,
    loading: () => (
        <div className="flex h-96 items-center justify-center">
            <Spin size="large" tip="正在加载表格编辑器..." />
        </div>
    )
})

interface Task {
    id: string
    taskNo: string
    sampleName: string | null
    sample?: { sampleNo: string; name: string }
    device?: { deviceNo: string; name: string }
    testItems?: string[]
    status: string
    summary?: string
    conclusion?: string
    submittedAt?: string
    submittedBy?: string
    assignedTo?: { name: string }
}

export default function TaskReviewPage() {
    const params = useParams()
    const router = useRouter()
    const taskId = params.id as string

    const [task, setTask] = useState<Task | null>(null)
    const [sheetData, setSheetData] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [reviewModalOpen, setReviewModalOpen] = useState(false)
    const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve')
    const [form] = Form.useForm()

    // 加载任务数据
    useEffect(() => {
        fetchTask()
    }, [taskId])

    const fetchTask = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/task/${taskId}`)
            if (!res.ok) throw new Error("获取任务失败")
            const json = await res.json()

            const taskData = json.data || json
            setTask(taskData)

            // 加载 sheetData
            if (taskData.sheetData) {
                try {
                    const parsed = typeof taskData.sheetData === 'string'
                        ? JSON.parse(taskData.sheetData)
                        : taskData.sheetData

                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setSheetData(parsed)
                    }
                } catch (e) {
                    console.error("解析 sheetData 失败", e)
                }
            }
        } catch (error) {
            showError("获取任务失败")
        } finally {
            setLoading(false)
        }
    }

    const handleReview = (action: 'approve' | 'reject') => {
        setReviewAction(action)
        setReviewModalOpen(true)
    }

    const handleReviewSubmit = async () => {
        try {
            const values = await form.validateFields()
            setLoading(true)

            const res = await fetch(`/api/task/${taskId}/data`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: reviewAction,
                    reviewComment: values.comment
                })
            })

            if (res.ok) {
                showSuccess(reviewAction === 'approve' ? '审核通过，任务已完成' : '已驳回，请检测人员修改')
                router.push('/task/all')
            } else {
                const data = await res.json()
                showError(data.error || '操作失败')
            }
        } catch (error) {
            showError('操作失败')
        } finally {
            setLoading(false)
            setReviewModalOpen(false)
            form.resetFields()
        }
    }

    if (!task) {
        return <div className="p-6">加载中...</div>
    }

    return (
        <div className="p-6">
            <div className="mb-4">
                <h1 className="text-2xl font-bold">任务审核 - {task.taskNo}</h1>
            </div>

            {/* 任务基本信息 */}
            <Card title="任务信息" className="mb-4">
                <Descriptions column={2} bordered>
                    <Descriptions.Item label="任务编号">{task.taskNo}</Descriptions.Item>
                    <Descriptions.Item label="任务状态">
                        <Tag color={task.status === 'pending_review' ? 'orange' : 'blue'}>
                            {task.status === 'pending_review' ? '待审核' : task.status}
                        </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="样品名称">{task.sampleName || '-'}</Descriptions.Item>
                    <Descriptions.Item label="样品编号">{task.sample?.sampleNo || '-'}</Descriptions.Item>
                    <Descriptions.Item label="检测设备">{task.device?.name || '-'}</Descriptions.Item>
                    <Descriptions.Item label="检测人员">{task.assignedTo?.name || '-'}</Descriptions.Item>
                    <Descriptions.Item label="提交时间">
                        {task.submittedAt ? new Date(task.submittedAt).toLocaleString() : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="提交人">{task.submittedBy || '-'}</Descriptions.Item>
                </Descriptions>
            </Card>

            {/* 检测项目 */}
            {task.testItems && task.testItems.length > 0 && (
                <Card title="检测项目" className="mb-4">
                    <Space wrap>
                        {task.testItems.map((item, index) => (
                            <Tag key={index} color="blue">{item}</Tag>
                        ))}
                    </Space>
                </Card>
            )}

            {/* 检测数据 */}
            <Card title="检测数据" className="mb-4">
                <DataSheet data={sheetData} readonly={true} height={500} />
            </Card>

            {/* 检测总结 */}
            <Card title="检测总结" className="mb-4">
                <Descriptions column={1} bordered>
                    <Descriptions.Item label="检测摘要">
                        {task.summary || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="检测结论">
                        {task.conclusion || '-'}
                    </Descriptions.Item>
                </Descriptions>
            </Card>

            {/* 审核按钮 */}
            {task.status === 'pending_review' && (
                <div className="flex justify-end gap-2">
                    <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
                        返回
                    </Button>
                    <Button
                        danger
                        icon={<CloseCircleOutlined />}
                        onClick={() => handleReview('reject')}
                        loading={loading}
                    >
                        驳回
                    </Button>
                    <Button
                        type="primary"
                        icon={<CheckCircleOutlined />}
                        onClick={() => handleReview('approve')}
                        loading={loading}
                    >
                        审核通过
                    </Button>
                </div>
            )}

            {task.status !== 'pending_review' && (
                <div className="flex justify-end">
                    <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
                        返回
                    </Button>
                </div>
            )}

            {/* 审核确认弹窗 */}
            <Modal
                title={reviewAction === 'approve' ? '审核通过确认' : '驳回确认'}
                open={reviewModalOpen}
                onOk={handleReviewSubmit}
                onCancel={() => {
                    setReviewModalOpen(false)
                    form.resetFields()
                }}
                confirmLoading={loading}
                okText="确定"
                cancelText="取消"
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        name="comment"
                        label="审核意见"
                        rules={reviewAction === 'reject' ? [{ required: true, message: '驳回时必须填写原因' }] : []}
                    >
                        <Input.TextArea
                            rows={4}
                            placeholder={reviewAction === 'approve' ? '选填，可以填写审核意见' : '必填，请说明驳回原因'}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    )
}
