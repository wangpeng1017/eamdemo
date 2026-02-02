'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button, message, Spin } from 'antd'
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
                // 构造初始值
                // 1. 基本信息
                const values: any = {
                    clientId: data.clientId || data.client?.id,
                    clientContactPerson: data.clientContactPerson,
                    consultationId: data.id,
                    consultationNo: data.consultationNo,
                    quotationDate: dayjs(),
                    validDays: 30,
                    taxRate: 0.06,
                    discountAmount: 0,
                    // ✅ 自动带入业务咨询的报告时间到客户要求报告时间
                    clientRequiredReportDate: data.clientReportDeadline ? dayjs(data.clientReportDeadline) : undefined,
                }

                // 2. 也是最重要的，样品检测项
                // QuotationForm 会自动处理 sampleTestItems 的同步
                // 但我们需要先请求到样品检测项数据传递给 Form
                try {
                    const itemRes = await fetch(`/api/sample-test-item?bizType=consultation&bizId=${id}`)
                    const itemJson = await itemRes.json()
                    if (itemJson.success && itemJson.data) {
                        values.sampleTestItems = itemJson.data.map((item: any) => ({
                            // 复制过来就是新记录了，去掉ID，但保留原始信息供参考
                            ...item,
                            id: undefined, // 关键：这是新单据的检测项，不能带ID
                            bizType: 'quotation', // 准备变为 quotation 类型
                            bizId: undefined
                        }))

                        // 自动从样品检测项生成报价明细
                        values.items = values.sampleTestItems.map((item: any) => ({
                            sampleName: item.sampleName || '',
                            serviceItem: item.testItemName || '',
                            methodStandard: item.testStandard || '',
                            quantity: item.quantity || 1,
                            unitPrice: 0,
                            totalPrice: 0,
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
                const quotationId = json.id || json.data?.id
                showSuccess('创建报价单成功')

                // 保存样品检测项
                if (quotationId && values.sampleTestItems && values.sampleTestItems.length > 0) {
                    try {
                        await fetch('/api/sample-test-item', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                bizType: 'quotation',
                                bizId: quotationId,
                                items: values.sampleTestItems,
                            })
                        })
                    } catch (e) {
                        console.error('Failed to save items', e)
                        message.warning('报价单创建成功，但样品检测项保存可能不完整')
                    }
                }

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
