'use client'

import { useState, useEffect } from 'react'
import { showSuccess, showError, showConfirm } from '@/lib/confirm'
import { Table, Button, Space, Tag, Modal, Form, Input, Select, Card } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface Template {
    id: string
    name: string
    code: string
    category: string
    fileUrl: string
    uploader: string
    status: string
    remark: string | null
    createdAt: string
}

const categoryOptions = [
    { value: 'client_report', label: '客户报告' },
    { value: 'summary', label: '汇总报告' },
    { value: 'other', label: '其他' }
]

const statusMap: Record<string, { text: string; color: string }> = {
    active: { text: '启用', color: 'success' },
    inactive: { text: '停用', color: 'default' }
}

export default function ClientTemplateePage() {
    const [data, setData] = useState<Template[]>([])
    const [loading, setLoading] = useState(false)
    const [modalOpen, setModalOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [form] = Form.useForm()

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/report-template?category=client_report')
            const json = await res.json()
            if (json.success) {
                setData(json.data?.list || [])
            }
        } catch (error) {
            showError('获取模板列表失败')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleAdd = () => {
        setEditingId(null)
        form.resetFields()
        form.setFieldValue('category', 'client_report')
        setModalOpen(true)
    }

    const handleEdit = (record: Template) => {
        setEditingId(record.id)
        form.setFieldsValue(record)
        setModalOpen(true)
    }

    const handleDelete = async (id: string) => {
        showConfirm(
            '确认删除',
            '确定要删除这个模板吗？',
            async () => {
                try {
                    const res = await fetch(`/api/report-template/${id}`, { method: 'DELETE' })
                    if (res.ok) {
                        showSuccess('删除成功')
                        fetchData()
                    } else {
                        showError('删除失败')
                    }
                } catch (error) {
                    showError('删除失败')
                }
            }
        )
    }

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields()
            const url = editingId ? `/api/report-template/${editingId}` : '/api/report-template'
            const method = editingId ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values)
            })

            const json = await res.json()
            if (res.ok && json.success) {
                showSuccess(editingId ? '更新成功' : '创建成功')
                setModalOpen(false)
                fetchData()
            } else {
                showError(json.error || '操作失败')
            }
        } catch (error) {
            showError('操作失败')
        }
    }

    const columns: ColumnsType<Template> = [
        { title: '模板编码', dataIndex: 'code', width: 120 },
        { title: '模板名称', dataIndex: 'name', width: 200 },
        {
            title: '状态',
            dataIndex: 'status',
            width: 80,
            render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag>
        },
        { title: '上传者', dataIndex: 'uploader', width: 100 },
        {
            title: '创建日期',
            dataIndex: 'createdAt',
            width: 120,
            render: (d: string) => dayjs(d).format('YYYY-MM-DD')
        },
        { title: '备注', dataIndex: 'remark', ellipsis: true },
        {
            title: '操作', fixed: 'right',
            
            render: (_, record) => (
                <Space size="small" style={{ whiteSpace: 'nowrap' }}>
                    <Button size="small" type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}/>
                    <Button size="small" type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}/>
                </Space>
            )
        }
    ]

    return (
        <div className="p-6">
            <Card
                title="客户报告模板管理"
                extra={
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                        新增模板
                    </Button>
                }
            >
                <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={data}
                    loading={loading}
                    pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
                />
            </Card>

            <Modal
                title={editingId ? '编辑模板' : '新增模板'}
                open={modalOpen}
                onOk={handleSubmit}
                onCancel={() => setModalOpen(false)}
                width={600}
                okText="保存"
                cancelText="取消"
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="code" label="模板编码" rules={[{ required: true, message: '请输入模板编码' }]}>
                        <Input placeholder="如：CTPL-001" disabled={!!editingId} />
                    </Form.Item>
                    <Form.Item name="name" label="模板名称" rules={[{ required: true, message: '请输入模板名称' }]}>
                        <Input placeholder="如：客户检测报告模板-标准版" />
                    </Form.Item>
                    <Form.Item name="category" label="分类" rules={[{ required: true }]} initialValue="client_report">
                        <Select options={categoryOptions} placeholder="选择分类" />
                    </Form.Item>
                    <Form.Item name="fileUrl" label="模板文件">
                        <Input placeholder="输入文件 URL 或上传后的路径" />
                    </Form.Item>
                    {editingId && (
                        <Form.Item name="status" label="状态">
                            <Select
                                options={[
                                    { value: 'active', label: '启用' },
                                    { value: 'inactive', label: '停用' }
                                ]}
                            />
                        </Form.Item>
                    )}
                    <Form.Item name="remark" label="备注">
                        <Input.TextArea rows={3} placeholder="可选，填写备注信息" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    )
}
