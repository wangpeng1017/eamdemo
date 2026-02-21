'use client'

import { useState, useEffect } from 'react'
import { showSuccess, showError } from '@/lib/confirm'
import {
    Table, Button, Space, Modal, Form, Input, Select, Upload, Popconfirm, Tag
} from 'antd'
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    UploadOutlined, PaperClipOutlined, DownloadOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

// 附件信息
interface AttachmentInfo {
    id: string
    originalName: string
    fileName: string
    fileUrl: string
    fileSize: number
    mimeType: string
}

interface SystemDoc {
    id: string
    title: string
    category: string | null
    version: string | null
    content: string | null // JSON 存储附件信息
    status: number
    createdAt: string
    updatedAt: string
}

// 分类选项
const categoryOptions = [
    { value: '质量手册', label: '质量手册' },
    { value: '程序文件', label: '程序文件' },
    { value: '作业指导书', label: '作业指导书' },
    { value: '记录表格', label: '记录表格' },
    { value: '管理制度', label: '管理制度' },
    { value: '技术规范', label: '技术规范' },
    { value: '其他', label: '其他' },
]

export default function SystemDocumentPage() {
    const [data, setData] = useState<SystemDoc[]>([])
    const [loading, setLoading] = useState(false)
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [keyword, setKeyword] = useState('')
    const [modalOpen, setModalOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [uploadedFiles, setUploadedFiles] = useState<AttachmentInfo[]>([])
    const [uploading, setUploading] = useState(false)
    const [form] = Form.useForm()

    const fetchData = async (p = page, kw = keyword) => {
        setLoading(true)
        try {
            const res = await fetch(`/api/system-document?page=${p}&pageSize=10&keyword=${encodeURIComponent(kw)}`)
            const json = await res.json()
            if (json.success && json.data) {
                setData(json.data.list || [])
                setTotal(json.data.total || 0)
            }
        } catch {
            setData([])
        }
        setLoading(false)
    }

    useEffect(() => { fetchData() }, [page])

    // 上传附件
    const handleUploadFile = async (file: File) => {
        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            const res = await fetch('/api/upload/finance?module=document', { method: 'POST', body: formData })
            const json = await res.json()
            if (json.success && json.data) {
                setUploadedFiles(prev => [...prev, json.data])
                showSuccess('文件上传成功')
            } else {
                showError(json.error?.message || '文件上传失败')
            }
        } catch {
            showError('文件上传失败')
        }
        setUploading(false)
    }

    const handleAdd = () => {
        setEditingId(null)
        form.resetFields()
        setUploadedFiles([])
        setModalOpen(true)
    }

    const handleEdit = (record: SystemDoc) => {
        setEditingId(record.id)
        // 解析附件
        let files: AttachmentInfo[] = []
        if (record.content) {
            try { files = JSON.parse(record.content) } catch { files = [] }
        }
        setUploadedFiles(files)
        form.setFieldsValue({
            title: record.title,
            category: record.category,
            version: record.version,
        })
        setModalOpen(true)
    }

    const handleDelete = async (id: string) => {
        const res = await fetch(`/api/system-document/${id}`, { method: 'DELETE' })
        const json = await res.json()
        if (res.ok && json.success) {
            showSuccess('删除成功')
            fetchData()
        } else {
            showError('删除失败')
        }
    }

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields()
            setSubmitting(true)

            const payload = {
                ...values,
                content: uploadedFiles, // 附件列表
            }

            const url = editingId ? `/api/system-document/${editingId}` : '/api/system-document'
            const method = editingId ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const json = await res.json()
            if (res.ok && json.success) {
                showSuccess(editingId ? '更新成功' : '创建成功')
                setModalOpen(false)
                fetchData()
            } else {
                showError(json.error?.message || '操作失败')
            }
        } catch (err: any) {
            showError(err.message || '操作失败')
        } finally {
            setSubmitting(false)
        }
    }

    // 格式化文件大小
    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    // 解析附件
    const parseAttachments = (content: string | null): AttachmentInfo[] => {
        if (!content) return []
        try { return JSON.parse(content) } catch { return [] }
    }

    const columns: ColumnsType<SystemDoc> = [
        {
            title: '序号', width: 60, align: 'center',
            render: (_, __, idx) => (page - 1) * 10 + idx + 1,
        },
        { title: '文件名称', dataIndex: 'title', width: 250 },
        { title: '版本', dataIndex: 'version', width: 80, render: (v) => v || '-' },
        {
            title: '分类', dataIndex: 'category', width: 120,
            render: (v) => v ? <Tag color="blue">{v}</Tag> : '-',
        },
        {
            title: '附件', width: 200,
            render: (_, record) => {
                const files = parseAttachments(record.content)
                if (files.length === 0) return '-'
                return (
                    <Space direction="vertical" size={2}>
                        {files.map(f => (
                            <a key={f.id} href={f.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
                                <PaperClipOutlined /> {f.originalName}
                            </a>
                        ))}
                    </Space>
                )
            }
        },
        {
            title: '文件大小', width: 100,
            render: (_, record) => {
                const files = parseAttachments(record.content)
                if (files.length === 0) return '-'
                const totalSize = files.reduce((sum, f) => sum + (f.fileSize || 0), 0)
                return formatSize(totalSize)
            }
        },
        {
            title: '上传时间', dataIndex: 'createdAt', width: 160,
            render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm'),
        },
        {
            title: '操作', fixed: 'right', width: 150,
            render: (_, record) => (
                <Space>
                    <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
                    <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消" okButtonProps={{ danger: true }}>
                        <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
                    </Popconfirm>
                </Space>
            )
        },
    ]

    return (
        <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>体系文件管理</h2>
                <Space>
                    <Input.Search
                        placeholder="搜索文件名称"
                        allowClear
                        style={{ width: 200 }}
                        onSearch={(v) => { setKeyword(v); setPage(1); fetchData(1, v) }}
                    />
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>上传文件</Button>
                </Space>
            </div>

            <Table
                rowKey="id"
                columns={columns}
                dataSource={data}
                loading={loading}
                scroll={{ x: 1100 }}
                pagination={{ current: page, total, pageSize: 10, onChange: (p) => setPage(p) }}
            />

            <Modal
                title={editingId ? '编辑体系文件' : '上传体系文件'}
                open={modalOpen}
                onOk={handleSubmit}
                onCancel={() => setModalOpen(false)}
                confirmLoading={submitting}
                width={520}
            >
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="title" label="文件名称" rules={[{ required: true, message: '请输入文件名称' }]}>
                        <Input placeholder="请输入文件名称" />
                    </Form.Item>
                    <Form.Item name="version" label="版本号">
                        <Input placeholder="如 V1.0" />
                    </Form.Item>
                    <Form.Item name="category" label="分类">
                        <Select options={categoryOptions} placeholder="请选择分类" allowClear />
                    </Form.Item>
                    <Form.Item label="附件">
                        <Upload
                            beforeUpload={(file) => { handleUploadFile(file); return false }}
                            showUploadList={false}
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.zip,.rar"
                        >
                            <Button icon={<UploadOutlined />} loading={uploading}>选择文件</Button>
                        </Upload>
                        {uploadedFiles.length > 0 && (
                            <div style={{ marginTop: 8 }}>
                                {uploadedFiles.map(f => (
                                    <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                                        <PaperClipOutlined />
                                        <a href={f.fileUrl} target="_blank" rel="noreferrer" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {f.originalName}
                                        </a>
                                        <span style={{ color: '#999', fontSize: 12 }}>{formatSize(f.fileSize)}</span>
                                        <Button
                                            type="text" size="small" danger icon={<DeleteOutlined />}
                                            onClick={() => setUploadedFiles(prev => prev.filter(v => v.id !== f.id))}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    )
}
