
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Form, Input, Row, Col, Spin, Tabs } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { showSuccess, showError } from '@/lib/confirm'
import ImageUpload from '@/components/upload/ImageUpload'
import DragSortList from '@/components/drag-sort/DragSortList'

interface EditPageClientProps {
    id: string
}

interface TestReport {
  id: string
  reportNo: string
  projectName?: string
}

export default function EditClientReportPageClient({ id }: EditPageClientProps) {
    const router = useRouter()
    const [form] = Form.useForm()
    const [loading, setLoading] = useState(false)
    const [initializing, setInitializing] = useState(true)
    const [availableReports, setAvailableReports] = useState<TestReport[]>([])
    const [selectedReports, setSelectedReports] = useState<TestReport[]>([])

    useEffect(() => {
        fetchData()
        fetchAvailableReports()
    }, [id])

    const fetchData = async () => {
        try {
            const res = await fetch(`/api/report/client/${id}`)
            const json = await res.json()
            if (json.success) {
                const data = json.data

                // 解析 coverData 和 backCoverData
                let coverImage = null
                let coverText = null
                let backCoverImage = null
                let backCoverText = null

                if (data.coverData) {
                    try {
                        const coverData = JSON.parse(data.coverData)
                        coverImage = coverData.image || null
                        coverText = coverData.text || null
                    } catch (e) {
                        console.error('解析 coverData 失败:', e)
                    }
                }

                if (data.backCoverData) {
                    try {
                        const backCoverData = JSON.parse(data.backCoverData)
                        backCoverImage = backCoverData.image || null
                        backCoverText = backCoverData.text || null
                    } catch (e) {
                        console.error('解析 backCoverData 失败:', e)
                    }
                }

                form.setFieldsValue({
                    ...data,
                    coverImage,
                    coverText,
                    backCoverImage,
                    backCoverText,
                })

                // 解析已选择的任务报告
                if (data.taskReportNos) {
                    try {
                        const reportNos = JSON.parse(data.taskReportNos)
                        // 从可用报告中找到对应的报告
                        const selected = availableReports.filter(r => reportNos.includes(r.reportNo))
                        setSelectedReports(selected)
                    } catch (e) {
                        console.error('解析 taskReportNos 失败:', e)
                    }
                }
            } else {
                showError('加载数据失败')
            }
        } catch (error) {
            console.error(error)
            showError('加载数据失败')
        } finally {
            setInitializing(false)
        }
    }

    const fetchAvailableReports = async () => {
        try {
            const res = await fetch('/api/test-report?status=approved&page=1&pageSize=100')
            const json = await res.json()
            if (json.success && json.data) {
                setAvailableReports(json.data.list || [])
            }
        } catch (error) {
            console.error('获取可用报告失败:', error)
        }
    }

    const handleSubmit = async (values: any) => {
        setLoading(true)
        try {
            // 构建提交数据
            const submitData = {
                ...values,
                coverData: values.coverImage || values.coverText ? JSON.stringify({
                    image: values.coverImage || null,
                    text: values.coverText || null,
                }) : null,
                backCoverData: values.backCoverImage || values.backCoverText ? JSON.stringify({
                    image: values.backCoverImage || null,
                    text: values.backCoverText || null,
                }) : null,
                taskReportNos: selectedReports.length > 0 ? JSON.stringify(selectedReports.map(r => r.reportNo)) : null,
            }

            // 删除临时字段
            delete submitData.coverImage
            delete submitData.coverText
            delete submitData.backCoverImage
            delete submitData.backCoverText

            const res = await fetch(`/api/report/client/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submitData),
            })
            const json = await res.json()

            if (json.success) {
                showSuccess('更新成功')
                router.push('/report/client')
            } else {
                showError(json.error?.message || '更新失败')
            }
        } catch (error: any) {
            showError(error.message || '更新失败')
        } finally {
            setLoading(false)
        }
    }

    const handleCancel = () => {
        router.back()
    }

    const handleReportToggle = (report: TestReport) => {
        const exists = selectedReports.find(r => r.id === report.id)
        if (exists) {
            setSelectedReports(selectedReports.filter(r => r.id !== report.id))
        } else {
            setSelectedReports([...selectedReports, report])
        }
    }

    if (initializing) {
        return (
            <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <Spin size="large" />
            </div>
        )
    }

    const tabItems = [
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
                    <Form.Item name="coverImage" label="首页图片">
                        <ImageUpload />
                    </Form.Item>
                    <Form.Item name="coverText" label="首页文字">
                        <Input.TextArea rows={4} placeholder="请输入首页文字" />
                    </Form.Item>
                </>
            )
        },
        {
            key: 'backCover',
            label: '尾页配置',
            children: (
                <>
                    <Form.Item name="backCoverImage" label="尾页图片">
                        <ImageUpload />
                    </Form.Item>
                    <Form.Item name="backCoverText" label="尾页文字">
                        <Input.TextArea rows={4} placeholder="请输入尾页文字" />
                    </Form.Item>
                </>
            )
        },
        {
            key: 'reports',
            label: '任务报告排序',
            children: (
                <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ flex: 1, border: '1px solid #d9d9d9', borderRadius: 4, padding: 16 }}>
                        <h4 style={{ marginTop: 0 }}>可用任务报告 ({availableReports.length})</h4>
                        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                            {availableReports.map(report => {
                                const isSelected = selectedReports.find(r => r.id === report.id)
                                return (
                                    <div
                                        key={report.id}
                                        onClick={() => handleReportToggle(report)}
                                        style={{
                                            padding: '8px 12px',
                                            margin: '4px 0',
                                            background: isSelected ? '#e6f7ff' : '#fff',
                                            border: '1px solid #d9d9d9',
                                            borderRadius: 4,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {report.reportNo} - {report.projectName || '无项目名'}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div style={{ flex: 1 }}>
                        <h4 style={{ marginTop: 0 }}>已选择 ({selectedReports.length})</h4>
                        {selectedReports.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>
                                暂无选择的报告
                            </div>
                        ) : (
                            <DragSortList
                                items={selectedReports}
                                onChange={(items) => setSelectedReports(items as TestReport[])}
                                renderItem={(item) => (
                                    <div>{item.reportNo} - {item.projectName || '无项目名'}</div>
                                )}
                            />
                        )}
                    </div>
                </div>
            )
        }
    ]

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
                <span style={{ fontSize: 20, fontWeight: 500, marginLeft: 8 }}>编辑客户报告</span>
            </div>

            <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                >
                    <Tabs items={tabItems} />

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
