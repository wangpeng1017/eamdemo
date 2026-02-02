'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Form, Input, InputNumber, Select, Spin, Row, Col } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { showSuccess, showError } from '@/lib/confirm'

const unitOptions = [
  { value: '瓶', label: '瓶' },
  { value: '盒', label: '盒' },
  { value: '个', label: '个' },
  { value: '支', label: '支' },
  { value: 'ml', label: 'ml' },
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: '套', label: '套' },
]

interface EditPageClientProps {
    id: string
}

export default function EditConsumablePageClient({ id }: EditPageClientProps) {
    const router = useRouter()
    const [form] = Form.useForm()
    const [loading, setLoading] = useState(false)
    const [initializing, setInitializing] = useState(true)
    const [categories, setCategories] = useState<any[]>([])

    useEffect(() => {
        Promise.all([loadCategories(), fetchData()])
    }, [id])

    const loadCategories = async () => {
        try {
            const res = await fetch('/api/consumable-category')
            const data = await res.json()
            if (data.success) {
                setCategories(data.data.list || data.data || [])
            }
        } catch {
            // 分类加载失败不影响主功能
        }
    }

    const fetchData = async () => {
        try {
            const res = await fetch(`/api/consumable/${id}`)
            const json = await res.json()
            if (json.success) {
                form.setFieldsValue({
                    ...json.data,
                    expiryDate: json.data.expiryDate ? json.data.expiryDate.split('T')[0] : null,
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
            const res = await fetch(`/api/consumable/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values)
            })
            const json = await res.json()
            if (json.success) {
                showSuccess('更新成功')
                router.push('/consumable/info')
            } else {
                showError(json.message || '更新失败')
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
                <span style={{ fontSize: 20, fontWeight: 500, marginLeft: 8 }}>编辑易耗品</span>
            </div>

            <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="code" label="编码" rules={[{ required: true, message: '请输入编码' }]}>
                                <Input placeholder="如: HX001" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
                                <Input placeholder="请输入名称" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="categoryId" label="分类">
                                <Select
                                    allowClear
                                    placeholder="选择分类"
                                    options={categories.map(c => ({ value: c.id, label: c.name }))}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="specification" label="规格">
                                <Input placeholder="如: 500ml/瓶" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="unit" label="单位" rules={[{ required: true, message: '请选择单位' }]}>
                                <Select options={unitOptions} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="unitPrice" label="单价 (元)" rules={[{ required: true, message: '请输入单价' }]}>
                                <InputNumber min={0} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="currentStock" label="当前库存" rules={[{ required: true, message: '请输入当前库存' }]}>
                                <InputNumber min={0} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="minStock" label="最低库存" rules={[{ required: true, message: '请输入最低库存' }]}>
                                <InputNumber min={0} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="maxStock" label="最高库存" rules={[{ required: true, message: '请输入最高库存' }]}>
                                <InputNumber min={0} style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="supplier" label="供应商">
                                <Input placeholder="请输入供应商" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="location" label="存放位置">
                                <Input placeholder="如: A-1-1" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="expiryDate" label="有效期">
                                <Input type="date" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="remark" label="备注">
                        <Input.TextArea rows={2} placeholder="请输入备注" />
                    </Form.Item>

                    <Form.Item name="status" label="状态">
                        <Select options={[
                            { value: 'normal', label: '正常' },
                            { value: 'low', label: '库存不足' },
                            { value: 'out', label: '缺货' },
                            { value: 'expired', label: '已过期' },
                        ]} />
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
