'use client'

import { useState, useEffect, use, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, Space, message, Spin, Result } from 'antd'
import { SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import EditableTable, { convertFromSchema, convertToSchema } from '@/components/EditableTable'
import {
    TemplateSchema,
    convertSheetDataToSchema,
    convertSchemaToPreviewData
} from '@/lib/template-converter'
import { showSuccess, showError } from '@/lib/confirm'
import { extractSheetData } from '@/components/DataSheet'

export default function TemplateEditorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [template, setTemplate] = useState<any>(null)
    const [tableData, setTableData] = useState<any[][]>([])
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

                // 解析 Schema
                let schema: TemplateSchema
                if (typeof record.schema === 'string') {
                    schema = JSON.parse(record.schema)
                } else {
                    schema = record.schema
                }

                // 转换为二维数组
                const sheetData = convertSchemaToPreviewData(schema)
                const twoDData = extractSheetData(sheetData)
                setTableData(twoDData.length > 0 ? twoDData : [['检测项目', '检测方法', '技术要求', '实测值', '单项判定', '备注']])
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

            // 1. 将二维数组转换为 Schema
            const currentSchema = convertToSchema(tableData)

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
                    <EditableTable
                        dataSource={tableData}
                        columnsCount={6}
                        rowCount={30}
                        onChange={setTableData}
                    />
                </div>
            </Card>

            <div className="mt-4 text-gray-400 text-xs text-center">
                提示：在此页面修改的是表格结构与内容，如需修改模板名称或分类，请在列表页点击编辑。
            </div>
        </div>
    )
}
