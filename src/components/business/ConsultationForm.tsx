'use client'

import { useState, useEffect } from 'react'
import { Form, Input, Select, DatePicker, Row, Col, Divider, Upload, Button, Card, Space, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import UserSelect from '@/components/UserSelect'
import SampleTestItemTable, { SampleTestItemData } from '@/components/SampleTestItemTable'
import { showError } from '@/lib/confirm'
import dayjs from 'dayjs'

interface Client {
    id: string
    name: string
    contact?: string
    phone?: string
}

interface TestTemplate {
    name: string
    method?: string
}

interface ConsultationFormProps {
    initialValues?: any
    onFinish: (values: any) => Promise<void>
    onCancel: () => void
    loading?: boolean
    bizId?: string // 编辑时的业务ID，用于关联和附件
}

export default function ConsultationForm({
    initialValues,
    onFinish,
    onCancel,
    loading = false,
    bizId
}: ConsultationFormProps) {
    const [form] = Form.useForm()
    const [clients, setClients] = useState<Client[]>([])
    const [clientsLoading, setClientsLoading] = useState(false)
    const [testTemplates, setTestTemplates] = useState<TestTemplate[]>([])

    // 样品检测项
    const [sampleTestItems, setSampleTestItems] = useState<SampleTestItemData[]>([])

    // 附件上传
    const [fileList, setFileList] = useState<any[]>([])

    // 初始化数据
    useEffect(() => {
        fetchClients()
        fetchTestTemplates()

        if (initialValues) {
            // 这里的 initialValues 应该是处理好的表单数据
            form.setFieldsValue({
                ...initialValues,
                clientReportDeadline: initialValues.clientReportDeadline ? dayjs(initialValues.clientReportDeadline) : undefined,
            })

            // 如果有初始化的样品检测项（主要用于编辑回显，但通常编辑时需要异步加载，或者由父组件传入）
            // 父组件可以通过 initialValues 传入 sampleTestItems，或者单独传入 props
            if (initialValues.sampleTestItems) {
                setSampleTestItems(initialValues.sampleTestItems)
            }

            if (initialValues.attachments) {
                setFileList(initialValues.attachments.map((att: any) => ({
                    uid: att.id,
                    name: att.originalName,
                    status: 'done',
                    url: att.fileUrl,
                    response: att,
                })))
            }
        }
    }, [initialValues, form])

    // 加载样品检测项（如果是编辑模式且父组件没传，这里可以作为备用逻辑，但最好由父组件统一处理数据）
    // 为了简化，假设父组件负责准备好 update 时的所有数据（包括 sampleTestItems）

    const fetchClients = async () => {
        setClientsLoading(true)
        try {
            const res = await fetch('/api/entrustment/client?status=approved&pageSize=1000')
            const json = await res.json()
            setClients(json.list || [])
        } catch (error) {
            console.error('获取客户列表失败', error)
        } finally {
            setClientsLoading(false)
        }
    }

    const fetchTestTemplates = async () => {
        try {
            const res = await fetch('/api/test-template?pageSize=1000')
            const json = await res.json()
            if (json.success && json.data) {
                setTestTemplates(json.data.list || [])
            } else {
                setTestTemplates(json.list || [])
            }
        } catch (error) {
            console.error('获取检测项目列表失败', error)
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

    // 附件上传前验证
    const beforeUpload = (file: File) => {
        const validTypes = [
            'image/jpeg', 'image/png', 'image/gif',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ]

        if (!validTypes.includes(file.type)) {
            message.error('只能上传图片、PDF或Office文档！')
            return false
        }

        const isLt5M = file.size / 1024 / 1024 < 5
        if (!isLt5M) {
            message.error('文件大小不能超过5MB！')
            return false
        }

        return true
    }

    const handleUploadChange = ({ fileList: newFileList }: any) => {
        setFileList(newFileList)
    }

    const handleRemove = async (file: any) => {
        if (file.response && bizId) {
            try {
                await fetch(`/api/upload/consultation/${file.response.id}?consultationId=${bizId}`, {
                    method: 'DELETE',
                })
            } catch (error) {
                console.error('[Consultation] 删除文件失败:', error)
                message.error('删除文件失败')
                return false
            }
        }
        return true
    }

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields()

            // 提取附件信息
            const attachments = fileList
                .filter(file => file.status === 'done' && file.response)
                .map(file => {
                    // 新上传的文件响应结构为 { success: true, data: { ... } }
                    // 回显的文件响应结构直接为 { ... }
                    if (file.response?.data) {
                        return file.response.data
                    }
                    return file.response
                })

            const submitData = {
                ...values,
                clientReportDeadline: values.clientReportDeadline ? values.clientReportDeadline.toISOString() : null,
                attachments: attachments,
                sampleTestItems: sampleTestItems.map(item => ({
                    ...item,
                    // 确保 ID 为空字符串时转为 undefined/null，防止外键错误
                    testTemplateId: item.testTemplateId || undefined,
                    assessorId: item.assessorId || undefined,
                    // 确保数量是数字
                    quantity: Number(item.quantity) || 1,
                    // 确保必填字段有默认值
                    sampleName: item.sampleName || '未命名样品',
                })),
            }

            await onFinish(submitData)
        } catch (error) {
            console.error('表单验证失败', error)
        }
    }

    return (
        <Card bordered={false}>
            <Form form={form} layout="vertical">

                {/* ========== ① 基本信息 ========== */}
                <Divider orientation="left" orientationMargin="0">① 基本信息</Divider>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="clientId" label="客户" rules={[{ required: true, message: '请选择客户' }]}>
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
                        <Form.Item name="clientContactPerson" label="联系人" rules={[{ required: true, message: '请输入联系人' }]}>
                            <Input placeholder="请输入联系人姓名" />
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item name="clientReportDeadline" label="报告时间" rules={[{ required: true, message: '请选择报告时间' }]}>
                            <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="followerId" label="跟单人" rules={[{ required: true, message: '请选择跟单人' }]}>
                            <UserSelect placeholder="请选择跟单人" />
                        </Form.Item>
                    </Col>
                </Row>

                {/* 隐藏字段，保留兼容性 */}
                <Form.Item name="testItems" label="检测项目（多选）" style={{ display: 'none' }}>
                    <Select
                        mode="multiple"
                        options={testTemplates.map(t => ({ value: t.name, label: t.name }))}
                    />
                </Form.Item>

                {/* ========== ② 检测样品 ========== */}
                <Divider orientation="left" orientationMargin="0">② 检测样品</Divider>
                <SampleTestItemTable
                    bizType="consultation"
                    bizId={bizId || undefined}
                    value={sampleTestItems}
                    onChange={setSampleTestItems}
                    showAssessment={true}
                />

                {/* ========== ③ 附件信息 ========== */}
                <Divider orientation="left" orientationMargin="0">③ 附件信息</Divider>
                <div style={{ marginBottom: 8, color: '#666' }}>支持图片、PDF、Word、Excel，单个文件最大5MB，最多5个文件</div>
                <Upload
                    action="/api/upload/consultation"
                    listType="picture"
                    fileList={fileList}
                    maxCount={5}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    beforeUpload={beforeUpload}
                    onChange={handleUploadChange}
                    onRemove={handleRemove}
                >
                    <Button icon={<PlusOutlined />}>上传附件</Button>
                </Upload>

                {/* 底部操作栏 */}
                <div style={{ marginTop: 24 }}>
                    <Form.Item>
                        <Space size="middle">
                            <Button onClick={onCancel} size="large">取消</Button>
                            <Button type="primary" onClick={handleSubmit} loading={loading} size="large">
                                保存
                            </Button>
                        </Space>
                    </Form.Item>
                </div>
            </Form>
        </Card>
    )
}
