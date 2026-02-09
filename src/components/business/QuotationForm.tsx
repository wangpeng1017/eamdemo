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
    Alert,
} from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import UserSelect from '@/components/UserSelect'
import { showError } from '@/lib/confirm'

// 报价明细项（合并后的单表）
interface QuotationItem {
    id?: string
    sampleName: string
    serviceItem: string
    methodStandard: string
    quantity: string // 支持 "2组" 格式
    unitPrice: number
    totalPrice: number
    remark: string
}

interface QuotationFormProps {
    initialValues?: any
    onFinish: (values: any) => Promise<void>
    onCancel: () => void
    loading?: boolean
    bizId?: string
}

// 固定税率
const TAX_RATE = 0.06

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

    useEffect(() => {
        fetchClients()
        fetchTestTemplates()
    }, [])

    useEffect(() => {
        if (initialValues) {
            const safeItems = (initialValues.items || []).map((item: any) => ({
                ...item,
                quantity: String(item.quantity ?? '1'),
                unitPrice: Number(item.unitPrice) || 0,
                totalPrice: Number(item.totalPrice) || 0,
                remark: item.remark || '',
            }))
            setItems(safeItems.length > 0 ? safeItems : [createEmptyItem()])

            form.setFieldsValue({
                ...initialValues,
                quotationDate: initialValues.quotationDate ? dayjs(initialValues.quotationDate) : dayjs(),
                clientReportDeadline: initialValues.clientReportDeadline ? dayjs(initialValues.clientReportDeadline) : null,
                clientId: initialValues.clientId || initialValues.client?.id,
                discountAmount: Number(initialValues.discountAmount) || 0,
                // 服务方信息
                serviceContact: initialValues.serviceContact,
                serviceTel: initialValues.serviceTel || '',
                serviceEmail: initialValues.serviceEmail || '',
            })
        } else {
            form.setFieldsValue({
                quotationDate: dayjs(),
                validDays: 30,
                discountAmount: 0,
            })
            setItems([createEmptyItem()])
        }
    }, [initialValues, form])

    const createEmptyItem = (): QuotationItem => ({
        sampleName: '', serviceItem: '', methodStandard: '',
        quantity: '1', unitPrice: 0, totalPrice: 0, remark: '',
    })

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
            setTestTemplates(json.list || [])
        } catch (error) {
            console.error('获取检测项目失败:', error)
        }
    }

    // 选择客户时自动带入联系信息
    const handleClientChange = (clientId: string) => {
        const client = clients.find(c => c.id === clientId)
        if (client) {
            form.setFieldsValue({
                clientContactPerson: client.contact || '',
                clientPhone: client.phone || '',
                clientEmail: client.email || '',
                clientAddress: client.address || '',
            })
        }
    }

    const handleAddItem = () => {
        setItems([...items, createEmptyItem()])
    }

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items]
        const item = { ...newItems[index], [field]: value }
        // 重新计算小计
        const qty = parseFloat(item.quantity) || 1
        item.totalPrice = qty * (item.unitPrice || 0)
        newItems[index] = item
        setItems(newItems)
    }

    const removeItem = (index: number) => {
        if (items.length <= 1) return
        setItems(items.filter((_, i) => i !== index))
    }

    // 费用汇总计算
    const totalAmount = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0)
    const discountAmount = Form.useWatch('discountAmount', form) || 0
    const taxAmount = totalAmount * TAX_RATE
    const totalWithTax = totalAmount * (1 + TAX_RATE)
    const finalAmount = totalWithTax - discountAmount

    // 提交
    const handleSubmit = async () => {
        try {
            const values = await form.validateFields()
            const submitData = {
                ...values,
                items,
                discountAmount,
                finalAmount,
                totalAmount,
                taxAmount,
                totalWithTax,
                quotationDate: values.quotationDate?.toISOString(),
                clientReportDeadline: values.clientReportDeadline?.toISOString(),
                clientRemark: values.clientRemark,
            }
            await onFinish(submitData)
        } catch (error) {
            console.error('表单校验失败', error)
        }
    }

    // 报价明细表列定义
    const tableColumns = [
        {
            title: '序号',
            width: 50,
            render: (_: any, __: any, index: number) => index + 1,
        },
        {
            title: '样品名称',
            dataIndex: 'sampleName',
            width: 160,
            render: (value: string, _: any, index: number) => (
                <Input
                    value={value}
                    onChange={(e) => updateItem(index, 'sampleName', e.target.value)}
                    placeholder="样品名称"
                />
            ),
        },
        {
            title: '检测项目 (Service Item)',
            dataIndex: 'serviceItem',
            width: 180,
            render: (value: string, _: any, index: number) => (
                <Select
                    showSearch
                    allowClear
                    optionFilterProp="label"
                    options={testTemplates.map(t => ({ value: t.name, label: t.name, method: t.method || '' }))}
                    value={value || undefined}
                    onChange={(val, option) => {
                        updateItem(index, 'serviceItem', val || '')
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
            title: '检测标准 (Method Standard)',
            dataIndex: 'methodStandard',
            width: 150,
            render: (value: string, _: any, index: number) => (
                <Input
                    value={value}
                    onChange={(e) => updateItem(index, 'methodStandard', e.target.value)}
                    placeholder="标准"
                />
            ),
        },
        {
            title: '数量 (Quantity)',
            dataIndex: 'quantity',
            width: 100,
            render: (value: string, _: any, index: number) => (
                <Input
                    value={value}
                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                    placeholder="如: 2组"
                />
            ),
        },
        {
            title: '单价 (Price)',
            dataIndex: 'unitPrice',
            width: 110,
            render: (value: number, _: any, index: number) => (
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
            title: '总价 (Total)',
            dataIndex: 'totalPrice',
            width: 100,
            render: (value: number) => `¥${Number(value || 0).toFixed(2)}`,
        },
        {
            title: '备注',
            dataIndex: 'remark',
            width: 150,
            render: (value: string, _: any, index: number) => (
                <Input
                    value={value}
                    onChange={(e) => updateItem(index, 'remark', e.target.value)}
                    placeholder="备注"
                />
            ),
        },
        {
            title: '操作',
            key: 'action',
            width: 50,
            render: (_: any, __: any, index: number) => (
                <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeItem(index)}
                    disabled={items.length <= 1}
                />
            ),
        },
    ]

    return (
        <Card bordered={false}>
            {initialValues?.status === 'rejected' && (
                <Alert
                    message="报价单已被驳回"
                    description={
                        <div>
                            <p><strong>驳回原因：</strong>{initialValues.lastRejectReason || '无'}</p>
                            <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                                驳回人：{initialValues.lastRejectBy || '-'} | 驳回时间：{initialValues.lastRejectAt ? dayjs(initialValues.lastRejectAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
                            </p>
                            <p style={{ marginTop: 8, fontWeight: 'bold' }}>温馨提示：请根据驳回意见修改后，重新提交审批。</p>
                        </div>
                    }
                    type="error"
                    showIcon
                    style={{ marginBottom: 24 }}
                />
            )}
            <Form form={form} layout="vertical">
                {/* 隐藏字段 */}
                <Form.Item name="consultationId" hidden><Input /></Form.Item>
                <Form.Item name="consultationNo" hidden><Input /></Form.Item>

                {/* ========== ① 委托方信息 ========== */}
                <Divider orientation="left" orientationMargin="0">① 委托方信息 Company</Divider>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="clientId" label="委托方 Company" rules={[{ required: true, message: '请选择客户' }]}>
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
                    <Col span={12}>
                        <Form.Item name="clientContactPerson" label="委托人 From" rules={[{ required: true, message: '请输入联系人' }]}>
                            <Input placeholder="联系人姓名" />
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item name="clientPhone" label="电话 Tel">
                            <Input placeholder="联系电话" />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="clientEmail" label="邮箱 Email">
                            <Input placeholder="邮箱" />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="clientAddress" label="地址 Address">
                            <Input placeholder="地址" />
                        </Form.Item>
                    </Col>
                </Row>

                {/* ========== ② 服务方信息 ========== */}
                <Divider orientation="left" orientationMargin="0">② 服务方信息 Service</Divider>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item label="服务方 Company">
                            <Input value="江苏国轻检测技术有限公司" disabled />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="serviceContact" label="安排人 From" rules={[{ required: true, message: '请选择安排人' }]}>
                            <UserSelect placeholder="选择安排人" />
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item name="serviceTel" label="电话 Tel">
                            <Input placeholder="服务方电话" />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="serviceEmail" label="邮箱 Email">
                            <Input placeholder="服务方邮箱" />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item label="地址 Address">
                            <Input value="扬州市邗江区金山路99号" disabled />
                        </Form.Item>
                    </Col>
                </Row>

                {/* ========== ③ 客户要求备注 ========== */}
                <Divider orientation="left" orientationMargin="0">③ 客户要求备注</Divider>
                <Form.Item name="clientRemark">
                    <Input.TextArea rows={2} placeholder="客户的特殊要求或备注" />
                </Form.Item>

                {/* ========== ④ 报价明细 ========== */}
                <Divider orientation="left" orientationMargin="0">④ 报价明细 Quotation Details</Divider>
                <Table
                    dataSource={items}
                    columns={tableColumns}
                    rowKey={(r, i) => r.id || `temp_${i}`}
                    pagination={false}
                    size="small"
                    scroll={{ x: 1100 }}
                    footer={() => (
                        <Button type="dashed" onClick={handleAddItem} block icon={<PlusOutlined />}>
                            添加明细项
                        </Button>
                    )}
                />

                {/* ========== ⑤ 费用汇总 ========== */}
                <Divider orientation="left" orientationMargin="0">⑤ 费用汇总 Summary</Divider>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ width: 380 }}>
                        <Row style={{ marginBottom: 8 }}>
                            <Col span={14} style={{ textAlign: 'right', paddingRight: 12 }}>报价合计：</Col>
                            <Col span={10} style={{ fontWeight: 'bold' }}>¥{totalAmount.toFixed(2)}</Col>
                        </Row>
                        <Row style={{ marginBottom: 8 }}>
                            <Col span={14} style={{ textAlign: 'right', paddingRight: 12 }}>含税合计（含税{(TAX_RATE * 100).toFixed(0)}%）：</Col>
                            <Col span={10} style={{ fontWeight: 'bold' }}>¥{totalWithTax.toFixed(2)}</Col>
                        </Row>
                        <Row style={{ marginBottom: 8, alignItems: 'center' }}>
                            <Col span={14} style={{ textAlign: 'right', paddingRight: 12 }}>优惠金额：</Col>
                            <Col span={10}>
                                <Form.Item name="discountAmount" noStyle>
                                    <InputNumber style={{ width: '100%' }} min={0} precision={2} prefix="¥" />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Row style={{ borderTop: '1px solid #d9d9d9', paddingTop: 8 }}>
                            <Col span={14} style={{ textAlign: 'right', paddingRight: 12 }}>
                                优惠后合计（含税{(TAX_RATE * 100).toFixed(0)}%）：
                            </Col>
                            <Col span={10} style={{ fontWeight: 'bold', color: '#f5222d', fontSize: 16 }}>
                                ¥{finalAmount.toFixed(2)}
                            </Col>
                        </Row>
                    </div>
                </div>

                {/* ========== ⑥ 其他信息 ========== */}
                <Divider orientation="left" orientationMargin="0">⑥ 其他信息</Divider>
                <Row gutter={16}>
                    <Col span={6}>
                        <Form.Item name="quotationDate" label="报价日期" rules={[{ required: true, message: '请选择日期' }]}>
                            <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item name="validDays" label="有效期(天)">
                            <InputNumber style={{ width: '100%' }} min={1} />
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item name="clientReportDeadline" label="报告时间">
                            <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item name="followerId" label="跟单人" rules={[{ required: true, message: '请选择跟单人' }]}>
                            <UserSelect placeholder="选择跟单人" />
                        </Form.Item>
                    </Col>
                </Row>

                {/* 底部操作栏 */}
                <div style={{ marginTop: 24 }}>
                    <Form.Item>
                        <Space size="middle">
                            <Button onClick={onCancel} size="large">取消</Button>
                            <Button type="primary" onClick={handleSubmit} loading={loading} size="large">保存</Button>
                        </Space>
                    </Form.Item>
                </div>

            </Form>
        </Card>
    )
}
