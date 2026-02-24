'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { showSuccess, showError } from '@/lib/confirm'
import { Form, Input, Select, Button, Card, Upload, Space, Tag, Table, Spin, Divider, Tooltip } from 'antd'
import { ArrowLeftOutlined, InboxOutlined, PlusOutlined, DeleteOutlined, CloudUploadOutlined, EyeOutlined, FileWordOutlined } from '@ant-design/icons'
import { useRouter, useParams } from 'next/navigation'
import type { UploadProps } from 'antd'
import dynamic from 'next/dynamic'

// XRF 默认数据
const defaultXrfRows = [
    { key: '1', element: '铅/Pb', polymer: 'P≤(700-3S)＜X＜(1300+3S)≤F', metal: 'P≤(700-3S)＜X＜(1300+3S)≤F', other: 'P≤(500-3S)＜X＜(1500+3S)≤F' },
    { key: '2', element: '镉/Cd', polymer: 'P≤(70-3S)＜X＜(130+3S)≤F', metal: 'P≤(70-3S)＜X＜(130+3S)≤F', other: 'LOD＜X＜(150+3S)≤F' },
    { key: '3', element: '汞/Hg', polymer: 'P≤(700-3S)＜X＜(1300+3S)≤F', metal: 'P≤(700-3S)＜X＜(1300+3S)≤F', other: 'P≤(500-3S)＜X＜(1500+3S)≤F' },
    { key: '4', element: '铬/Cr', polymer: 'P≤(700-3S)＜X', metal: '/', other: 'P≤(500-3S)＜X' },
    { key: '5', element: '溴/Br', polymer: 'P≤(300-3S)＜X', metal: '/', other: 'P≤(250-3S)＜X' },
]

// 默认检测标准
const defaultTestStandards = `QC/T 941-2013《汽车材料中汞的检测方法》
QC/T 942-2021《汽车材料中六价铬的检测方法》
QC/T 943-2013《汽车材料中铅、镉的检测方法》
QC/T 944-2013《汽车材料中多溴联苯(PBBs)和多溴二苯醚(PBDEs)的检测方法》
GWT A A82-01:2025-12《汽车禁/限用物质要求-EN》`

export default function TemplateEditPage() {
    const router = useRouter()
    const params = useParams()
    const id = params.id as string
    const isNew = id === 'new'

    const [form] = Form.useForm()
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [fileUrl, setFileUrl] = useState('')
    const [fileName, setFileName] = useState('')

    // 左侧预览
    const previewRef = useRef<HTMLDivElement>(null)
    const [previewing, setPreviewing] = useState(false)
    const [previewError, setPreviewError] = useState('')

    // 右侧字段映射
    const [extractedFields, setExtractedFields] = useState<{
        autoFields: { tag: string; label: string }[]
        editableFields: { tag: string; label: string }[]
        loopFields: { tag: string; label: string }[]
    } | null>(null)

    // 可编辑数据
    const [testStandards, setTestStandards] = useState(defaultTestStandards)
    const [xrfRows, setXrfRows] = useState(defaultXrfRows)

    // docx-preview 渲染
    const renderPreview = useCallback(async (url: string) => {
        if (!previewRef.current) return
        setPreviewing(true)
        setPreviewError('')
        try {
            // 获取 docx 文件内容
            const res = await fetch(url)
            if (!res.ok) throw new Error('获取文件失败')
            const blob = await res.blob()

            // 动态导入 docx-preview（仅客户端）
            const { renderAsync } = await import('docx-preview')

            // 清空容器并渲染
            previewRef.current.innerHTML = ''
            await renderAsync(blob, previewRef.current, undefined, {
                className: 'docx-preview-wrapper',
                inWrapper: true,
                ignoreWidth: false,
                ignoreHeight: false,
                ignoreFonts: false,
                breakPages: true,
                ignoreLastRenderedPageBreak: true,
                experimental: false,
                trimXmlDeclaration: true,
                useBase64URL: true,
            })
        } catch (e: any) {
            setPreviewError('预览加载失败: ' + e.message)
        } finally {
            setPreviewing(false)
        }
    }, [])

    // 提取占位符
    const extractFields = async (url: string) => {
        try {
            const res = await fetch('/api/report-template/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileUrl: url })
            })
            const json = await res.json()
            if (json.success) {
                setExtractedFields(json.data)
            }
        } catch { /* 忽略提取失败 */ }
    }

    // 加载模板详情
    useEffect(() => {
        if (!isNew) {
            fetchTemplate()
        }
    }, [id])

    const fetchTemplate = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/report-template/${id}`)
            const json = await res.json()
            if (json.success && json.data) {
                const d = json.data
                form.setFieldsValue({ name: d.name })
                setFileUrl(d.fileUrl || '')

                // 加载检测标准
                if (d.testStandards) setTestStandards(d.testStandards)

                // 加载 XRF 配置
                if (d.xrfScreeningConfig) {
                    try {
                        const parsed = typeof d.xrfScreeningConfig === 'string'
                            ? JSON.parse(d.xrfScreeningConfig) : d.xrfScreeningConfig
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            setXrfRows(parsed.map((r: any, i: number) => ({ ...r, key: String(i + 1) })))
                        }
                    } catch { /* 忽略 */ }
                }

                // 渲染预览
                if (d.fileUrl) {
                    renderPreview(d.fileUrl)
                    extractFields(d.fileUrl)
                }
            }
        } catch {
            showError('获取模板失败')
        } finally {
            setLoading(false)
        }
    }

    // 文件上传
    const wordUploadProps: UploadProps = {
        name: 'file',
        action: '/api/upload',
        accept: '.docx',
        showUploadList: false,
        onChange(info) {
            if (info.file.status === 'done') {
                const url = info.file.response?.url || info.file.response?.data?.url
                if (url) {
                    setFileUrl(url)
                    setFileName(info.file.name)
                    renderPreview(url)
                    extractFields(url)
                    showSuccess('模板文件上传成功')
                }
            } else if (info.file.status === 'error') {
                showError('文件上传失败')
            }
        }
    }

    // 保存
    const handleSave = async () => {
        try {
            const values = await form.validateFields()
            setSaving(true)

            const payload = {
                ...values,
                code: `CTPL-${Date.now()}`,
                category: 'client_report',
                fileUrl,
                testStandards,
                xrfScreeningConfig: JSON.stringify(xrfRows.map(({ key, ...rest }) => rest)),
            }

            const url = isNew ? '/api/report-template' : `/api/report-template/${id}`
            const method = isNew ? 'POST' : 'PUT'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const json = await res.json()
            if (res.ok && json.success) {
                showSuccess(isNew ? '创建成功' : '更新成功')
                router.push('/report/client-template')
            } else {
                showError(json.error || '操作失败')
            }
        } catch (error: any) {
            if (error?.errorFields) return
            showError('操作失败')
        } finally {
            setSaving(false)
        }
    }

    // XRF 表格列定义
    const xrfColumns = [
        {
            title: '元素', dataIndex: 'element', width: 90,
            render: (v: string, _: any, i: number) => (
                <Input size="small" value={v} onChange={e => {
                    const rows = [...xrfRows]; rows[i] = { ...rows[i], element: e.target.value }; setXrfRows(rows)
                }} />
            )
        },
        {
            title: '聚合物材料', dataIndex: 'polymer',
            render: (v: string, _: any, i: number) => (
                <Input size="small" value={v} onChange={e => {
                    const rows = [...xrfRows]; rows[i] = { ...rows[i], polymer: e.target.value }; setXrfRows(rows)
                }} />
            )
        },
        {
            title: '金属材料', dataIndex: 'metal',
            render: (v: string, _: any, i: number) => (
                <Input size="small" value={v} onChange={e => {
                    const rows = [...xrfRows]; rows[i] = { ...rows[i], metal: e.target.value }; setXrfRows(rows)
                }} />
            )
        },
        {
            title: '其他材料', dataIndex: 'other',
            render: (v: string, _: any, i: number) => (
                <Input size="small" value={v} onChange={e => {
                    const rows = [...xrfRows]; rows[i] = { ...rows[i], other: e.target.value }; setXrfRows(rows)
                }} />
            )
        },
        {
            title: '', width: 40, align: 'center' as const,
            render: (_: any, __: any, i: number) => (
                <Button type="text" danger size="small" icon={<DeleteOutlined />}
                    onClick={() => { const rows = [...xrfRows]; rows.splice(i, 1); setXrfRows(rows) }}
                />
            )
        },
    ]

    if (loading) return <div className="p-8 text-center"><Spin size="large" /></div>

    return (
        <div className="p-4" style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
            {/* 顶部栏 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/report/client-template')}>返回</Button>
                    <h2 style={{ margin: 0 }}>{isNew ? '新增模板' : '编辑模板'}</h2>
                </div>
                <Space>
                    <Button onClick={() => router.push('/report/client-template')}>取消</Button>
                    <Button type="primary" loading={saving} onClick={handleSave} icon={<CloudUploadOutlined />}>
                        {isNew ? '创建模板' : '保存修改'}
                    </Button>
                </Space>
            </div>

            {/* 主体：左右分栏 */}
            <div style={{ flex: 1, display: 'flex', gap: 16, overflow: 'hidden' }}>
                {/* 左侧：Word 预览 */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <Card
                        size="small"
                        title={<span><FileWordOutlined /> {fileName ? `模板预览 - ${fileName}` : 'Word 模板预览'}</span>}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                        styles={{ body: { flex: 1, overflow: 'auto', padding: 0 } }}
                    >
                        {!fileUrl ? (
                            <div style={{ padding: 24 }}>
                                <Upload.Dragger {...wordUploadProps}>
                                    <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                                    <p className="ant-upload-text">将 .docx 模板文件拖到此处，或点击上传</p>
                                    <p className="ant-upload-hint">上传后将自动预览模板并提取可编辑字段</p>
                                </Upload.Dragger>
                            </div>
                        ) : (
                            <>
                                {previewing && (
                                    <div style={{ textAlign: 'center', padding: 40 }}>
                                        <Spin size="large" tip="正在渲染预览..." />
                                    </div>
                                )}
                                {previewError && (
                                    <div style={{ textAlign: 'center', padding: 40, color: '#ff4d4f' }}>
                                        {previewError}
                                    </div>
                                )}
                                <div
                                    ref={previewRef}
                                    style={{ display: previewing ? 'none' : 'block' }}
                                />
                                {/* 重新上传按钮 */}
                                <div style={{ position: 'absolute', top: 8, right: 12, zIndex: 10 }}>
                                    <Upload {...wordUploadProps}>
                                        <Tooltip title="重新上传模板">
                                            <Button size="small" icon={<CloudUploadOutlined />}>更换文件</Button>
                                        </Tooltip>
                                    </Upload>
                                </div>
                            </>
                        )}
                    </Card>
                </div>

                {/* 右侧：字段配置 */}
                <div style={{ flex: 2, display: 'flex', flexDirection: 'column', overflow: 'auto', minWidth: 320 }}>
                    {/* 基本信息 */}
                    <Card size="small" title="📋 基本信息" style={{ marginBottom: 12 }}>
                        <Form form={form} layout="vertical" size="small">
                            <Form.Item name="name" label="模板名称" rules={[{ required: true, message: '请输入模板名称' }]}>
                                <Input placeholder="如：QCT 检测报告模板" />
                            </Form.Item>
                        </Form>
                    </Card>

                    {/* 上传后才显示配置区域 */}
                    {fileUrl ? (
                        <>
                            {/* 占位符字段 */}
                            {extractedFields && (
                                <Card size="small" title={`🏷️ 模板字段 (${extractedFields.autoFields.length + extractedFields.editableFields.length + extractedFields.loopFields.length}个)`} style={{ marginBottom: 12 }}>
                                    {extractedFields.autoFields.length > 0 && (
                                        <>
                                            <div style={{ marginBottom: 6, fontWeight: 500, fontSize: 12, color: '#1677ff' }}>🔒 系统自动填充</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                                                {extractedFields.autoFields.map(f => (
                                                    <Tag key={f.tag} color="blue">{f.label}</Tag>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                    {extractedFields.loopFields.length > 0 && (
                                        <>
                                            <div style={{ marginBottom: 6, fontWeight: 500, fontSize: 12, color: '#52c41a' }}>📊 数据循环区域</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                                                {extractedFields.loopFields.map(f => (
                                                    <Tag key={f.tag} color="green">{f.label}</Tag>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                    {extractedFields.editableFields.length > 0 && (
                                        <>
                                            <div style={{ marginBottom: 6, fontWeight: 500, fontSize: 12, color: '#fa8c16' }}>✏️ 自定义字段</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                {extractedFields.editableFields.map(f => (
                                                    <Tag key={f.tag} color="orange">{f.tag}</Tag>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </Card>
                            )}

                            {/* 检测标准 */}
                            <Card size="small" title="📄 检测依据" style={{ marginBottom: 12 }}>
                                <p style={{ color: '#999', fontSize: 11, marginBottom: 8 }}>
                                    每行一条标准，生成报告时自动填充到「检测依据」区域。
                                </p>
                                <Input.TextArea
                                    rows={6}
                                    value={testStandards}
                                    onChange={e => setTestStandards(e.target.value)}
                                    placeholder="QC/T 941-2013《汽车材料中汞的检测方法》"
                                    style={{ fontSize: 12 }}
                                />
                            </Card>

                            {/* XRF 表 */}
                            <Card size="small" title="📊 XRF 初筛判定范围（mg/kg）" style={{ marginBottom: 12 }}>
                                <Table
                                    dataSource={xrfRows}
                                    columns={xrfColumns}
                                    pagination={false}
                                    size="small"
                                    bordered
                                    scroll={{ x: true }}
                                />
                                <Button
                                    type="dashed" block size="small" icon={<PlusOutlined />}
                                    style={{ marginTop: 6 }}
                                    onClick={() => setXrfRows([...xrfRows, { key: String(Date.now()), element: '', polymer: '', metal: '', other: '' }])}
                                >
                                    添加元素
                                </Button>
                            </Card>
                        </>
                    ) : (
                        <Card size="small" style={{ marginBottom: 12, textAlign: 'center', color: '#999', padding: 24 }}>
                            <FileWordOutlined style={{ fontSize: 32, marginBottom: 8 }} />
                            <p>请先在左侧上传 Word 模板文件</p>
                            <p style={{ fontSize: 11 }}>上传后将自动预览并提取可编辑字段</p>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}
