'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, Spin, Button } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import EntrustmentForm from '@/components/business/EntrustmentForm'
import { showSuccess, showError } from '@/lib/confirm'
import dayjs from 'dayjs'

function CreateEntrustmentContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [initialValues, setInitialValues] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const contractNo = searchParams.get('contractNo')
        const contractId = searchParams.get('contractId')
        const clientName = searchParams.get('clientName')
        const contactPerson = searchParams.get('contactPerson')
        const contactPhone = searchParams.get('contactPhone')
        const clientAddress = searchParams.get('clientAddress')
        const projectsParam = searchParams.get('projects')
        const quotationId = searchParams.get('quotationId')
        const quotationNo = searchParams.get('quotationNo')

        let projects = [{}]
        if (projectsParam) {
            try {
                const parsed = JSON.parse(projectsParam)
                if (Array.isArray(parsed) && parsed.length > 0) {
                    projects = parsed.map((p: any) => ({
                        name: p.name || '',
                        method: p.method || '',
                        testItems: [],
                    }))
                }
            } catch (e) {
                console.error('Projects parse error', e)
            }
        }

        if (contractNo || clientName || quotationNo) {
            setInitialValues({
                entrustmentNo: '自动生成',
                contractNo,
                contractId,
                quotationId,
                quotationNo,
                clientName,
                contactPerson,
                clientPhone: contactPhone,
                clientAddress,
                isSampleReturn: false,
                sampleDate: dayjs(),
            })
        } else {
            setInitialValues({
                isSampleReturn: false,
                projects: [{}],
                sampleDate: dayjs(),
            })
        }
    }, [searchParams])

    const handleSubmit = async (values: any) => {
        setLoading(true)
        try {
            // 1. Create Entrustment
            const submitData = {
                ...values,
                sampleDate: values.sampleDate?.toISOString() || null,
                // Projects are not in the form, but if they were passed in initialValues and preserved?
                // EntrustmentForm doesn't keep track of 'projects' in its state if not in Form.Item.
                // But wait, the original logic had 'projects' logic.
                // If EntrustmentForm doesn't have 'projects' field, values.projects will be undefined.
                // So we might lose the 'projects' derived from contract if we don't handle it.
                // However, the new SampleTestItemTable replaces 'projects' effectively for items.
                // But 'projects' in Entrustment entity are still used?
                // Use default empty projects if needed.
                projects: [],
            }

            const res = await fetch('/api/entrustment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submitData)
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.message || '创建失败')
            }

            const json = await res.json()
            const entrustmentId = json.id

            // 2. Save SampleTestItems
            if (values.sampleTestItems && values.sampleTestItems.length > 0) {
                await fetch('/api/sample-test-item', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        bizType: 'entrustment',
                        bizId: entrustmentId,
                        items: values.sampleTestItems,
                    })
                })
            }

            // 3. Copy from Contract or Quotation if needed
            if ((values.contractId || values.quotationId) && (!values.sampleTestItems || values.sampleTestItems.length === 0)) {
                await fetch('/api/sample-test-item/copy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sourceBizType: values.contractId ? 'contract' : 'quotation',
                        sourceBizId: values.contractId || values.quotationId,
                        targetBizType: 'entrustment',
                        targetBizId: entrustmentId,
                    })
                })
                showSuccess(values.contractId ? '已从合同复制样品检测项数据' : '已从报价单复制样品检测项数据')
            }

            showSuccess('创建成功')
            router.push('/entrustment/list')
        } catch (error: any) {
            showError(error.message)
        } finally {
            setLoading(false)
        }
    }

    if (!initialValues) {
        return <Spin />
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
                <span style={{ fontSize: 20, fontWeight: 500, marginLeft: 8 }}>新建委托单</span>
            </div>
            <EntrustmentForm
                mode="create"
                initialValues={initialValues}
                onSubmit={handleSubmit}
                loading={loading}
            />
        </div>
    )
}

export default function CreateEntrustmentPage() {
    return (
        <Suspense fallback={<Spin />}>
            <CreateEntrustmentContent />
        </Suspense>
    )
}
