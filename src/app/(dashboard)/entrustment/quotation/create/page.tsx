'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Spin } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import QuotationForm from '@/components/business/QuotationForm'
import { showSuccess, showError } from '@/lib/confirm'
import { useState, useEffect, Suspense } from 'react'
import dayjs from 'dayjs'

function CreateQuotationContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const consultationId = searchParams.get('consultationId')

    const [loading, setLoading] = useState(false)
    const [initialValues, setInitialValues] = useState<any>(null)
    const [fetching, setFetching] = useState(false)

    useEffect(() => {
        // 如果有咨询单ID，加载咨询单数据
        if (consultationId) {
            fetchConsultation(consultationId)
        }
    }, [consultationId])

    const fetchConsultation = async (id: string) => {
        setFetching(true)
        try {
            const res = await fetch(`/api/consultation/${id}`)
            const json = await res.json()
            if (json.success && json.data) {
                const data = json.data
                // 基本信息
                const values: any = {
                    clientId: data.clientId || data.client?.id,
                    clientContactPerson: data.clientContactPerson,
                    clientPhone: data.clientPhone,
                    clientEmail: data.clientEmail,
                    clientAddress: data.clientAddress,
                    consultationId: data.id,
                    consultationNo: data.consultationNo,
                    quotationDate: dayjs(),
                    validDays: 30,
                    discountAmount: 0,
                    clientReportDeadline: data.clientReportDeadline ? dayjs(data.clientReportDeadline) : undefined,
                    followerId: data.followerId || undefined,
                    // 服务方安排人默认=跟单人
                    serviceContact: undefined,
                }

                // 从咨询检测项直接生成报价明细
                try {
                    const itemRes = await fetch(`/api/sample-test-item?bizType=consultation&bizId=${id}`)
                    const itemJson = await itemRes.json()
                    if (itemJson.success && itemJson.data) {
                        values.items = itemJson.data.map((item: any) => ({
                            sampleName: item.sampleName || '',
                            serviceItem: item.testItemName || '',
                            methodStandard: item.testStandard || '',
                            quantity: String(item.quantity || '1'),
                            unitPrice: 0,
                            totalPrice: 0,
                            remark: '',
                        }))
                    }
                } catch (e) {
                    console.error('Failed to fetch sample test items', e)
                }

                setInitialValues(values)
            }
        } catch (error) {
            showError('加载咨询单信息失败')
        } finally {
            setFetching(false)
        }
    }

    const handleFinish = async (values: any) => {
        setLoading(true)
        try {
            const res = await fetch('/api/quotation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values)
            })
            const json = await res.json()

            if (res.ok && (json.success || json.id)) {
                showSuccess('创建报价单成功')
                router.push('/entrustment/quotation')
            } else {
                showError(json.error?.message || '创建失败')
            }
        } catch (error) {
            console.error('创建异常', error)
            showError('创建失败')
        } finally {
            setLoading(false)
        }
    }

    const handleCancel = () => {
        router.back()
    }

    if (fetching) {
        return <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" /></div>
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
                <span style={{ fontSize: 20, fontWeight: 500, marginLeft: 8 }}>新增报价单</span>
            </div>

            <QuotationForm
                initialValues={initialValues}
                onFinish={handleFinish}
                onCancel={handleCancel}
                loading={loading}
            />
        </div>
    )
}

export default function CreateQuotationPage() {
    return (
        <Suspense fallback={<div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" /></div>}>
            <CreateQuotationContent />
        </Suspense>
    )
}
