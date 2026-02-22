'use client'

/**
 * @file 委托单表单 - Card 分块布局
 * @desc 对齐 Excel 模板「测试申请表-通用.xls」的区块结构
 * @input 依赖: SampleInfoTable, ComponentTestTable, MaterialTestTable
 */

import { useState, useEffect, useCallback } from 'react'
import { Form, Input, InputNumber, DatePicker, Select, Button, Row, Col, Divider, Radio, Card, Checkbox, Typography, Space, Collapse } from 'antd'
import { showSuccess, showError } from '@/lib/confirm'
import SampleInfoTable, { SampleInfoData } from '@/components/business/SampleInfoTable'
import ComponentTestTable, { ComponentTestData } from '@/components/business/ComponentTestTable'
import MaterialTestTable, { MaterialTestData } from '@/components/business/MaterialTestTable'
import UserSelect from '@/components/UserSelect'
import { getDefaultPrintTerms } from '@/lib/entrustment-defaults'
import dayjs from 'dayjs'

const { Text } = Typography

interface EntrustmentFormProps {
    initialValues?: any
    mode: 'create' | 'edit'
    onSubmit: (values: any) => Promise<void>
    loading?: boolean
}

// 区块标题样式
const sectionTitle = (num: string, cn: string, en: string) => (
    <Space>
        <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 24, height: 24, borderRadius: '50%',
            background: '#1890ff', color: '#fff', fontSize: 13, fontWeight: 600,
        }}>{num}</span>
        <span style={{ fontWeight: 600, fontSize: 15 }}>{cn}</span>
        <span style={{ color: '#999', fontSize: 12 }}>{en}</span>
    </Space>
)

export default function EntrustmentForm({ initialValues, mode, onSubmit, loading }: EntrustmentFormProps) {
    const [form] = Form.useForm()
    const [users, setUsers] = useState<any[]>([])
    const [clients, setClients] = useState<any[]>([])
    const [contracts, setContracts] = useState<any[]>([])
    const [samples, setSamples] = useState<SampleInfoData[]>([])
    const [componentTests, setComponentTests] = useState<ComponentTestData[]>([])
    const [materialTests, setMaterialTests] = useState<MaterialTestData[]>([])
    const [reportGroupingValue, setReportGroupingValue] = useState<string | undefined>()
    const [printTerms, setPrintTerms] = useState<any>(getDefaultPrintTerms())

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
            if (formValues.reportGrouping) setReportGroupingValue(formValues.reportGrouping)

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
                    vehicleModel: s.vehicleModel || '',
                    manufactureDate: s.manufactureDate || '',
                    manufactureLotNo: s.manufactureLotNo || '',
                    packingDate: s.packingDate || '',
                    projectDeadline: s.projectDeadline || '',
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

            // 打印声明条款
            if (initialValues.printTerms) {
                const pt = typeof initialValues.printTerms === 'string'
                    ? JSON.parse(initialValues.printTerms)
                    : initialValues.printTerms
                setPrintTerms({ ...getDefaultPrintTerms(), ...pt })
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
                invoiceAddress: client?.invoiceAddress || '',
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
                invoiceAddress: client.invoiceAddress || '',
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
            samples: samples.filter(s => s.name),
            componentTests: componentTests.filter(t => t.testItemName),
            materialTests: materialTests.filter(t => t.testItemName),
            printTerms: JSON.stringify(printTerms),
        }

        await onSubmit(submitData)
    }

    // 公共卡片样式
    const cardStyle = { marginBottom: 16 }
    const cardBodyStyle = { paddingBottom: 4 }

    return (
        <Form form={form} layout="vertical" onFinish={handleFinish}>
            <Form.Item name="clientId" hidden><Input /></Form.Item>

            {/* ========== ① 申请方信息（含开票） ========== */}
            <Card title={sectionTitle('1', '申请方信息', 'Applicant Information')} style={cardStyle} styles={{ body: cardBodyStyle }}>
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
                        <Form.Item name="clientName" label="●委托单位 Applicant" rules={[{ required: true, message: '请选择委托单位' }]}>
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

                <Row gutter={16}>
                    <Col span={6}>
                        <Form.Item name="contactPerson" label="●联系人 Contact">
                            <Input placeholder="联系人" />
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item name="contactPhone" label="●电话 Telephone">
                            <Input placeholder="电话" />
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item name="contactFax" label="传真 Fax">
                            <Input placeholder="传真" />
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item name="contactEmail" label="●邮箱 Email" rules={[{ type: 'email', message: '请输入正确的邮箱格式' }]}>
                            <Input placeholder="邮箱" />
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item name="clientAddress" label="●地址 Address">
                    <Input placeholder="地址" />
                </Form.Item>

                <Divider style={{ margin: '8px 0 16px' }} dashed />

                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item name="invoiceTitle" label="●发票抬头 Invoice Title">
                            <Input placeholder="开票抬头（自动从客户信息带出）" />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="taxId" label="●税号 Tax ID">
                            <Input placeholder="统一社会信用代码/税号" />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="invoiceAddress" label="发票地址">
                            <Input placeholder="发票地址" />
                        </Form.Item>
                    </Col>
                </Row>
            </Card>

            {/* ========== ② 报告要求 ========== */}
            <Card title={sectionTitle('2', '报告要求', 'Report Requirements')} style={cardStyle} styles={{ body: cardBodyStyle }}>
                <Row gutter={16}>
                    <Col span={6}>
                        <Form.Item name="serviceScope" label="认证标记">
                            <Checkbox.Group>
                                <Checkbox value="CMA">CMA</Checkbox>
                                <Checkbox value="CNAS">CNAS</Checkbox>
                            </Checkbox.Group>
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item name="reportLanguage" label="●报告语种 Report Language" initialValue="cn">
                            <Radio.Group>
                                <Radio value="cn">中文</Radio>
                                <Radio value="en">English</Radio>
                                <Radio value="cn_en">中英文</Radio>
                            </Radio.Group>
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item name="reportFormat" label="●报告类型 Report Type">
                            <Select placeholder="选择报告类型" allowClear options={[
                                { value: 'soft', label: '电子版 Soft Copy' },
                                { value: 'hard', label: '纸质版 Hard Copy (¥100/份)' },
                                { value: 'both', label: '电子版+纸质版' },
                            ]} />
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item name="urgencyLevel" label="●服务类型 Service Type" initialValue="normal">
                            <Select options={[
                                { value: 'normal', label: '常规 Regular' },
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
                        <Form.Item name="reportGrouping" label="●报告出具方式" rules={[{ required: true, message: '请选择报告出具方式' }]}>
                            <Select placeholder="选择出具方式" allowClear onChange={(val) => setReportGroupingValue(val)} options={[
                                { value: 'by_sample', label: '按样品出具' },
                                { value: 'by_project', label: '按项目出具' },
                                { value: 'merged', label: '合并出具' },
                            ]} />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        {reportGroupingValue && (
                            <div style={{ marginTop: 30, padding: '6px 12px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6 }}>
                                <Text type="success" style={{ fontSize: 13 }}>
                                    {reportGroupingValue === 'by_sample' && `按样品出具：将为每个样品生成独立报告编号（当前 ${samples.filter(s => s.name).length} 个样品）`}
                                    {reportGroupingValue === 'by_project' && '按项目出具：将为每个检测项目生成独立报告编号'}
                                    {reportGroupingValue === 'merged' && '合并出具：所有样品和检测项目合并为 1 份报告'}
                                </Text>
                            </div>
                        )}
                    </Col>
                </Row>
            </Card>

            {/* ========== ③ 寄送要求 ========== */}
            <Card title={sectionTitle('3', '寄送要求', 'Delivery Requirements')} style={cardStyle} styles={{ body: cardBodyStyle }}>
                <Row gutter={16}>
                    <Col span={6}>
                        <Form.Item name="reportDelivery" label="●报告送递方式">
                            <Select placeholder="选择" options={[
                                { value: 'email', label: '电邮 Email' },
                                { value: 'fax', label: '传真 Fax' },
                                { value: 'pickup', label: '自取 Self Pick-up' },
                                { value: 'courier', label: '快递到付 Express' },
                            ]} />
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item name="reportDeliveryAddress" label="●报告寄送地址">
                            <Input placeholder="报告寄送地址" />
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
                        <Form.Item name="isSampleReturn" label="●退回样品 Return Sample" initialValue={false}>
                            <Radio.Group>
                                <Radio value={true}>是（邮费自付）</Radio>
                                <Radio value={false}>否</Radio>
                            </Radio.Group>
                        </Form.Item>
                    </Col>
                </Row>
            </Card>

            {/* ========== ④ 样品信息 ========== */}
            <Card title={sectionTitle('4', '样品信息', 'Sample Information')} style={cardStyle} styles={{ body: { padding: '12px 16px' } }}>
                <SampleInfoTable value={samples} onChange={setSamples} />
            </Card>

            {/* ========== ⑤ 试验信息 & 特殊要求 ========== */}
            <Card title={sectionTitle('5', '试验信息 & 特殊要求', 'Test Info & Special Requirements')} style={cardStyle} styles={{ body: cardBodyStyle }}>
                <Row gutter={16}>
                    <Col span={6}>
                        <Form.Item name="testType" label="●试验类型">
                            <Select placeholder="选择试验类型" allowClear options={[
                                { value: 'DV', label: 'DV' },
                                { value: 'PV', label: 'PV' },
                                { value: 'DV_PV', label: 'DV/PV 二合一' },
                                { value: 'pilot', label: '摸底试验' },
                                { value: 'annual', label: '年度试验' },
                            ]} />
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item name="oemFactory" label="●主机厂">
                            <Input placeholder="主机厂名称" />
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item name="sampleDeliveryMethod" label="●送样方式">
                            <Select placeholder="选择送样方式" allowClear options={[
                                { value: 'customer', label: '客户送样' },
                                { value: 'logistics', label: '物流/快递' },
                                { value: 'agency', label: '中介公司' },
                                { value: 'other', label: '其他' },
                            ]} />
                        </Form.Item>
                    </Col>
                    <Col span={6}>
                        <Form.Item name="sampleDate" label="●送样时间" rules={[{ required: true, message: '请选择送样时间' }]}>
                            <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="followerId" label="●跟单人" rules={[{ required: true, message: '请选择跟单人' }]}>
                            <UserSelect placeholder="选择跟单人" />
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item name="specialRequirements" label="特殊要求">
                    <Input.TextArea rows={3} placeholder="如有特殊检测要求，请在此说明（如样品保存时间、测试温度等）" />
                </Form.Item>
            </Card>

            {/* ========== ⑥ 零部件级测试要求 ========== */}
            <Card title={sectionTitle('6', '零部件级测试要求', 'Component Test Requirement')} style={cardStyle} styles={{ body: { padding: '12px 16px' } }}>
                <ComponentTestTable value={componentTests} onChange={setComponentTests} sampleNames={samples.map(s => s.name).filter(Boolean)} />
            </Card>

            {/* ========== ⑦ 材料级测试要求 ========== */}
            <Card title={sectionTitle('7', '材料级测试要求', 'Material Test Requirement')} style={cardStyle} styles={{ body: { padding: '12px 16px' } }}>
                <MaterialTestTable value={materialTests} onChange={setMaterialTests} sampleNames={samples.map(s => s.name).filter(Boolean)} />
            </Card>

            {/* ========== ⑧ 声明条款（打印时显示） ========== */}
            <Card title={sectionTitle('8', '声明条款（打印时显示）', 'Declarations & Notes')} style={cardStyle} styles={{ body: cardBodyStyle }}>
                <div style={{ marginBottom: 8, color: '#999', fontSize: 13 }}>以下内容将显示在打印输出中，已自动填充默认值，可根据需要修改</div>

                <div style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>样品管理规定</div>
                    <Input.TextArea
                        rows={2}
                        value={printTerms.sampleRule}
                        onChange={e => setPrintTerms({ ...printTerms, sampleRule: e.target.value })}
                    />
                </div>

                <div style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>周期说明</div>
                    <Input.TextArea
                        rows={5}
                        value={printTerms.cycleDesc}
                        onChange={e => setPrintTerms({ ...printTerms, cycleDesc: e.target.value })}
                    />
                </div>

                <div style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>附件说明</div>
                    <Input.TextArea
                        rows={2}
                        value={printTerms.attachmentNote}
                        onChange={e => setPrintTerms({ ...printTerms, attachmentNote: e.target.value })}
                    />
                </div>

                <div style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>分包声明</div>
                    <Input.TextArea
                        rows={3}
                        value={printTerms.subcontractStatement}
                        onChange={e => setPrintTerms({ ...printTerms, subcontractStatement: e.target.value })}
                    />
                </div>

                <div style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>费用声明</div>
                    <Input.TextArea
                        rows={2}
                        value={printTerms.feeStatement}
                        onChange={e => setPrintTerms({ ...printTerms, feeStatement: e.target.value })}
                    />
                </div>

                <Collapse
                    ghost
                    items={[{
                        key: 'notes',
                        label: <span style={{ fontWeight: 600 }}>底部注释 Notes（共 {printTerms.notes?.length || 0} 条）</span>,
                        children: (
                            <div>
                                {(printTerms.notes || []).map((note: any, idx: number) => (
                                    <div key={idx} style={{ marginBottom: 12, padding: '8px 12px', background: '#fafafa', borderRadius: 4 }}>
                                        <div style={{ marginBottom: 4, fontSize: 12, color: '#999' }}>第 {idx + 1} 条</div>
                                        <Input.TextArea
                                            rows={2}
                                            value={note.zh}
                                            onChange={e => {
                                                const newNotes = [...printTerms.notes]
                                                newNotes[idx] = { ...newNotes[idx], zh: e.target.value }
                                                setPrintTerms({ ...printTerms, notes: newNotes })
                                            }}
                                            placeholder="中文"
                                            style={{ marginBottom: 4 }}
                                        />
                                        <Input.TextArea
                                            rows={2}
                                            value={note.en}
                                            onChange={e => {
                                                const newNotes = [...printTerms.notes]
                                                newNotes[idx] = { ...newNotes[idx], en: e.target.value }
                                                setPrintTerms({ ...printTerms, notes: newNotes })
                                            }}
                                            placeholder="English"
                                            style={{ fontSize: 12 }}
                                        />
                                    </div>
                                ))}
                            </div>
                        ),
                    }]}
                />
            </Card>

            {/* 提交按钮 */}
            <div style={{ marginTop: 8 }}>
                <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} block size="large">
                        {mode === 'create' ? '提交委托单' : '保存修改'}
                    </Button>
                </Form.Item>
            </div>
        </Form>
    )
}
