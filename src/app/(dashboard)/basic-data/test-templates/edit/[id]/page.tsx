'use client'

import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Button, Spin } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import TemplateEditor from '@/components/TemplateEditor'
import { showSuccess, showError } from '@/lib/confirm'
import type { TemplateSchema } from '@/lib/template-converter'

export default function EditTemplatePage() {
    const router = useRouter()
    const params = useParams()
    const id = params.id as string

    const [loading, setLoading] = useState(true)
    const [initialSchema, setInitialSchema] = useState<TemplateSchema | undefined>()
    const [templateName, setTemplateName] = useState('')

    // 加载模板数据
    useEffect(() => {
        const fetchTemplate = async () => {
            try {
                const res = await fetch(`/api/test-template/${id}`)
                const json = await res.json()
                const template = json.success ? json.data : json

                setTemplateName(template.name || '')

                if (template.schema) {
                    const schema = typeof template.schema === 'string'
                        ? JSON.parse(template.schema)
                        : template.schema
                    setInitialSchema(schema)
                }
            } catch (e) {
                showError('加载模板失败')
            } finally {
                setLoading(false)
            }
        }
        fetchTemplate()
    }, [id])

    const handleSave = async (schema: TemplateSchema) => {
        try {
            const data = {
                name: schema.title,
                method: schema.header?.methodBasis || '',
                schema: JSON.stringify(schema),
            }

            const res = await fetch(`/api/test-template/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })

            if (!res.ok) {
                const json = await res.json()
                throw new Error(json.message || '保存失败')
            }

            showSuccess('更新成功')
            router.push('/basic-data/test-templates')
        } catch (e: any) {
            showError(e.message || '保存失败')
            throw e
        }
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                <Spin size="large" tip="加载模板中..." />
            </div>
        )
    }

    return (
        <div style={{ padding: '0 24px 24px', minHeight: '100vh', background: '#f0f2f5' }}>
            <div style={{ marginBottom: 16, paddingTop: 16 }}>
                <Button
                    type="link"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => router.back()}
                    style={{ paddingLeft: 0, fontSize: 16, color: '#000' }}
                >
                    返回列表
                </Button>
                <span style={{ fontSize: 20, fontWeight: 500, marginLeft: 8 }}>
                    编辑检测项目：{templateName}
                </span>
            </div>

            <TemplateEditor
                initialValue={initialSchema}
                onSave={handleSave}
                onCancel={() => router.back()}
            />
        </div>
    )
}
