'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Spin } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import ContractForm from '@/components/business/ContractForm'
import { showSuccess, showError } from '@/lib/confirm'
import dayjs from 'dayjs'

function CreateContractContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const quotationId = searchParams.get('quotationId')

    const [loading, setLoading] = useState(false)
    const [initialValues, setInitialValues] = useState<any>(undefined)
    const [fetching, setFetching] = useState(false)

    useEffect(() => {
        // 如果有报价单ID，加载报价单数据预填表单
        if (quotationId) {
            fetchQuotation(quotationId)
        }
    }, [quotationId])

    // 从报价单加载数据并预填合同表单
    const fetchQuotation = async (id: string) => {
        setFetching(true)
        try {
            const res = await fetch(`/api/quotation/${id}`)
            const json = await res.json()
            if (res.ok && json.success && json.data) {
                const q = json.data
                const values: any = {
                    quotationId: q.id,
                    clientId: q.clientId || q.client?.id,
                    clientName: q.client?.name || '',
                    clientContact: q.clientContactPerson || '',
                    clientPhone: q.clientPhone || '',
                    clientAddress: q.clientAddress || '',
                    signDate: dayjs(),
                    prepaymentRatio: 30,
                }

                // 将报价明细映射为合同明细
                if (q.items && q.items.length > 0) {
                    values.items = q.items.map((item: any) => ({
                        serviceItem: item.serviceItem || '',
                        methodStandard: item.methodStandard || '',
                        quantity: Number(item.quantity) || 1,
                        unitPrice: Number(item.unitPrice) || 0,
                        totalPrice: Number(item.totalPrice) || 0,
                    }))
                    // 自动计算合同金额
                    values.amount = values.items.reduce((sum: number, i: any) => sum + (i.totalPrice || 0), 0)
                    values.prepaymentAmount = values.amount * 0.3
                }

                // 加载报价单关联的样品检测项
                try {
                    const itemRes = await fetch(`/api/sample-test-item?bizType=quotation&bizId=${id}`)
                    const itemJson = await itemRes.json()
                    if (itemJson.success && itemJson.data) {
                        values.sampleTestItems = itemJson.data
                    }
                } catch (e) {
                    console.error('获取样品检测项失败', e)
                }

                setInitialValues(values)
            }
        } catch (error) {
            showError('加载报价单信息失败')
        } finally {
            setFetching(false)
        }
    }

    const handleSubmit = async (values: any) => {
        setLoading(true)
        try {
            // 1. 创建合同基本信息
            const res = await fetch('/api/contract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            })
            const json = await res.json()

            if (res.ok && (json.success || json.id)) {
                const contractId = json.id

                // 2. 保存样品检测项数据
                if (values.sampleTestItems && values.sampleTestItems.length > 0) {
                    try {
                        const itemsRes = await fetch('/api/sample-test-item', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                bizType: 'contract',
                                bizId: contractId,
                                items: values.sampleTestItems,
                            })
                        })
                        if (!itemsRes.ok) {
                            console.error('保存样品检测项失败')
                        }
                    } catch (error) {
                        console.error('保存样品检测项异常:', error)
                    }
                } else if (quotationId) {
                    // 3. 如果没有手动修改样品检测项，从报价单复制
                    try {
                        await fetch('/api/sample-test-item/copy', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                sourceBizType: 'quotation',
                                sourceBizId: quotationId,
                                targetBizType: 'contract',
                                targetBizId: contractId,
                            })
                        })
                    } catch (error) {
                        console.error('复制样品检测项失败:', error)
                    }
                }

                showSuccess('合同创建成功')
                router.push('/entrustment/contract')
            } else {
                showError(json.error?.message || '创建合同失败')
            }
        } catch (error) {
            console.error('提交失败:', error)
            showError('提交失败，请重试')
        } finally {
            setLoading(false)
        }
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
                <span style={{ fontSize: 20, fontWeight: 500, marginLeft: 8 }}>新增合同</span>
            </div>
            <ContractForm
                mode="create"
                initialValues={initialValues}
                onSubmit={handleSubmit}
                loading={loading}
            />
        </div>
    )
}

export default function CreateContractPage() {
    return (
        <Suspense fallback={<div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" /></div>}>
            <CreateContractContent />
        </Suspense>
    )
}
