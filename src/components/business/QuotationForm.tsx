'use client'

import React, { useState, useEffect } from 'react'
import {
    Form,
    Input,
    Button,
    Select,
    DatePicker,
    Space,
    Row,
    Col,
    InputNumber,
    Divider,
    Card,
    Table,
} from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import UserSelect from '@/components/UserSelect'
import SampleTestItemTable, { SampleTestItemData } from '@/components/SampleTestItemTable'
import { showError } from '@/lib/confirm'

interface QuotationItem {
    id?: string
    sampleName: string
    serviceItem: string
    methodStandard: string
    quantity: number
    unitPrice: number
    totalPrice: number
}

interface QuotationFormProps {
    initialValues?: any
    onFinish: (values: any) => Promise<void>
    onCancel: () => void
    loading?: boolean
    bizId?: string // 编辑时的ID，用于关联数据
}

export default function QuotationForm({
    initialValues,
    onFinish,
    onCancel,
    loading = false,
    bizId,
}: QuotationFormProps) {
    const [form] = Form.useForm()
    const [clients, setClients] = useState<any[]>([])
    const [clientsLoading, setClientsLoading] = useState(false)
    const [testTemplates, setTestTemplates] = useState<any[]>([])
    const [items, setItems] = useState<QuotationItem[]>([])

    // 样品检测项
    const [sampleTestItems, setSampleTestItems] = useState<SampleTestItemData[]>([])

    useEffect(() => {
        fetchClients()
        fetchTestTemplates()
    }, [])

    useEffect(() => {
        if (initialValues) {
            // 深度复制 items，防止引用问题
            const safeItems = (initialValues.items || []).map((item: any) => ({
                ...item,
                quantity: Number(item.quantity) || 0,
                unitPrice: Number(item.unitPrice) || 0,
                totalPrice: Number(item.totalPrice) || 0,
            }))
            setItems(safeItems)

            // 设置样品检测项
            if (initialValues.sampleTestItems) {
                setSampleTestItems(initialValues.sampleTestItems)
            }

            form.setFieldsValue({
                ...initialValues,
                quotationDate: initialValues.quotationDate ? dayjs(initialValues.quotationDate) : dayjs(),
                clientReportDeadline: initialValues.clientReportDeadline ? dayjs(initialValues.clientReportDeadline) : null,
                clientId: initialValues.clientId || initialValues.client?.id,
                // 确保折扣金额是数字
                discountAmount: Number(initialValues.discountAmount) || 0,
            })
        } else {
            // 新增模式默认值
            form.setFieldsValue({
                quotationDate: dayjs(),
                validDays: 30,
                taxRate: 0.06,
                discountAmount: 0,
            })
            setItems([{ sampleName: '', serviceItem: '', methodStandard: '', quantity: 1, unitPrice: 0, totalPrice: 0 }])
        }
    }, [initialValues, form])

    const fetchClients = async () => {
        setClientsLoading(true)
        try {
            const res = await fetch('/api/entrustment/client?status=approved&pageSize=1000')
            const json = await res.json()
            setClients(json.list || [])
        } catch (error) {
            console.error('获取客户列表失败:', error)
        } finally {
            setClientsLoading(false)
        }
    }

    const fetchTestTemplates = async () => {
        try {
            const res = await fetch('/api/test-template?pageSize=1000')
            const json = await res.json()
            const templates = json.list || []
            setTestTemplates(templates)
        } catch (error) {
            console.error('获取检测项目失败:', error)
        }
    }

    const handleClientChange = (clientId: string) => {
        const client = clients.find(c => c.id === clientId)
        if (client) {
            form.setFieldsValue({
                clientContactPerson: client.contact || '',
            })
        }
    }

    const handleAddItem = () => {
        setItems([...items, { sampleName: '', serviceItem: '', methodStandard: '', quantity: 1, unitPrice: 0, totalPrice: 0 }])
    }

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items]
        const item = { ...newItems[index] }
        // @ts-ignore
        item[field] = value
        // 重新计算小计
        item.totalPrice = (item.quantity || 1) * (item.unitPrice || 0)
        newItems[index] = item
        setItems(newItems)

        // 触发总金额重算
        calculateTotal(newItems)
    }

    const removeItem = (index: number) => {
        const newItems = items.filter((_, i) => i !== index)
        setItems(newItems)
        calculateTotal(newItems)
    }

    const calculateTotal = (currentItems: QuotationItem[]) => {
        const totalAmount = currentItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0)
        const taxRate = form.getFieldValue('taxRate') || 0
        const discountAmount = form.getFieldValue('discountAmount') || 0

        const totalWithTax = totalAmount // 假设单价已含税，或者另外计算。参考原页面逻辑
        // 原页面逻辑：
        // form.setFieldsValue({
        //   totalAmount,
        //   taxAmount: totalAmount * taxRate,
        //   totalWithTax: totalAmount * (1 + taxRate),
        //   finalAmount: totalAmount * (1 + taxRate) - discountAmount
        // })
        // 这里简化处理，保持与后端一致，具体计算逻辑需参考 getValues 时的处理

        // 实际上 Form 提交时会重新计算，这里仅做展示更新可能不够，需要 Form.Item配合
        // 简单起见，利用 Form 监听变化来更新汇总数据会更稳健，或者在 render 时计算
    }

    // 计算汇总数据
    const totalAmount = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0)
    const taxRate = Form.useWatch('taxRate', form) || 0
    const discountAmount = Form.useWatch('discountAmount', form) || 0

    const taxAmount = totalAmount * taxRate // 税额 (如果单价是不含税) - 这里假设单价是不含税
    const totalWithTax = totalAmount + taxAmount // 价税合计
    const finalAmount = totalWithTax - discountAmount // 最终金额

    // 监听样品检测项变化，自动同步到报价明细
    useEffect(() => {
        if (sampleTestItems.length === 0) return

        // 这一步逻辑是从原页面 copy 来的：从样品检测项生成报价明细
        // 但是要小心不要覆盖用户已经填写的单价
        const newItems: QuotationItem[] = sampleTestItems.map(item => ({
            sampleName: item.sampleName || '',
            serviceItem: item.testItemName || '',
            methodStandard: item.testStandard || '',
            quantity: item.quantity || 1,
            unitPrice: 0,
            totalPrice: 0,
            id: undefined // 新生成的没有ID
        }))

        const mergedItems = newItems.map(newItem => {
            // 尝试匹配已有的项，保留单价
            const existingItem = items.find(
                item =>
                    item.sampleName === newItem.sampleName &&
                    item.serviceItem === newItem.serviceItem
            )

            if (existingItem) {
                return {
                    ...newItem,
                    quantity: existingItem.quantity,
                    unitPrice: existingItem.unitPrice,
                    totalPrice: existingItem.quantity * existingItem.unitPrice
                }
            }
            return newItem
        })

        // 只有当 items 为空或者显式需要同步时才覆盖，防止用户手动修改后被重置
        // 这里为了体验，如果 items 为空，或者数量发生显著变化... 
        // 实战中，通常是只有“导入”动作才触发。这里原逻辑是只要 sampleTestItems 变了就尝试合并
        // 我们保留这个逻辑，但只在 sampleTestItems 变动且确实有内容时触发，且尽量保留 original items 如果它们不仅仅是自动生成的

        // 简化策略：如果 items 已经有数据，我们不自动完全覆盖，而是由用户手动添加
        // 或者：当 sampleTestItems 更新时，仅“追加”或“更新匹配项”，不删除多余项？
        // 原页面逻辑是 syncSampleTestItemsToQuotationItems，它会重新生成 items。
        // 我们这里暂时只在初始化或者显式操作时同步，避免副作用。
        // 由于 Form 模式下，用户可能先填检测项，再填报价，所以保留一种同步机制是有益的。
        // 决定：暂不通过 effect 自动同步，以免死循环或覆盖。
        // 将其作为一个按钮功能，或者由父组件传入 initialValues 时处理好。

    }, [sampleTestItems])

    // 提供一个手动同步按钮？或者在 SampleTestItemTable 变化时回调？
    // 暂时保留手动添加明细的逻辑。

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields()
            // 将 items 和 sampleTestItems 合并到提交数据
            const submitData = {
                ...values,
                items,
                sampleTestItems, // 让父组件或后端处理这个保存
                finalAmount, // 提交计算后的最终金额
                // 其他汇总字段根据需要提交，或者后端计算
                totalAmount,
                taxAmount,
                totalWithTax,
                quotationDate: values.quotationDate?.toISOString(),
                clientReportDeadline: values.clientReportDeadline?.toISOString(),
            }
            await onFinish(submitData)
        } catch (error) {
            console.error('表单校验失败', error)
        }
    }

    const tableColumns = [
        {
            title: '样品名称',
            dataIndex: 'sampleName',
            width: 150,
            render: (value: string, record: any, index: number) => (
                <Input
                    value={value}
                    onChange={(e) => updateItem(index, 'sampleName', e.target.value)}
                    placeholder="样品名称"
                />
            ),
        },
        {
            title: '检测项目',
            dataIndex: 'serviceItem',
            width: 180,
            render: (value: string, record: any, index: number) => (
                <Select
                    showSearch
                    optionFilterProp="label"
                    options={testTemplates.map(t => ({ value: t.name, label: t.name, method: t.method || '' }))}
                    value={value || undefined}
                    onChange={(val, option) => {
                        updateItem(index, 'serviceItem', val)
                        const method = (option as any)?.method || ''
                        if (method) {
                            updateItem(index, 'methodStandard', method)
                        }
                    }}
                    style={{ width: '100%' }}
                    placeholder="检测项目"
                />
            ),
        },
        {
            title: '检测标准',
            dataIndex: 'methodStandard',
            render: (value: string, record: any, index: number) => (
                <Input
                    value={value}
                    onChange={(e) => updateItem(index, 'methodStandard', e.target.value)}
                    placeholder="标准"
                />
            ),
        },
        {
            title: '数量',
            dataIndex: 'quantity',
            width: 100,
            render: (value: number, record: any, index: number) => (
                <InputNumber
                    min={1}
                    value={value}
                    onChange={(val) => updateItem(index, 'quantity', val || 1)}
                    style={{ width: '100%' }}
                />
            ),
        },
        {
            title: '单价(元)',
            dataIndex: 'unitPrice',
            width: 120,
            render: (value: number, record: any, index: number) => (
                <InputNumber
                    min={0}
                    precision={2}
                    value={value}
                    onChange={(val) => updateItem(index, 'unitPrice', val || 0)}
                    style={{ width: '100%' }}
                />
            ),
        },
        {
            title: '小计',
            dataIndex: 'totalPrice',
            width: 120,
            render: (value: number) => `¥${Number(value || 0).toFixed(2)}`,
        },
        {
            title: '操作',
            key: 'action',
            width: 60,
            render: (_: any, __: any, index: number) => (
                <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeItem(index)}
                />
            ),
        },
    ]

    return (
        <Card bordered={false}>
            <Form form={form} layout="vertical">
                <Row gutter={24}>
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
                    </Col>
                    <Col span={8}>
                        <Form.Item name="clientContactPerson" label="联系人" rules={[{ required: true, message: '请输入联系人' }]}>
                            <Input placeholder="联系人姓名" />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="quotationDate" label="报价日期" rules={[{ required: true, message: '请选择日期' }]}>
                            <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                </Row>

                {/* 样品检测项 (数据源) */}
                <Divider orientation="left">样品与检测项</Divider>
                <div style={{ marginBottom: 24 }}>
                    <SampleTestItemTable
                        bizType="quotation"
                        bizId={bizId || undefined}
                        value={sampleTestItems}
                        onChange={(newVal) => {
                            setSampleTestItems(newVal)
                            // 在这里触发同步？或者让用户自己添加明细
                            // 为了方便，如果 items 为空，自动同步一次
                            if (items.length === 0 && newVal.length > 0) {
                                const newItems: QuotationItem[] = newVal.map(item => ({
                                    sampleName: item.sampleName || '',
                                    serviceItem: item.testItemName || '',
                                    methodStandard: item.testStandard || '',
                                    quantity: item.quantity || 1,
                                    unitPrice: 0,
                                    totalPrice: 0,
                                }))
                                setItems(newItems)
                            }
                        }}
                    />
                </div>

                {/* 报价明细 */}
                <Divider orientation="left">报价明细</Divider>
                <Table
                    dataSource={items}
                    columns={tableColumns}
                    rowKey={(r, i) => r.id || `temp_${i}`}
                    pagination={false}
                    size="small"
                    footer={() => (
                        <Button type="dashed" onClick={handleAddItem} block icon={<PlusOutlined />}>
                            添加明细项
                        </Button>
                    )}
                />

                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ width: 300 }}>
                        <Form.Item label="金额合计">
                            <Input value={`¥${totalAmount.toFixed(2)}`} disabled />
                        </Form.Item>
                        <Row gutter={8}>
                            <Col span={12}>
                                <Form.Item name="taxRate" label="税率">
                                    <InputNumber min={0} max={1} step={0.01} style={{ width: '100%' }} />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item label="税额">
                                    <Input value={`¥${taxAmount.toFixed(2)}`} disabled />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Form.Item label="价税合计">
                            <Input value={`¥${totalWithTax.toFixed(2)}`} disabled />
                        </Form.Item>
                        <Form.Item name="discountAmount" label="折扣金额">
                            <InputNumber style={{ width: '100%' }} prefix="¥" />
                        </Form.Item>
                        <Form.Item label="最终报价" style={{ fontWeight: 'bold' }}>
                            <Input value={`¥${finalAmount.toFixed(2)}`} style={{ color: '#f5222d', fontWeight: 'bold' }} disabled />
                        </Form.Item>
                    </div>
                </div>

                <Divider orientation="left">其他条款</Divider>
                <Row gutter={24}>
                    <Col span={8}>
                        <Form.Item name="validDays" label="有效期(天)">
                            <InputNumber style={{ width: '100%' }} min={1} />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="clientReportDeadline" label="客户要求报告时间">
                            <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="paymentTerms" label="付款方式">
                            <Input placeholder="如：预付50%" />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="deliveryTerms" label="交付方式">
                            <Input placeholder="如：电子版+纸质版" />
                        </Form.Item>
                    </Col>
                    <Col span={16}>
                        <Form.Item name="remark" label="备注">
                            <Input.TextArea rows={2} />
                        </Form.Item>
                    </Col>
                </Row>

                {/* 底部操作栏 */}
                <div style={{
                    position: 'sticky',
                    bottom: 0,
                    zIndex: 10,
                    padding: '12px 24px',
                    margin: '0 -24px -24px',
                    background: '#fff',
                    borderTop: '1px solid #e8e8e8',
                    textAlign: 'right',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 8,
                    boxShadow: '0 -2px 8px rgba(0,0,0,0.08)'
                }}>
                    <Button onClick={onCancel} size="large">取消</Button>
                    <Button type="primary" onClick={handleSubmit} loading={loading} size="large">保存</Button>
                </div>

            </Form>
        </Card>
    )
}
