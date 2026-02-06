
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Form, Input, Row, Col, message, Card, Tabs } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { showSuccess, showError } from '@/lib/confirm'
import ImageUpload from '@/components/upload/ImageUpload'
import DragSortList from '@/components/drag-sort/DragSortList'

interface TestReport {
  id: string
  reportNo: string
  projectName?: string
}

export default function CreateClientReportPageClient() {
    const router = useRouter()
    const [form] = Form.useForm()
    const [loading, setLoading] = useState(false)
    const [availableReports, setAvailableReports] = useState<TestReport[]>([])
    const [selectedReports, setSelectedReports] = useState<TestReport[]>([])

    useEffect(() => {
        // 加载可用的任务报告
        fetchAvailableReports()
    }, [])

    const fetchAvailableReports = async () => {
        try {
            const res = await fetch('/api/test-report?status=approved&page=1&pageSize=100')
            const json = await res.json()
            if (json.success && json.data) {
                setAvailableReports(json.data.list || [])
            }
        } catch (error) {
            console.error('加载任务报告失败:', error)
        }
    }

    const handleSubmit = async (values: any) => {
        setLoading(true)
        try {
            // 准备提交数据
            const submitData = {
                ...values,
                // 首页配置
                coverImage: values.coverImage || null,
                coverText: values.coverText || null,
                // 尾页配置
                backCoverImage: values.backCoverImage || null,
                backCoverText: values.backCoverText || null,
                // 任务报告排序
                taskReportOrder: JSON.stringify(selectedReports.map(r => r.id)),
            }

            const res = await fetch('/api/report/client', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submitData),
            })
            const json = await res.json()

            if (json.success) {
                showSuccess('创建成功')
                router.push('/report/client')
            } else {
                showError(json.error?.message || '创建失败')
            }
        } catch (error: any) {
            showError(error.message || '创建失败')
        } finally {
            setLoading(false)
        }
    }

    const handleCancel = () => {
        router.back()
    }

    const handleReportToggle = (report: TestReport) => {
        const isSelected = selectedReports.some(r => r.id === report.id)
        if (isSelected) {
            setSelectedReports(selectedReports.filter(r => r.id !== report.id))
        } else {
            setSelectedReports([...selectedReports, report])
        }
    }

    return (
        <div style={{ padding: '0 24px 24px', minHeight: '100vh', background: '#f0f2f5' }}>
            <div style={{ marginBottom: 16, paddingTop: 16 }}>
                <Button
                    type="link"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => router.back()}
                    style={{ paddingLeft: 0, fontSize: 16, color: '#000' }}
                >
                    返回列表
                </Button>
                <span style={{ fontSize: 20, fontWeight: 500, marginLeft: 8 }}>新增客户报告</span>
            </div>

            <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                >
                    <Tabs
                        defaultActiveKey="basic"
                        items={[
                            {
                                key: 'basic',
                                label: '基本信息',
                                children: (
                                    <>
                                        <Row gutter={16}>
                                            <Col span={12}>
                                                <Form.Item
                                                    name="clientName"
                                                    label="客户名称"
                                                    rules={[{ required: true, message: '请输入客户名称' }]}
                                                >
                                                    <Input placeholder="请输入客户名称" />
                                                </Form.Item>
                                            </Col>
                                            <Col span={12}>
                                                <Form.Item name="clientAddress" label="客户地址">
                                                    <Input placeholder="请输入客户地址" />
                                                </Form.Item>
                                            </Col>
                                        </Row>

                                        <Row gutter={16}>
                                            <Col span={12}>
                                                <Form.Item
                                                    name="sampleName"
                                                    label="样品名称"
                                                    rules={[{ required: true, message: '请输入样品名称' }]}
                                                >
                                                    <Input placeholder="请输入样品名称" />
                                                </Form.Item>
                                            </Col>
                                            <Col span={12}>
                                                <Form.Item name="sampleNo" label="样品编号">
                                                    <Input placeholder="请输入样品编号" />
                                                </Form.Item>
                                            </Col>
                                        </Row>

                                        <Row gutter={16}>
                                            <Col span={12}>
                                                <Form.Item name="specification" label="规格型号">
                                                    <Input placeholder="请输入规格型号" />
                                                </Form.Item>
                                            </Col>
                                            <Col span={12}>
                                                <Form.Item name="sampleQuantity" label="样品数量">
                                                    <Input placeholder="请输入样品数量" />
                                                </Form.Item>
                                            </Col>
                                        </Row>

                                        <Row gutter={16}>
                                            <Col span={12}>
                                                <Form.Item name="projectName" label="检测项目">
                                                    <Input placeholder="请输入检测项目" />
                                                </Form.Item>
                                            </Col>
                                            <Col span={12}>
                                                <Form.Item name="preparer" label="编制人">
                                                    <Input placeholder="请输入编制人" />
                                                </Form.Item>
                                            </Col>
                                        </Row>

                                        <Form.Item name="overallConclusion" label="总体结论">
                                            <Input.TextArea rows={4} placeholder="请输入总体结论" />
                                        </Form.Item>
                                    </>
                                )
                            },
                            {
                                key: 'cover',
                                label: '首页配置',
                                children: (
                                    <>
                                        <Form.Item
                                            name="coverImage"
                                            label="首页图片"
                                            tooltip="支持上传首页图片"
                                        >
                                            <ImageUpload />
                                        </Form.Item>
                                        <Form.Item
                                            name="coverText"
                                            label="首页文字"
                                            tooltip="首页显示的文字内容"
                                        >
                                            <Input.TextArea rows={4} placeholder="请输入首页文字内容" />
                                        </Form.Item>
                                    </>
                                )
                            },
                            {
                                key: 'backCover',
                                label: '尾页配置',
                                children: (
                                    <>
                                        <Form.Item
                                            name="backCoverImage"
                                            label="尾页图片"
                                            tooltip="支持上传尾页图片"
                                        >
                                            <ImageUpload />
                                        </Form.Item>
                                        <Form.Item
                                            name="backCoverText"
                                            label="尾页文字"
                                            tooltip="尾页显示的文字内容"
                                        >
                                            <Input.TextArea rows={4} placeholder="请输入尾页文字内容" />
                                        </Form.Item>
                                    </>
                                )
                            },
                            {
                                key: 'reports',
                                label: '任务报告排序',
                                children: (
                                    <>
                                        <div style={{ marginBottom: 16 }}>
                                            <p style={{ color: '#666', marginBottom: 8 }}>
                                                从下方任务报告列表中选择要包含的报告，然后拖拽调整顺序。
                                            </p>
                                            <div style={{ display: 'flex', gap: 16 }}>
                                                <div style={{ flex: 1 }}>
                                                    <h4>可用任务报告</h4>
                                                    <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #d9d9d9', borderRadius: 4, padding: 8 }}>
                                                        {availableReports.map(report => (
                                                            <div
                                                                key={report.id}
                                                                style={{
                                                                    padding: '8px',
                                                                    marginBottom: '8px',
                                                                    background: selectedReports.some(r => r.id === report.id) ? '#e6f7ff' : '#fff',
                                                                    border: '1px solid #d9d9d9',
                                                                    borderRadius: 4,
                                                                    cursor: 'pointer',
                                                                }}
                                                                onClick={() => handleReportToggle(report)}
                                                            >
                                                                <span style={{ fontWeight: 500 }}>{report.reportNo}</span>
                                                                <span style={{ marginLeft: 8, color: '#666' }}>
                                                                    {report.projectName || '无项目名称'}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <h4>已选择 ({selectedReports.length})</h4>
                                                    {selectedReports.length > 0 ? (
                                                        <DragSortList
                                                            items={selectedReports}
                                                            onChange={(items) => setSelectedReports(items as TestReport[])}
                                                            renderItem={(item) => (
                                                                <div>
                                                                    <span style={{ fontWeight: 500 }}>{item.reportNo}</span>
                                                                    <span style={{ marginLeft: 8, color: '#666' }}>
                                                                        {item.projectName || '无项目名称'}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        />
                                                    ) : (
                                                        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                                                            请从左侧选择任务报告
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )
                            }
                        ]}
                    />

                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} style={{ marginRight: 8 }}>
                            提交
                        </Button>
                        <Button onClick={handleCancel}>
                            取消
                        </Button>
                    </Form.Item>
                </Form>
            </div>
        </div>
    )
}
