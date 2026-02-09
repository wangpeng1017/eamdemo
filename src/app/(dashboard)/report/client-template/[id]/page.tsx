'use client'

import { useState, useEffect } from 'react'
import { showSuccess, showError } from '@/lib/confirm'
import { Form, Input, Select, Switch, Button, Card, Tabs, Upload, Image, Space, Divider } from 'antd'
import { ArrowLeftOutlined, UploadOutlined, InboxOutlined } from '@ant-design/icons'
import { useRouter, useParams } from 'next/navigation'
import type { UploadProps } from 'antd'

const categoryOptions = [
    { value: 'client_report', label: '客户报告' },
    { value: 'summary', label: '汇总报告' },
    { value: 'other', label: '其他' }
]

const stampPositionOptions = [
    { value: 'bottom-right', label: '右下角' },
    { value: 'bottom-center', label: '底部居中' },
    { value: 'bottom-left', label: '左下角' },
]

export default function TemplateEditPage() {
    const router = useRouter()
    const params = useParams()
    const id = params.id as string
    const isNew = id === 'new'

    const [form] = Form.useForm()
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [stampPreview, setStampPreview] = useState<string | null>(null)
    const [logoPreview, setLogoPreview] = useState<string | null>(null)

    // 获取模板详情
    useEffect(() => {
        if (!isNew) {
            fetchTemplate()
        } else {
            // 新建时设置默认值
            form.setFieldsValue({
                category: 'client_report',
                coverTitle: '检测报告',
                coverSubtitle: 'Test Report',
                coverShowDate: true,
                backCoverStatement: '1. 本报告无检测单位"报告专用章"或公章无效。\n2. 复制本报告未重新加盖"报告专用章"无效。\n3. 本报告无主检、审核及批准人签字无效。\n4. 本报告涂改无效。',
                stampPosition: 'bottom-right',
            })
        }
    }, [id])

    const fetchTemplate = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/report-template/${id}`)
            const json = await res.json()
            if (json.success && json.data) {
                const d = json.data
                form.setFieldsValue({
                    code: d.code,
                    name: d.name,
                    category: d.category,
                    fileUrl: d.fileUrl,
                    remark: d.remark,
                    status: d.status,
                    coverTitle: d.coverTitle || '',
                    coverSubtitle: d.coverSubtitle || '',
                    coverLogo: d.coverLogo || '',
                    coverShowDate: d.coverShowDate ?? true,
                    backCoverStatement: d.backCoverStatement || '',
                    backCoverCustomText: d.backCoverCustomText || '',
                    stampImageUrl: d.stampImageUrl || '',
                    stampPosition: d.stampPosition || 'bottom-right',
                })
                if (d.stampImageUrl) setStampPreview(d.stampImageUrl)
                if (d.coverLogo) setLogoPreview(d.coverLogo)
            } else {
                showError('模板不存在')
                router.push('/report/client-template')
            }
        } catch (error) {
            showError('获取模板失败')
        } finally {
            setLoading(false)
        }
    }

    // 保存
    const handleSave = async () => {
        try {
            const values = await form.validateFields()
            setSaving(true)

            const url = isNew ? '/api/report-template' : `/api/report-template/${id}`
            const method = isNew ? 'POST' : 'PUT'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values)
            })

            const json = await res.json()
            if (res.ok && json.success) {
                showSuccess(isNew ? '创建成功' : '更新成功')
                router.push('/report/client-template')
            } else {
                showError(json.error || '操作失败')
            }
        } catch (error: any) {
            if (error?.errorFields) return // 表单验证失败
            showError('操作失败')
        } finally {
            setSaving(false)
        }
    }

    // 文件上传配置（Word 模板）
    const wordUploadProps: UploadProps = {
        name: 'file',
        action: '/api/upload',
        accept: '.docx,.doc',
        maxCount: 1,
        onChange(info) {
            if (info.file.status === 'done') {
                const url = info.file.response?.url || info.file.response?.data?.url
                if (url) {
                    form.setFieldValue('fileUrl', url)
                    showSuccess('模板文件上传成功')
                }
            } else if (info.file.status === 'error') {
                showError('文件上传失败')
            }
        },
    }

    // 图片上传（Logo / 印章）
    const createImageUpload = (field: string, setPreview: (url: string) => void): UploadProps => ({
        name: 'file',
        action: '/api/upload',
        accept: '.png,.jpg,.jpeg,.svg',
        maxCount: 1,
        showUploadList: false,
        onChange(info) {
            if (info.file.status === 'done') {
                const url = info.file.response?.url || info.file.response?.data?.url
                if (url) {
                    form.setFieldValue(field, url)
                    setPreview(url)
                    showSuccess('图片上传成功')
                }
            } else if (info.file.status === 'error') {
                showError('图片上传失败')
            }
        },
    })

    const tabItems = [
        {
            key: 'basic',
            label: '基本信息',
            children: (
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-2">
                    <Form.Item name="code" label="模板编码" rules={[{ required: true, message: '请输入模板编码' }]}>
                        <Input placeholder="如：CTPL-001" disabled={!isNew} />
                    </Form.Item>
                    <Form.Item name="name" label="模板名称" rules={[{ required: true, message: '请输入模板名称' }]}>
                        <Input placeholder="如：客户检测报告模板-标准版" />
                    </Form.Item>
                    <Form.Item name="category" label="分类" rules={[{ required: true }]} initialValue="client_report">
                        <Select options={categoryOptions} placeholder="选择分类" />
                    </Form.Item>
                    {!isNew && (
                        <Form.Item name="status" label="状态">
                            <Select options={[
                                { value: 'active', label: '启用' },
                                { value: 'inactive', label: '停用' }
                            ]} />
                        </Form.Item>
                    )}
                    <Form.Item label="Word 模板文件" className="col-span-2">
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <Upload.Dragger {...wordUploadProps}>
                                <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                                <p className="ant-upload-text">将 .docx 文件拖到此处，或点击上传</p>
                                <p className="ant-upload-hint">支持 Word 文档格式 (.docx)</p>
                            </Upload.Dragger>
                            <Form.Item name="fileUrl" noStyle>
                                <Input placeholder="或直接输入文件路径/URL" />
                            </Form.Item>
                        </Space>
                    </Form.Item>
                    <Form.Item name="remark" label="备注" className="col-span-2">
                        <Input.TextArea rows={2} placeholder="可选，填写备注信息" />
                    </Form.Item>
                </div>
            )
        },
        {
            key: 'cover',
            label: '封面配置',
            children: (
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-2">
                    <Form.Item name="coverTitle" label="报告标题">
                        <Input placeholder="如：检测报告" />
                    </Form.Item>
                    <Form.Item name="coverSubtitle" label="报告副标题">
                        <Input placeholder="如：Test Report" />
                    </Form.Item>
                    <Form.Item label="Logo 图片" className="col-span-2">
                        <Space align="start" size={16}>
                            <Upload {...createImageUpload('coverLogo', setLogoPreview)}>
                                <Button icon={<UploadOutlined />}>上传 Logo</Button>
                            </Upload>
                            {logoPreview && (
                                <Image
                                    src={logoPreview}
                                    alt="Logo 预览"
                                    width={120}
                                    style={{ border: '1px solid #d9d9d9', borderRadius: 4 }}
                                />
                            )}
                            <Form.Item name="coverLogo" noStyle>
                                <Input placeholder="或输入 Logo URL" style={{ width: 300 }} />
                            </Form.Item>
                        </Space>
                    </Form.Item>
                    <Form.Item name="coverShowDate" label="显示日期" valuePropName="checked">
                        <Switch checkedChildren="是" unCheckedChildren="否" />
                    </Form.Item>
                </div>
            )
        },
        {
            key: 'backCover',
            label: '封底配置',
            children: (
                <div className="mt-2">
                    <Form.Item name="backCoverStatement" label="声明语句" extra="每行一条声明，会自动编号显示在封底">
                        <Input.TextArea rows={6} placeholder={'1. 本报告无检测单位报告专用章或公章无效。\n2. 复制本报告未重新加盖报告专用章无效。'} />
                    </Form.Item>
                    <Form.Item name="backCoverCustomText" label="自定义结语" extra="可选，显示在声明下方">
                        <Input.TextArea rows={3} placeholder="可选，如公司地址、联系方式等" />
                    </Form.Item>
                </div>
            )
        },
        {
            key: 'stamp',
            label: '印章配置',
            children: (
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-2">
                    <Form.Item label="印章图片" className="col-span-2">
                        <Space align="start" size={16}>
                            <Upload {...createImageUpload('stampImageUrl', setStampPreview)}>
                                <Button icon={<UploadOutlined />}>上传印章</Button>
                            </Upload>
                            {stampPreview && (
                                <Image
                                    src={stampPreview}
                                    alt="印章预览"
                                    width={120}
                                    style={{ border: '1px dashed #d9d9d9', borderRadius: 4, padding: 4 }}
                                />
                            )}
                            <Form.Item name="stampImageUrl" noStyle>
                                <Input placeholder="或输入印章图片 URL" style={{ width: 300 }} />
                            </Form.Item>
                        </Space>
                    </Form.Item>
                    <Form.Item name="stampPosition" label="印章位置">
                        <Select options={stampPositionOptions} placeholder="选择印章位置" style={{ width: 200 }} />
                    </Form.Item>
                    <div className="col-span-2">
                        <p style={{ color: '#999', fontSize: 12 }}>
                            提示：印章图片建议使用透明背景的 PNG 格式，推荐尺寸 200×200 像素。生成报告 PDF 时会自动叠加到指定位置。
                        </p>
                    </div>
                </div>
            )
        }
    ]

    return (
        <div className="p-6">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={() => router.push('/report/client-template')}
                    style={{ marginRight: 12 }}
                >
                    返回
                </Button>
                <h2 style={{ margin: 0 }}>{isNew ? '新增模板' : '编辑模板'}</h2>
            </div>

            <Card loading={loading}>
                <Form form={form} layout="vertical">
                    <Tabs items={tabItems} />
                    <Divider />
                    <div style={{ textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => router.push('/report/client-template')}>取消</Button>
                            <Button type="primary" onClick={handleSave} loading={saving}>
                                {isNew ? '创建模板' : '保存修改'}
                            </Button>
                        </Space>
                    </div>
                </Form>
            </Card>
        </div>
    )
}
