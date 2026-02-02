'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Form, Input, Select, DatePicker, Spin } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { showSuccess, showError } from '@/lib/confirm'
import dayjs from 'dayjs'

interface EditPageClientProps {
    id: string
}

export default function EditSamplePageClient({ id }: EditPageClientProps) {
    const router = useRouter()
    const [form] = Form.useForm()
    const [loading, setLoading] = useState(false)
    const [initializing, setInitializing] = useState(true)

    useEffect(() => {
        fetchData()
    }, [id])

    const fetchData = async () => {
        try {
            const res = await fetch(`/api/sample/${id}`)
            const json = await res.json()
            if (json.success) {
                form.setFieldsValue({
                    ...json.data,
                    receivedDate: json.data.receivedDate ? dayjs(json.data.receivedDate) : null
                })
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
            const data = {
                ...values,
                receivedDate: values.receivedDate?.toISOString()
            }
            const res = await fetch(`/api/sample/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
            const json = await res.json()
            if (json.success) {
                showSuccess('更新成功')
                router.push('/sample/list')
            } else {
                showError(json.error?.message || '更新失败')
            }
        } catch (error) {
            showError('更新失败')
        } finally {
            setLoading(false)
        }
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
                <span style={{ fontSize: 20, fontWeight: 500, marginLeft: 8 }}>编辑样品</span>
            </div>

            <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item name="name" label="样品名称" rules={[{ required: true, message: '请输入样品名称' }]}>
                        <Input placeholder="请输入样品名称" />
                    </Form.Item>
                    <Form.Item name="type" label="样品类型">
                        <Select options={[
                            { value: '金属', label: '金属' },
                            { value: '塑料', label: '塑料' },
                            { value: '复合材料', label: '复合材料' },
                            { value: '其他', label: '其他' },
                        ]} />
                    </Form.Item>
                    <Form.Item name="specification" label="规格型号">
                        <Input placeholder="请输入规格型号" />
                    </Form.Item>
                    <Form.Item name="quantity" label="数量">
                        <Input placeholder="请输入数量" />
                    </Form.Item>
                    <Form.Item name="unit" label="单位">
                        <Input placeholder="如：个、件、kg" />
                    </Form.Item>
                    <Form.Item name="storageLocation" label="存放位置">
                        <Input placeholder="请输入存放位置" />
                    </Form.Item>
                    <Form.Item name="receivedDate" label="接收日期">
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="status" label="状态">
                        <Select options={[
                            { value: 'received', label: '已接收' },
                            { value: 'testing', label: '检测中' },
                            { value: 'completed', label: '已完成' },
                            { value: 'returned', label: '已归还' },
                        ]} />
                    </Form.Item>
                    <Form.Item name="remark" label="备注">
                        <Input.TextArea rows={2} placeholder="请输入备注" />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} style={{ marginRight: 8 }}>
                            提交
                        </Button>
                        <Button onClick={() => router.back()}>
                            取消
                        </Button>
                    </Form.Item>
                </Form>
            </div>
        </div>
    )
}
