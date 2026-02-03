'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Spin, Result } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import ConsultationForm from '@/components/business/ConsultationForm'
import { showSuccess, showError } from '@/lib/confirm'
import { useState, useEffect, Suspense } from 'react'

function EditConsultationContent({ id }: { id: string }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const isReassess = searchParams.get('reassess') === '1'

    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(true)
    const [initialValues, setInitialValues] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (id) {
            fetchDetail(id)
        }
    }, [id])

    const fetchDetail = async (consultationId: string) => {
        setFetching(true)
        try {
            // 获取基本信息
            const res = await fetch(`/api/consultation/${consultationId}`)
            const json = await res.json()

            if (!res.ok || !json.success) {
                throw new Error(json.error?.message || '获取详情失败')
            }

            const data = json.data

            // 获取样品检测项
            let sampleTestItems = []
            try {
                const itemRes = await fetch(`/api/sample-test-item?bizType=consultation&bizId=${consultationId}`)
                const itemJson = await itemRes.json()
                if (itemJson.success && itemJson.data) {
                    sampleTestItems = itemJson.data.map((item: any) => ({
                        ...item,
                        key: item.id,
                        assessorId: item.assessorId || item.currentAssessorId,
                        assessorName: item.assessorName || item.currentAssessorName,
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
            console.error('加载咨询单失败', err)
            setError(err.message)
        } finally {
            setFetching(false)
        }
    }

    const handleFinish = async (values: any) => {
        setLoading(true)
        try {
            const url = isReassess
                ? `/api/consultation/${id}/reassess`
                : `/api/consultation/${id}`

            const res = await fetch(url, {
                method: isReassess ? 'POST' : 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values)
            })
            const json = await res.json()

            if (res.ok && json.success) {
                showSuccess(isReassess ? '发起重新评估成功' : '更新咨询单成功')
                router.push('/entrustment/consultation')
            } else {
                showError(json.error?.message || (isReassess ? '发起重新评估失败' : '更新失败'))
            }
        } catch (error) {
            console.error('操作咨询单异常', error)
            showError('提交失败')
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
                <span style={{ fontSize: 20, fontWeight: 500, marginLeft: 8 }}>
                    {isReassess ? '重新评估业务咨询' : '编辑业务咨询'}
                </span>
            </div>

            <ConsultationForm
                initialValues={initialValues}
                onFinish={handleFinish}
                onCancel={handleCancel}
                loading={loading}
                bizId={id}
            />
        </div>
    )
}

export default function EditConsultationPage({ id }: { id: string }) {
    return (
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}><Spin size="large" /></div>}>
            <EditConsultationContent id={id} />
        </Suspense>
    )
}
