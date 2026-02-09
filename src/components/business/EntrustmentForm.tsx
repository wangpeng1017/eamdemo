'use client'

/**
 * @file 委托单表单 - 7 段式布局
 * @desc 对齐 Excel 模板「测试申请表-通用.xls」
 * @input 依赖: SampleInfoTable, ComponentTestTable, MaterialTestTable
 */

import { useState, useEffect, useCallback } from 'react'
import { Form, Input, InputNumber, DatePicker, Select, Button, Row, Col, Divider, Radio, Card, Checkbox, Typography } from 'antd'
import { showSuccess, showError } from '@/lib/confirm'
import SampleInfoTable, { SampleInfoData } from '@/components/business/SampleInfoTable'
import ComponentTestTable, { ComponentTestData } from '@/components/business/ComponentTestTable'
import MaterialTestTable, { MaterialTestData } from '@/components/business/MaterialTestTable'
import UserSelect from '@/components/UserSelect'
import dayjs from 'dayjs'

const { Text } = Typography

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
    const [samples, setSamples] = useState<SampleInfoData[]>([])
    const [componentTests, setComponentTests] = useState<ComponentTestData[]>([])
    const [materialTests, setMaterialTests] = useState<MaterialTestData[]>([])

    useEffect(() => {
        fetchOptions()
    }, [])

    useEffect(() => {
        if (initialValues) {
            // 转换日期字段
            const formValues = { ...initialValues }
            if (formValues.sampleDate) formValues.sampleDate = dayjs(formValues.sampleDate)
            if (formValues.clientReportDeadline) formValues.clientReportDeadline = dayjs(formValues.clientReportDeadline)

            // 转换 serviceScope 为数组给 Checkbox.Group
            if (formValues.serviceScope && typeof formValues.serviceScope === 'string') {
                formValues.serviceScope = formValues.serviceScope.split(',').filter(Boolean)
            }

            form.setFieldsValue(formValues)

            // 样品信息
            if (initialValues.samples && Array.isArray(initialValues.samples)) {
                setSamples(initialValues.samples.map((s: any, idx: number) => ({
                    key: s.id || `sample_${idx}`,
                    name: s.name || '',
                    partNo: s.partNo || '',
                    material: s.material || '',
                    color: s.color || '',
                    weight: s.weight || '',
                    supplier: s.supplier || '',
                    oem: s.oem || '',
                    quantity: parseInt(s.quantity) || 1,
                    sampleCondition: s.sampleCondition || '',
                    remark: s.remark || '',
                })))
            }

            // 测试项
            if (initialValues.sampleTestItems && Array.isArray(initialValues.sampleTestItems)) {
                const compItems: ComponentTestData[] = []
                const matItems: MaterialTestData[] = []
                for (const item of initialValues.sampleTestItems) {
                    if (item.testCategory === 'material') {
                        matItems.push({
                            key: item.id || `mat_${Date.now()}_${Math.random()}`,
                            sampleIndex: item.sampleIndex || '',
                            materialName: item.materialName || item.sampleName || '',
                            materialCode: item.materialCode || '',
                            testItemName: item.testItemName || '',
                            testStandard: item.testStandard || '',
                            testMethod: item.testMethod || '',
                            judgmentStandard: item.judgmentStandard || '',
                            materialSupplier: item.materialSupplier || '',
                            materialSpec: item.materialSpec || '',
                            materialSampleStatus: item.materialSampleStatus || '',
                            specimenCount: item.specimenCount || '',
                            testRemark: item.testRemark || '',
                        })
                    } else {
                        compItems.push({
                            key: item.id || `comp_${Date.now()}_${Math.random()}`,
                            sampleIndex: item.sampleIndex || '',
                            sampleName: item.sampleName || '',
                            testItemName: item.testItemName || '',
                            testStandard: item.testStandard || '',
                            testMethod: item.testMethod || '',
                            judgmentStandard: item.judgmentStandard || '',
                            samplingLocation: item.samplingLocation || '',
                            specimenCount: item.specimenCount || '',
                            testRemark: item.testRemark || '',
                        })
                    }
                }
                setComponentTests(compItems)
                setMaterialTests(matItems)
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

            const getList = (json: any) => (json.success && json.data?.list) || json.list || []
            const usersData = await usersRes.json()
            const clientsData = await clientsRes.json()
            const contractsData = await contractsRes.json()

            setUsers(getList(usersData))
            setClients(getList(clientsData))
            setContracts(getList(contractsData))
        } catch (error) {
            console.error('加载选项失败', error)
        }
    }

    // 选择合同时自动填充客户信息
    const handleContractChange = (contractId: string) => {
        const contract = contracts.find(c => c.id === contractId) || contracts.find(c => c.contractNo === contractId)
        if (contract) {
            const client = clients.find(c => c.name === contract.partyACompany) || clients.find(c => c.id === contract.clientId)
            form.setFieldsValue({
                clientName: contract.partyACompany || client?.name,
                clientId: contract.clientId || client?.id,
                contactPerson: contract.clientContact || client?.contact,
                contactPhone: contract.partyATel || client?.phone,
                contactFax: client?.fax || '',
                contactEmail: contract.partyAEmail || client?.email,
                clientAddress: contract.partyAAddress || client?.address,
                invoiceTitle: client?.invoiceTitle || client?.name || '',
                taxId: client?.creditCode || '',
                followerId: contract.salesPerson || undefined,
                sampleDate: dayjs(),
            })
        }
    }

    // 选择客户时自动填充信息
    const handleClientChange = (clientName: string) => {
        const client = clients.find(c => c.name === clientName)
        if (client) {
            form.setFieldsValue({
                clientId: client.id,
                contactPerson: client.contact || '',
                contactPhone: client.phone || '',
                contactFax: client.fax || '',
                contactEmail: client.email || '',
                clientAddress: client.address || '',
                invoiceTitle: client.invoiceTitle || client.name || '',
                taxId: client.creditCode || '',
            })
        }
    }

    const handleFinish = async (values: any) => {
        // 将 serviceScope 数组转为逗号分隔字符串
        if (Array.isArray(values.serviceScope)) {
            values.serviceScope = values.serviceScope.join(',')
        }

        // 组装完整数据
        const submitData = {
            ...values,
            samples: samples.filter(s => s.name), // 过滤空行
            componentTests: componentTests.filter(t => t.testItemName), // 零部件测试
            materialTests: materialTests.filter(t => t.testItemName), // 材料测试
        }

        await onSubmit(submitData)
    }

    return (
        <Card bordered={false}>
            <Form form={form} layout="vertical" onFinish={handleFinish}>

                {/* ========== 第①段：基本信息 ========== */}
                <Divider orientation="left" orientationMargin="0">① 基本信息</Divider>
                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item name="entrustmentNo" label="委托编号 No.">
                            <Input disabled placeholder="自动生成" />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="contractNo" label="合同编号">
                            <Select
                                showSearch allowClear
                                placeholder="选择合同"
                                optionFilterProp="children"
                                onChange={handleContractChange}
                            >
                                {contracts.map(c => (
                                    <Select.Option key={c.id} value={c.id}>{c.contractNo} - {c.contractName}</Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="clientName" label="委托单位 Applicant" rules={[{ required: true, message: '请选择委托单位' }]}>
                            <Select
                                showSearch allowClear
                                placeholder="选择或输入客户"
                                optionFilterProp="label"
                                options={clients.map(c => ({ value: c.name, label: c.name }))}
                                onChange={handleClientChange}
                            />
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item name="clientId" hidden><Input /></Form.Item>

                <Row gutter={16}>
                    <Col span={6}>
                        <Form.Item name="contactPerson" label="联系人 Person in Charge">
                            <Input placeholder="联系人" />
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item name="contactPhone" label="电话 Telephone">
                            <Input placeholder="电话" />
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item name="contactFax" label="传真 Fax">
                            <Input placeholder="传真" />
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item name="contactEmail" label="电子邮箱 Email">
                            <Input placeholder="邮箱" />
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item name="clientAddress" label="地址 Address">
                    <Input placeholder="地址" />
                </Form.Item>

                {/* ========== 第②段：开票信息 ========== */}
                <Divider orientation="left" orientationMargin="0">② 开票信息 Invoice Info</Divider>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="invoiceTitle" label="开票抬头">
                            <Input placeholder="开票抬头（自动从客户信息带出）" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="taxId" label="税号">
                            <Input placeholder="统一社会信用代码/税号" />
                        </Form.Item>
                    </Col>
                </Row>

                {/* ========== 第③段：服务项目 ========== */}
                <Divider orientation="left" orientationMargin="0">③ 服务项目 Service Application</Divider>
                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item name="serviceScope" label="认证标记">
                            <Checkbox.Group>
                                <Checkbox value="CMA">CMA</Checkbox>
                                <Checkbox value="CNAS">CNAS</Checkbox>
                            </Checkbox.Group>
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="reportLanguage" label="报告语言 Report Language" initialValue="cn">
                            <Radio.Group>
                                <Radio value="cn">中文</Radio>
                                <Radio value="en">English</Radio>
                                <Radio value="cn_en">中英文</Radio>
                            </Radio.Group>
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="urgencyLevel" label="服务类型 Service Type" initialValue="normal">
                            <Select options={[
                                { value: 'normal', label: '常规 Normal' },
                                { value: 'express', label: '加急 (+50%) Express' },
                                { value: 'double', label: '双倍加急 (+100%)' },
                                { value: 'urgent', label: '特急 (+150%)' },
                            ]} />
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={6}>
                        <Form.Item name="reportCopies" label="报告份数" initialValue={1}>
                            <InputNumber min={1} max={20} style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item name="reportDelivery" label="报告领取方式">
                            <Select placeholder="选择" options={[
                                { value: 'courier', label: '快递' },
                                { value: 'electronic', label: '电子版' },
                                { value: 'pickup', label: '自取' },
                            ]} />
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item name="acceptSubcontract" label="是否接受分包" initialValue={true}>
                            <Radio.Group>
                                <Radio value={true}>接受</Radio>
                                <Radio value={false}>不接受</Radio>
                            </Radio.Group>
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item name="isSampleReturn" label="是否退样" initialValue={false}>
                            <Radio.Group>
                                <Radio value={true}>是</Radio>
                                <Radio value={false}>否</Radio>
                            </Radio.Group>
                        </Form.Item>
                    </Col>
                </Row>

                {/* ========== 第④段：样品信息 ========== */}
                <Divider orientation="left" orientationMargin="0">④ 样品信息 Sample Information</Divider>
                <SampleInfoTable value={samples} onChange={setSamples} />

                {/* ========== 第⑤段：试验信息 & 特殊要求 ========== */}
                <Divider orientation="left" orientationMargin="0">⑤ 试验信息 & 特殊要求</Divider>
                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item name="testType" label="试验类型">
                            <Select placeholder="选择试验类型" allowClear options={[
                                { value: 'DV', label: 'DV' },
                                { value: 'PV', label: 'PV' },
                                { value: 'DV_PV', label: 'DV/PV 二合一' },
                                { value: 'pilot', label: '摸底试验' },
                                { value: 'annual', label: '年度试验' },
                            ]} />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="oemFactory" label="主机厂">
                            <Input placeholder="主机厂名称" />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="sampleDeliveryMethod" label="送样方式">
                            <Select placeholder="选择送样方式" allowClear options={[
                                { value: 'customer', label: '客户送样' },
                                { value: 'logistics', label: '物流/快递' },
                                { value: 'agency', label: '中介公司' },
                                { value: 'other', label: '其他' },
                            ]} />
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
                        <Form.Item name="followerId" label="跟单人" rules={[{ required: true, message: '请选择跟单人' }]}>
                            <UserSelect placeholder="选择跟单人" />
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item name="specialRequirements" label="特殊要求">
                    <Input.TextArea rows={3} placeholder="如有特殊检测要求，请在此说明（如样品保存时间、测试温度等）" />
                </Form.Item>

                {/* ========== 第⑥段：零部件级测试要求 ========== */}
                <Divider orientation="left" orientationMargin="0">⑥ 零部件级测试要求 Component Test Requirement</Divider>
                <ComponentTestTable value={componentTests} onChange={setComponentTests} />

                {/* ========== 第⑦段：材料级测试要求 ========== */}
                <Divider orientation="left" orientationMargin="0">⑦ 材料级测试要求 Material Test Requirement</Divider>
                <MaterialTestTable value={materialTests} onChange={setMaterialTests} />

                {/* 提交按钮 */}
                <div style={{ marginTop: 24 }}>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} block size="large">
                            {mode === 'create' ? '提交委托单' : '保存修改'}
                        </Button>
                    </Form.Item>
                </div>
            </Form>
        </Card>
    )
}
