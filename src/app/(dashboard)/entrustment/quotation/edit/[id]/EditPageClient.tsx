'use client'

import { useRouter } from 'next/navigation'
import { Button, Spin, Result } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import QuotationForm from '@/components/business/QuotationForm'
import { showSuccess, showError } from '@/lib/confirm'
import { useState, useEffect } from 'react'

export default function EditQuotationPage({ id }: { id: string }) {
    const router = useRouter()

    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(true)
    const [initialValues, setInitialValues] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (id) {
            fetchDetail(id)
        }
    }, [id])

    const fetchDetail = async (quotationId: string) => {
        setFetching(true)
        try {
            // 获取基本信息
            const res = await fetch(`/api/quotation/${quotationId}`)
            const json = await res.json()

            if (!res.ok || !json.success) {
                throw new Error(json.error?.message || '获取详情失败')
            }

            const data = json.data

            // 获取样品检测项
            let sampleTestItems = []
            try {
                const itemRes = await fetch(`/api/sample-test-item?bizType=quotation&bizId=${quotationId}`)
                const itemJson = await itemRes.json()
                if (itemJson.success && itemJson.data) {
                    sampleTestItems = itemJson.data.map((item: any) => ({
                        ...item,
                        key: item.id,
                        // 字段映射等处理，如果在 Form 里处理了这里可以简化
                    }))
                }
            } catch (e) {
                console.error('获取样品检测项失败', e)
            }

            setInitialValues({
                ...data,
                sampleTestItems,
                clientId: data.clientId || data.client?.id,
            })
        } catch (err: any) {
            console.error('加载报价单失败', err)
            setError(err.message)
        } finally {
            setFetching(false)
        }
    }

    const handleFinish = async (values: any) => {
        setLoading(true)
        try {
            const res = await fetch(`/api/quotation/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values)
            })
            const json = await res.json()

            if (res.ok && json.success) {
                showSuccess('更新报价单成功')

                // 保存样品检测项
                if (values.sampleTestItems) {
                    try {
                        await fetch('/api/sample-test-item', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                bizType: 'quotation',
                                bizId: id,
                                items: values.sampleTestItems,
                            })
                        })
                    } catch (e) {
                        console.error('Failed to save items', e)
                    }
                }

                router.push('/entrustment/quotation')
            } else {
                showError(json.error?.message || '更新失败')
            }
        } catch (error) {
            console.error('更新报价单异常', error)
            showError('更新失败')
        } finally {
            setLoading(false)
        }
    }

    const handleCancel = () => {
        router.back()
    }

    if (fetching) {
        return <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}><Spin size="large" /></div>
    }

    if (error) {
        return <Result status="error" title="加载失败" subTitle={error} extra={<Button onClick={() => router.back()}>返回列表</Button>} />
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
                <span style={{ fontSize: 20, fontWeight: 500, marginLeft: 8 }}>编辑报价单</span>
            </div>

            <QuotationForm
                initialValues={initialValues}
                onFinish={handleFinish}
                onCancel={handleCancel}
                loading={loading}
                bizId={id}
            />
        </div>
    )
}
