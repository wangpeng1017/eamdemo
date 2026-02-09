'use client'

import { useState, useEffect } from 'react'
import { showSuccess, showError, showConfirm } from '@/lib/confirm'
import { Table, Button, Space, Tag, Card, Drawer, Descriptions, Image, Popconfirm } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useRouter } from 'next/navigation'

interface Template {
    id: string
    name: string
    code: string
    category: string
    fileUrl: string
    uploader: string
    status: string
    remark: string | null
    coverTitle: string | null
    coverSubtitle: string | null
    coverLogo: string | null
    coverShowDate: boolean
    backCoverStatement: string | null
    backCoverCustomText: string | null
    stampImageUrl: string | null
    stampPosition: string | null
    createdAt: string
}

const categoryMap: Record<string, string> = {
    client_report: '客户报告',
    summary: '汇总报告',
    other: '其他',
}

const statusMap: Record<string, { text: string; color: string }> = {
    active: { text: '启用', color: 'success' },
    inactive: { text: '停用', color: 'default' }
}

const stampPosMap: Record<string, string> = {
    'bottom-right': '右下角',
    'bottom-center': '底部居中',
    'bottom-left': '左下角',
}

export default function ClientTemplatePage() {
    const router = useRouter()
    const [data, setData] = useState<Template[]>([])
    const [loading, setLoading] = useState(false)

    // 查看抽屉
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [current, setCurrent] = useState<Template | null>(null)

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

    const handleView = (record: Template) => {
        setCurrent(record)
        setDrawerOpen(true)
    }

    const handleEdit = (record: Template) => {
        router.push(`/report/client-template/${record.id}`)
    }

    const handleDelete = async (id: string) => {
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

    const columns: ColumnsType<Template> = [
        { title: '模板编码', dataIndex: 'code', width: 120 },
        { title: '模板名称', dataIndex: 'name', width: 200 },
        {
            title: '分类', dataIndex: 'category', width: 100,
            render: (v: string) => categoryMap[v] || v
        },
        {
            title: '状态', dataIndex: 'status', width: 80,
            render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.text}</Tag>
        },
        { title: '上传者', dataIndex: 'uploader', width: 100 },
        {
            title: '创建日期', dataIndex: 'createdAt', width: 120,
            render: (d: string) => dayjs(d).format('YYYY-MM-DD')
        },
        { title: '备注', dataIndex: 'remark', ellipsis: true },
        {
            title: '操作',
            fixed: 'right',
            width: 150,
            onHeaderCell: () => ({ style: { whiteSpace: 'nowrap' as const } }),
            render: (_, record) => (
                <Space size="small" style={{ whiteSpace: 'nowrap' }}>
                    <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record)} />
                    <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    <Popconfirm title="确认删除该模板?" onConfirm={() => handleDelete(record.id)}>
                        <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ]

    return (
        <div className="p-6">
            <Card
                title="客户报告模板管理"
                extra={
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/report/client-template/new')}>
                        新增模板
                    </Button>
                }
            >
                <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={data}
                    loading={loading}
                    scroll={{ x: 900 }}
                    pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
                />
            </Card>

            {/* 查看详情抽屉 */}
            <Drawer
                title="模板详情"
                placement="right"
                width={700}
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
            >
                {current && (
                    <div>
                        <Descriptions column={2} bordered size="small">
                            <Descriptions.Item label="模板编码">{current.code}</Descriptions.Item>
                            <Descriptions.Item label="模板名称">{current.name}</Descriptions.Item>
                            <Descriptions.Item label="分类">{categoryMap[current.category] || current.category}</Descriptions.Item>
                            <Descriptions.Item label="状态">
                                <Tag color={statusMap[current.status]?.color}>{statusMap[current.status]?.text}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="上传者">{current.uploader}</Descriptions.Item>
                            <Descriptions.Item label="创建日期">{dayjs(current.createdAt).format('YYYY-MM-DD')}</Descriptions.Item>
                            <Descriptions.Item label="模板文件" span={2}>
                                {current.fileUrl ? <a href={current.fileUrl} target="_blank" rel="noopener">{current.fileUrl}</a> : '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="备注" span={2}>{current.remark || '-'}</Descriptions.Item>
                        </Descriptions>

                        <h4 style={{ margin: '20px 0 12px' }}>封面配置</h4>
                        <Descriptions column={2} bordered size="small">
                            <Descriptions.Item label="报告标题">{current.coverTitle || '-'}</Descriptions.Item>
                            <Descriptions.Item label="报告副标题">{current.coverSubtitle || '-'}</Descriptions.Item>
                            <Descriptions.Item label="显示日期">{current.coverShowDate ? '是' : '否'}</Descriptions.Item>
                            <Descriptions.Item label="Logo">
                                {current.coverLogo ? <Image src={current.coverLogo} width={80} alt="Logo" /> : '-'}
                            </Descriptions.Item>
                        </Descriptions>

                        <h4 style={{ margin: '20px 0 12px' }}>封底配置</h4>
                        <Descriptions column={1} bordered size="small">
                            <Descriptions.Item label="声明语句">
                                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 13 }}>
                                    {current.backCoverStatement || '-'}
                                </pre>
                            </Descriptions.Item>
                            <Descriptions.Item label="自定义结语">{current.backCoverCustomText || '-'}</Descriptions.Item>
                        </Descriptions>

                        <h4 style={{ margin: '20px 0 12px' }}>印章配置</h4>
                        <Descriptions column={2} bordered size="small">
                            <Descriptions.Item label="印章位置">{stampPosMap[current.stampPosition || ''] || current.stampPosition || '-'}</Descriptions.Item>
                            <Descriptions.Item label="印章图片">
                                {current.stampImageUrl ? (
                                    <Image src={current.stampImageUrl} width={100} alt="印章" />
                                ) : '-'}
                            </Descriptions.Item>
                        </Descriptions>
                    </div>
                )}
            </Drawer>
        </div>
    )
}
