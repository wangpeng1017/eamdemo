'use client'

import { useState, useEffect } from 'react'
import { Form, Input, InputNumber, Select, DatePicker, Row, Col, Divider, Button, Card, Space, message, Table } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import SampleTestItemTable, { SampleTestItemData } from '@/components/SampleTestItemTable'
import { showError, showSuccess } from '@/lib/confirm'
import dayjs from 'dayjs'
import { useRouter } from 'next/navigation'

interface ContractFormProps {
    initialValues?: any
    mode: 'create' | 'edit'
    onSubmit: (values: any) => Promise<void>
    loading?: boolean
}

export default function ContractForm({ initialValues, mode, onSubmit, loading }: ContractFormProps) {
    const [form] = Form.useForm()
    const router = useRouter()
    const [clients, setClients] = useState<any[]>([])
    const [testTemplates, setTestTemplates] = useState<any[]>([])
    const [contractItems, setContractItems] = useState<any[]>([])
    const [sampleTestItems, setSampleTestItems] = useState<SampleTestItemData[]>([])
    const [clientsLoading, setClientsLoading] = useState(false)

    useEffect(() => {
        fetchClients()
        fetchTestTemplates()

        if (initialValues) {
            // 处理日期格式
            const formData = {
                ...initialValues,
                signDate: initialValues.signDate ? dayjs(initialValues.signDate) : null,
                startDate: initialValues.startDate ? dayjs(initialValues.startDate) : null,
                endDate: initialValues.endDate ? dayjs(initialValues.endDate) : null,
            }
            form.setFieldsValue(formData)

            // 初始化明细
            if (initialValues.items) {
                setContractItems(initialValues.items.map((item: any) => ({
                    ...item,
                    quantity: Number(item.quantity) || 1,
                    unitPrice: Number(item.unitPrice) || 0,
                    totalPrice: Number(item.totalPrice) || 0,
                })))
            }

            // 初始样品检测项
            if (initialValues.sampleTestItems) {
                setSampleTestItems(initialValues.sampleTestItems)
            }
        } else {
            // 默认值
            form.setFieldsValue({
                signDate: dayjs(),
                prepaymentRatio: 30,
            })
        }
    }, [initialValues, form])

    const fetchClients = async () => {
        setClientsLoading(true)
        try {
            const res = await fetch('/api/entrustment/client?status=approved&pageSize=1000')
            const json = await res.json()
            setClients(json.list || [])
        } catch (error) {
            console.error('[ContractForm] 获取客户列表失败:', error)
        } finally {
            setClientsLoading(false)
        }
    }

    const fetchTestTemplates = async () => {
        try {
            const res = await fetch('/api/test-template?pageSize=1000')
            const json = await res.json()
            const templates = (json.success && json.data?.list) || json.list || []
            setTestTemplates(templates)
        } catch (error) {
            console.error('[ContractForm] 获取检测项目列表失败:', error)
        }
    }

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...contractItems]
        const item = { ...newItems[index] }
        // @ts-ignore
        item[field] = value
        item.totalPrice = (item.quantity || 1) * (item.unitPrice || 0)
        newItems[index] = item
        setContractItems(newItems)

        // 自动计算合同总额
        const total = newItems.reduce((sum, i) => sum + (i.totalPrice || 0), 0)
        form.setFieldsValue({ amount: total })

        // Recalculate prepayment
        const ratio = form.getFieldValue('prepaymentRatio') || 0
        form.setFieldsValue({
            prepaymentAmount: total ? (total * ratio / 100) : 0
        })
    }

    const removeItem = (index: number) => {
        const newItems = contractItems.filter((_, i) => i !== index)
        setContractItems(newItems)
        const total = newItems.reduce((sum, i) => sum + (i.totalPrice || 0), 0)
        form.setFieldsValue({ amount: total })

        const ratio = form.getFieldValue('prepaymentRatio') || 0
        form.setFieldsValue({
            prepaymentAmount: total ? (total * ratio / 100) : 0
        })
    }

    const handleAddItem = () => {
        setContractItems([...contractItems, { serviceItem: '', methodStandard: '', quantity: 1, unitPrice: 0, totalPrice: 0 }])
    }

    const handleClientChange = (clientId: string) => {
        const client = clients.find(c => c.id === clientId)
        if (client) {
            form.setFieldsValue({
                clientName: client.name,
                clientContact: client.contact || '',
                clientPhone: client.phone || '',
                clientAddress: client.address || '',
            })
        }
    }

    const onFinish = async (values: any) => {
        const submitData = {
            ...values,
            signDate: values.signDate?.toISOString(),
            startDate: values.startDate?.toISOString(),
            endDate: values.endDate?.toISOString(),
            items: contractItems,
            sampleTestItems: sampleTestItems, // 传递样品检测项数据给父组件处理
        }
        await onSubmit(submitData)
    }

    return (
        <Card bordered={false}>
            <Form form={form} layout="vertical" onFinish={onFinish}>

                {/* ========== ① 基本信息 ========== */}
                <Divider orientation="left" orientationMargin="0">① 基本信息</Divider>
                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item name="clientId" label="客户名称" rules={[{ required: true, message: '请选择客户' }]}>
                            <Select
                                showSearch
                                allowClear
                                placeholder="选择客户"
                                loading={clientsLoading}
                                optionFilterProp="label"
                                options={clients.map(c => ({ value: c.id, label: c.name }))}
                                onChange={handleClientChange}
                            />
                        </Form.Item>
                        <Form.Item name="clientName" hidden>
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="clientContact" label="联系人" rules={[{ required: true, message: '请输入联系人' }]}>
                            <Input placeholder="请输入联系人" />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="clientPhone" label="联系电话" rules={[{ required: true, message: '请输入联系电话' }]}>
                            <Input placeholder="请输入联系电话" />
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item name="clientAddress" label="客户地址">
                    <Input placeholder="请输入客户地址" />
                </Form.Item>

                {/* ========== ② 报价明细 ========== */}
                <Divider orientation="left" orientationMargin="0">② 报价明细</Divider>
                <Table
                    dataSource={contractItems}
                    rowKey={(record, index) => index!.toString()}
                    pagination={false}
                    size="small"
                    columns={[
                        {
                            title: '检测项目',
                            dataIndex: 'serviceItem',
                            render: (text, record, index) => (
                                <Select
                                    showSearch
                                    optionFilterProp="label"
                                    style={{ width: '100%' }}
                                    value={text}
                                    onChange={(val, option) => {
                                        updateItem(index, 'serviceItem', val)
                                        const method = (option as any)?.method
                                        if (method) updateItem(index, 'methodStandard', method)
                                    }}
                                    options={testTemplates.map(t => ({
                                        value: t.name,
                                        label: t.name,
                                        method: t.schema ? (JSON.parse(typeof t.schema === 'string' ? t.schema : JSON.stringify(t.schema)).header?.methodBasis || t.method) : t.method
                                    }))}
                                />
                            )
                        },
                        {
                            title: '方法/标准',
                            dataIndex: 'methodStandard',
                            render: (text, record, index) => (
                                <Input value={text} onChange={e => updateItem(index, 'methodStandard', e.target.value)} />
                            )
                        },
                        {
                            title: '数量',
                            dataIndex: 'quantity',
                            width: 100,
                            render: (val, record, index) => (
                                <InputNumber min={1} value={val} onChange={v => updateItem(index, 'quantity', v)} />
                            )
                        },
                        {
                            title: '单价',
                            dataIndex: 'unitPrice',
                            width: 120,
                            render: (val, record, index) => (
                                <InputNumber min={0} value={val} prefix="¥" onChange={v => updateItem(index, 'unitPrice', v)} />
                            )
                        },
                        {
                            title: '总价',
                            dataIndex: 'totalPrice',
                            width: 120,
                            render: (val) => `¥${Number(val || 0).toFixed(2)}`
                        },
                        {
                            title: '操作',
                            key: 'action',
                            width: 80,
                            render: (_, record, index) => (
                                <Button danger type="text" icon={<DeleteOutlined />} onClick={() => removeItem(index)} />
                            )
                        }
                    ]}
                    footer={() => (
                        <Button type="dashed" onClick={handleAddItem} block icon={<PlusOutlined />}>
                            添加项目
                        </Button>
                    )}
                />

                {/* ========== ③ 合同条款与金额 ========== */}
                <Divider orientation="left" orientationMargin="0">③ 合同条款与金额</Divider>
                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item name="amount" label="合同金额" rules={[{ required: true, message: '请输入合同金额' }]}>
                            <InputNumber
                                style={{ width: '100%' }}
                                min={0}
                                precision={2}
                                prefix="¥"
                                onChange={(val) => {
                                    const ratio = form.getFieldValue('prepaymentRatio') || 0
                                    form.setFieldsValue({
                                        prepaymentAmount: val ? (val * ratio / 100) : 0,
                                    })
                                }}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="prepaymentRatio" label="预付款比例（%）">
                            <InputNumber
                                style={{ width: '100%' }}
                                min={0}
                                max={100}
                                onChange={(val) => {
                                    const amount = form.getFieldValue('amount') || 0
                                    form.setFieldsValue({
                                        prepaymentAmount: amount ? (amount * (val || 0) / 100) : 0,
                                    })
                                }}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="prepaymentAmount" label="预付款金额">
                            <InputNumber
                                style={{ width: '100%' }}
                                min={0}
                                precision={2}
                                prefix="¥"
                                readOnly
                            />
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item name="signDate" label="签订日期" rules={[{ required: true, message: '请选择签订日期' }]}>
                            <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="startDate" label="合同开始日期" rules={[{ required: true, message: '请选择开始日期' }]}>
                            <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="endDate" label="合同结束日期" rules={[{ required: true, message: '请选择结束日期' }]}>
                            <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item name="paymentTerms" label="付款条款">
                    <Input.TextArea
                        rows={2}
                        placeholder="例如：合同签订后预付30%，检测完成后支付剩余70%"
                    />
                </Form.Item>
                <Form.Item name="deliveryTerms" label="交付条款">
                    <Input.TextArea
                        rows={2}
                        placeholder="例如：检测完成后5个工作日内出具检测报告，报告以电子版和纸质版形式交付"
                    />
                </Form.Item>
                <Form.Item name="remark" label="备注">
                    <Input.TextArea rows={2} placeholder="请输入备注" />
                </Form.Item>

                {/* ========== ④ 样品及检测要求 ========== */}
                <Divider orientation="left" orientationMargin="0">④ 样品及检测要求</Divider>
                <SampleTestItemTable
                    bizType="contract"
                    bizId={initialValues?.id}
                    value={sampleTestItems}
                    onChange={setSampleTestItems}
                />

                {/* 底部操作栏 */}
                <div style={{ marginTop: 24 }}>
                    <Form.Item>
                        <Space size="middle">
                            <Button onClick={() => router.back()} size="large">取消</Button>
                            <Button type="primary" htmlType="submit" loading={loading} size="large">
                                {mode === 'create' ? '创建合同' : '保存修改'}
                            </Button>
                        </Space>
                    </Form.Item>
                </div>
            </Form>
        </Card>
    )
}
