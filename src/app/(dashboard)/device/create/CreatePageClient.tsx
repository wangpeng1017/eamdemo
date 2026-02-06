'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Form, Input, Select, DatePicker } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { showSuccess, showError } from '@/lib/confirm'

export default function CreateDevicePageClient() {
    const router = useRouter()
    const [form] = Form.useForm()
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (values: any) => {
        setLoading(true)
        try {
            const data = {
                ...values,
                calibrationDate: values.calibrationDate?.toISOString(),
                nextCalibration: values.nextCalibration?.toISOString(),
            }
            const res = await fetch('/api/device', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
            const json = await res.json()
            if (json.success) {
                showSuccess('创建成功')
                router.push('/device')
            } else {
                showError(json.error?.message || '创建失败')
            }
        } catch (error) {
            showError('创建失败')
        } finally {
            setLoading(false)
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
                <span style={{ fontSize: 20, fontWeight: 500, marginLeft: 8 }}>新增设备</span>
            </div>

            <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item name="name" label="设备名称" rules={[{ required: true, message: '请输入设备名称' }]}>
                        <Input placeholder="请输入设备名称" />
                    </Form.Item>
                    <Form.Item name="model" label="型号">
                        <Input placeholder="请输入型号" />
                    </Form.Item>
                    <Form.Item name="manufacturer" label="制造商">
                        <Input placeholder="请输入制造商" />
                    </Form.Item>
                    <Form.Item name="serialNumber" label="出厂编号">
                        <Input placeholder="请输入出厂编号" />
                    </Form.Item>
                    <Form.Item name="location" label="存放位置">
                        <Input placeholder="请输入存放位置" />
                    </Form.Item>
                    <Form.Item name="calibrationDate" label="上次校准日期">
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="nextCalibration" label="下次校准日期">
                        <DatePicker style={{ width: '100%' }} />
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
