'use client'

import { useState, useEffect } from 'react'
import { Form, Input, InputNumber, DatePicker, Select, Button, Row, Col, Divider, Radio, Card } from 'antd'
import { showSuccess, showError } from '@/lib/confirm'
import SampleTestItemTable, { SampleTestItemData } from '@/components/SampleTestItemTable'
import dayjs from 'dayjs'

interface EntrustmentFormProps {
    initialValues?: any
    mode: 'create' | 'edit'
    onSubmit: (values: any) => Promise<void>
    loading?: boolean
}

export default function EntrustmentForm({ initialValues, mode, onSubmit, loading }: EntrustmentFormProps) {
    const [form] = Form.useForm()
    const [users, setUsers] = useState<any[]>([])
    const [clients, setClients] = useState<any[]>([])
    const [contracts, setContracts] = useState<any[]>([])
    const [sampleTestItems, setSampleTestItems] = useState<SampleTestItemData[]>([])

    useEffect(() => {
        fetchOptions()
    }, [])

    useEffect(() => {
        if (initialValues) {
            form.setFieldsValue(initialValues)
            if (initialValues.sampleTestItems) {
                setSampleTestItems(initialValues.sampleTestItems)
            }
        }
    }, [initialValues, form])

    const fetchOptions = async () => {
        try {
            const [usersRes, clientsRes, contractsRes] = await Promise.all([
                fetch('/api/user?pageSize=1000'),
                fetch('/api/client?pageSize=1000'),
                fetch('/api/contract?pageSize=1000'),
            ])

            const getUsers = (json: any) => (json.success && json.data?.list) || json.list || []

            const usersData = await usersRes.json()
            const clientsData = await clientsRes.json()
            const contractsData = await contractsRes.json()

            setUsers(getUsers(usersData))
            setClients(getUsers(clientsData))
            setContracts(getUsers(contractsData))
        } catch (error) {
            console.error('Fetch options failed', error)
        }
    }

    const handleContractChange = (contractId: string) => {
        const contract = contracts.find(c => c.id === contractId) || contracts.find(c => c.contractNo === contractId)
        if (contract) {
            const client = clients.find(c => c.name === contract.partyACompany) || clients.find(c => c.id === contract.clientId)
            form.setFieldsValue({
                clientName: contract.partyACompany || client?.name,
                clientId: contract.clientId || client?.id,
                contactPerson: contract.clientContact || client?.contact,
                follower: contract.salesPerson || undefined,
                sampleDate: dayjs(),
            })
        }
    }

    const handleFinish = async (values: any) => {
        await onSubmit({
            ...values,
            sampleTestItems,
        })
    }

    return (
        <Card bordered={false}>
            <Form form={form} layout="vertical" onFinish={handleFinish}>
                <Divider orientation="left" orientationMargin="0">基本信息</Divider>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="entrustmentNo" label="委托编号">
                            <Input disabled placeholder="自动生成" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="contractNo" label="合同编号">
                            <Select
                                showSearch
                                optionFilterProp="children"
                                onChange={handleContractChange}
                            >
                                {contracts.map(c => (
                                    <Select.Option key={c.id} value={c.id}>{c.contractNo} - {c.contractName}</Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="clientName" label="委托单位" rules={[{ required: true, message: '请输入委托单位' }]}>
                            <Select
                                showSearch
                                allowClear
                                placeholder="选择或输入客户"
                                optionFilterProp="label"
                                options={clients.map(c => ({ value: c.name, label: c.name }))}
                                onChange={(value) => {
                                    const client = clients.find(c => c.name === value)
                                    if (client) {
                                        form.setFieldsValue({
                                            clientId: client.id,
                                            contactPerson: client.contact
                                        })
                                    }
                                }}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="contactPerson" label="联系人">
                            <Input placeholder="请输入联系人" />
                        </Form.Item>
                    </Col>
                </Row>

                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="sampleDate" label="送样时间" rules={[{ required: true, message: '请选择送样时间' }]}>
                            <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="follower" label="跟单人" rules={[{ required: true, message: '请选择跟单人' }]}>
                            <Select
                                showSearch
                                allowClear
                                placeholder="选择跟单人"
                                optionFilterProp="label"
                                options={users.map(u => ({ value: u.name, label: u.name }))}
                            />
                        </Form.Item>
                    </Col>
                </Row>

                <Divider orientation="left" orientationMargin="0">样品与检测项目</Divider>
                <div style={{ marginBottom: 16 }}>
                    <SampleTestItemTable
                        bizType="entrustment"
                        bizId={initialValues?.id}
                        value={sampleTestItems}
                        onChange={setSampleTestItems}
                    />
                </div>

                <Form.Item name="isSampleReturn" label="是否退样">
                    <Radio.Group>
                        <Radio value={true}>是</Radio>
                        <Radio value={false}>否</Radio>
                    </Radio.Group>
                </Form.Item>

                <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} block>
                        {mode === 'create' ? '提交委托单' : '保存修改'}
                    </Button>
                </Form.Item>
            </Form>
        </Card>
    )
}
