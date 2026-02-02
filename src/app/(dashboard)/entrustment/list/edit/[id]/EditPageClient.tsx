'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Spin, Button } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import EntrustmentForm from '@/components/business/EntrustmentForm'
import { showSuccess, showError } from '@/lib/confirm'
import dayjs from 'dayjs'

interface EditPageClientProps {
    id: string
}

export default function EditEntrustmentPageClient({ id }: EditPageClientProps) {
    const router = useRouter()
    const [initialValues, setInitialValues] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        fetchData()
    }, [id])

    const fetchData = async () => {
        try {
            // 1. Fetch Entrustment Info
            const res = await fetch(`/api/entrustment/${id}`)
            const json = await res.json()
            if (!json.success && !json.id) {
                throw new Error('Load entrustment failed')
            }
            const data = json.data || json

            // 2. Fetch Sample Test Items
            const itemsRes = await fetch(`/api/sample-test-item?bizType=entrustment&bizId=${id}`)
            const itemsJson = await itemsRes.json()
            const sampleTestItems = (itemsJson.success && itemsJson.data) ? itemsJson.data.map((item: any) => ({
                ...item,
                key: item.id || `temp_${Date.now()}_${Math.random()}`,
            })) : []

            setInitialValues({
                ...data,
                sampleDate: data.sampleDate ? dayjs(data.sampleDate) : undefined,
                sampleTestItems,
            })
        } catch (error) {
            console.error(error)
            showError('加载数据失败')
        }
    }

    const handleSubmit = async (values: any) => {
        setLoading(true)
        try {
            // 1. Update Entrustment
            const submitData = {
                ...values,
                sampleDate: values.sampleDate?.toISOString() || null,
            }
            // Remove projects from submitData to avoid clearing them if we don't manage them
            delete submitData.projects

            const res = await fetch(`/api/entrustment/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submitData)
            })

            if (!res.ok) {
                throw new Error('Update failed')
            }

            // 2. Save SampleTestItems
            if (values.sampleTestItems) {
                await fetch('/api/sample-test-item', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        bizType: 'entrustment',
                        bizId: id,
                        items: values.sampleTestItems,
                    })
                })
            }

            showSuccess('更新成功')
            router.push('/entrustment/list')
        } catch (error: any) {
            showError(error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleCancel = () => {
        router.back()
    }

    if (!initialValues) {
        return (
            <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <Spin size="large" />
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
                <span style={{ fontSize: 20, fontWeight: 500, marginLeft: 8 }}>编辑检测委托单</span>
            </div>

            <EntrustmentForm
                mode="edit"
                initialValues={initialValues}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                loading={loading}
            />
        </div>
    )
}
