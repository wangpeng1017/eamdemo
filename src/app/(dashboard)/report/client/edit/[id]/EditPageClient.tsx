'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Form, Input, Row, Col, Spin } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { showSuccess, showError } from '@/lib/confirm'
import dayjs from 'dayjs'

interface EditPageClientProps {
    id: string
}

export default function EditClientReportPageClient({ id }: EditPageClientProps) {
    const router = useRouter()
    const [form] = Form.useForm()
    const [loading, setLoading] = useState(false)
    const [initializing, setInitializing] = useState(true)

    useEffect(() => {
        fetchData()
    }, [id])

    const fetchData = async () => {
        try {
            const res = await fetch(`/api/report/client/${id}`)
            const json = await res.json()
            if (json.success) {
                form.setFieldsValue(json.data)
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

    const handleSubmit = async (values: any) => {
        setLoading(true)
        try {
            const res = await fetch(`/api/report/client/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
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

    if (initializing) {
        return (
            <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <Spin size="large" />
            </div>
        )
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
                <span style={{ fontSize: 20, fontWeight: 500, marginLeft: 8 }}>编辑客户报告</span>
            </div>

            <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                >
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
