'use client'

import { useRouter } from 'next/navigation'
import { Button } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import ConsultationForm from '@/components/business/ConsultationForm'
import { showSuccess, showError } from '@/lib/confirm'
import { useState } from 'react'
import { Card } from 'antd'

export default function CreateConsultationPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const handleFinish = async (values: any) => {
        setLoading(true)
        try {
            const res = await fetch('/api/consultation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values)
            })
            const json = await res.json()

            if (res.ok && json.success) {
                showSuccess('咨询单创建成功')
                router.push('/entrustment/consultation')
            } else {
                showError(json.error?.message || '创建失败')
            }
        } catch (error) {
            console.error('创建咨询单异常', error)
            showError('创建失败')
        } finally {
            setLoading(false)
        }
    }

    const handleCancel = () => {
        router.back()
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
                <span style={{ fontSize: 20, fontWeight: 500, marginLeft: 8 }}>新增业务咨询</span>
            </div>

            <ConsultationForm
                onFinish={handleFinish}
                onCancel={handleCancel}
                loading={loading}
            />
        </div>
    )
}
