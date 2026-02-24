'use client'

import { useGoBack } from '@/hooks/useGoBack'
import { useRouter } from 'next/navigation'
import { Button } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import TemplateEditor from '@/components/TemplateEditor'
import { showSuccess, showError } from '@/lib/confirm'
import type { TemplateSchema } from '@/lib/template-converter'

export default function CreateTemplatePage() {
    const router = useRouter()
  const goBack = useGoBack('/basic-data/test-templates')

    const handleSave = async (schema: TemplateSchema) => {
        try {
            const data = {
                name: schema.title,
                category: '其他',
                method: schema.header?.methodBasis || '',
                schema: JSON.stringify(schema),
                status: 'active',
            }

            const res = await fetch('/api/test-template', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })

            if (!res.ok) {
                const json = await res.json()
                throw new Error(json.message || '保存失败')
            }

            showSuccess('创建成功')
            router.push('/basic-data/test-templates')
        } catch (e: any) {
            showError(e.message || '保存失败')
            throw e
        }
    }

    return (
        <div style={{ padding: '0 24px 24px', minHeight: '100vh', background: '#f0f2f5' }}>
            <div style={{ marginBottom: 16, paddingTop: 16 }}>
                <Button
                    type="link"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => goBack()}
                    style={{ paddingLeft: 0, fontSize: 16, color: '#000' }}
                >
                    返回列表
                </Button>
                <span style={{ fontSize: 20, fontWeight: 500, marginLeft: 8 }}>新增检测项目</span>
            </div>

            <TemplateEditor
                onSave={handleSave}
                onCancel={() => goBack()}
            />
        </div>
    )
}
