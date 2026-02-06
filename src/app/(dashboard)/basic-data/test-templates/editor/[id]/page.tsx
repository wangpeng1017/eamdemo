'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, Space, message, Spin, Result } from 'antd'
import { SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import dynamic from 'next/dynamic'

// ⚠️ 关键修复：禁用 SSR，避免 Fortune-sheet 在服务端执行 DOM 操作
const DataSheet = dynamic(() => import('@/components/DataSheet'), {
    ssr: false,
    loading: () => (
        <div className="flex h-full items-center justify-center">
            <Spin size="large" tip="正在加载表格编辑器..." />
        </div>
    )
})

import {
    TemplateSchema,
    convertSheetDataToSchema,
    convertSchemaToPreviewData
} from '@/lib/template-converter'
import { showSuccess, showError } from '@/lib/confirm'
import { convertDataToCelldata } from '@/components/DataSheet'

export default function TemplateEditorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [template, setTemplate] = useState<any>(null)
    const [sheetData, setSheetData] = useState<any[]>([])
    const [error, setError] = useState<string | null>(null)

    // 加载数据
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                const res = await fetch(`/api/test-template/${id}`)
                const json = await res.json()

                if (!res.ok || !json.success) {
                    throw new Error(json.error?.message || '加载模板失败')
                }

                const record = json.data
                setTemplate(record)

                // 解析 Schema 并转换为表格数据
                let schema: TemplateSchema
                if (typeof record.schema === 'string') {
                    schema = JSON.parse(record.schema)
                } else {
                    schema = record.schema
                }

                const initialSheetData = convertSchemaToPreviewData(schema)
                setSheetData(initialSheetData)
                setError(null)
            } catch (err: any) {
                console.error("[TemplateEditorPage] Fetch Error:", err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [id])

    // 保存处理
    const handleSave = async () => {
        try {
            setSaving(true)

            // 1. 将表格数据转换回 Schema
            const currentSchema = convertSheetDataToSchema(sheetData)

            // 2. 保持原有基础信息，仅更新 schema
            const updateData = {
                ...template,
                schema: JSON.stringify(currentSchema)
            }

            const res = await fetch(`/api/test-template/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            })

            const json = await res.json()
            if (!res.ok || !json.success) {
                throw new Error(json.error?.message || '保存失败')
            }

            showSuccess('保存成功')
            router.back()
        } catch (err: any) {
            showError(err.message || '保存失败')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Spin size="large" tip="正在加载模板内容..." />
            </div>
        )
    }

    if (error) {
        return (
            <Result
                status="error"
                title="加载失败"
                subTitle={error}
                extra={[
                    <Button key="back" onClick={() => router.back()}>返回列表</Button>
                ]}
            />
        )
    }

    return (
        <div className="p-4 flex flex-col h-[calc(100vh-100px)]">
            <div className="mb-4 flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
                <div>
                    <h2 className="m-0 text-xl font-bold">{template?.name || '编辑模板内容'}</h2>
                    <div className="text-gray-400 text-sm mt-1">
                        模板编号: {template?.code} | 分类: {template?.category}
                    </div>
                </div>
                <Space>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>取消</Button>
                    <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={saving}
                        onClick={handleSave}
                    >
                        保存并返回
                    </Button>
                </Space>
            </div>

            <Card className="flex-1 overflow-hidden" bodyStyle={{ height: '100%', padding: 0 }}>
                <div className="h-full">
                    {/* 完全受控模式：父组件管理状态和数据转换 */}
                    <DataSheet
                        data={sheetData}
                        onChange={(changedData) => {
                            // 🔑 关键：立即将 data 格式转换为 celldata 格式
                            const celldata = convertDataToCelldata(changedData)
                            setSheetData(celldata)
                        }}
                        height="100%"
                    />
                </div>
            </Card>

            <div className="mt-4 text-gray-400 text-xs text-center">
                提示：在此页面修改的是表格结构与内容，如需修改模板名称或分类，请在列表页点击编辑。
            </div>
        </div>
    )
}
