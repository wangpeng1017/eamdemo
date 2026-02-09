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
        const clientReportDeadline = searchParams.get('clientReportDeadline')
        const followerId = searchParams.get('followerId')

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
                clientReportDeadline: clientReportDeadline ? dayjs(clientReportDeadline) : undefined,
                followerId: followerId || undefined,
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
            // 1. 提交委托单主体（含样品）
            const submitData = {
                ...values,
                sampleDate: values.sampleDate?.toISOString() || null,
                clientReportDeadline: values.clientReportDeadline?.toISOString() || null,
                projects: [],
            }

            // 清理前端临时字段
            delete submitData.componentTests
            delete submitData.materialTests

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
            const entrustmentId = json.data?.id || json.id

            // 2. 保存零部件级测试要求
            const componentTests = values.componentTests || []
            const materialTests = values.materialTests || []
            const allTestItems = [
                ...componentTests.map((t: any) => ({
                    sampleName: t.sampleName || '',
                    testItemName: t.testItemName,
                    testStandard: t.testStandard || '',
                    judgmentStandard: t.judgmentStandard || '',
                    testCategory: 'component',
                    testMethod: t.testMethod || '',
                    samplingLocation: t.samplingLocation || '',
                    specimenCount: t.specimenCount || '',
                    testRemark: t.testRemark || '',
                    quantity: 1,
                })),
                ...materialTests.map((t: any) => ({
                    sampleName: t.materialName || '',
                    testItemName: t.testItemName,
                    testStandard: t.testStandard || '',
                    judgmentStandard: t.judgmentStandard || '',
                    testCategory: 'material',
                    testMethod: t.testMethod || '',
                    specimenCount: t.specimenCount || '',
                    testRemark: t.testRemark || '',
                    materialName: t.materialName || '',
                    materialCode: t.materialCode || '',
                    materialSupplier: t.materialSupplier || '',
                    materialSpec: t.materialSpec || '',
                    materialSampleStatus: t.materialSampleStatus || '',
                    quantity: 1,
                })),
            ]

            if (allTestItems.length > 0) {
                await fetch('/api/sample-test-item', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        bizType: 'entrustment',
                        bizId: entrustmentId,
                        items: allTestItems,
                    })
                })
            }

            // 3. 如果没有手动添加测试项且来自合同/报价单，尝试复制
            if (allTestItems.length === 0 && (values.contractId || values.quotationId)) {
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
