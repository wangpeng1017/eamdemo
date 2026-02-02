'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { message, Spin } from 'antd'
import ContractForm from '@/components/business/ContractForm'
import { showSuccess, showError } from '@/lib/confirm'

interface EditContractPageClientProps {
    id: string
}

export default function EditContractPageClient({ id }: EditContractPageClientProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [initialValues, setInitialValues] = useState<any>(null)
    const [fetching, setFetching] = useState(true)

    useEffect(() => {
        const fetchContract = async () => {
            try {
                const res = await fetch(`/api/contract/${id}`)
                const json = await res.json()
                if (json.success && json.data) {
                    const contractData = json.data

                    // 加载关联的样品检测项
                    let sampleTestItems = []
                    try {
                        const itemsRes = await fetch(`/api/sample-test-item?bizType=contract&bizId=${id}`)
                        const itemsJson = await itemsRes.json()
                        if (itemsJson.success && itemsJson.data) {
                            sampleTestItems = itemsJson.data
                        }
                    } catch (e) {
                        console.error('Failed to load items', e)
                    }

                    setInitialValues({
                        ...contractData,
                        sampleTestItems
                    })
                } else {
                    showError('未找到合同信息')
                    router.push('/entrustment/contract')
                }
            } catch (error) {
                console.error('加载合同失败:', error)
                showError('加载合同失败')
            } finally {
                setFetching(false)
            }
        }
        if (id) {
            fetchContract()
        }
    }, [id, router])

    const handleSubmit = async (values: any) => {
        setLoading(true)
        try {
            const res = await fetch(`/api/contract/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            })
            const json = await res.json()

            if (res.ok && json.success) {
                // 保存样品检测项
                if (values.sampleTestItems) {
                    await fetch('/api/sample-test-item', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            bizType: 'contract',
                            bizId: id,
                            items: values.sampleTestItems,
                        })
                    })
                }

                showSuccess('更新成功')
                router.push('/entrustment/contract')
            } else {
                showError(json.error?.message || '更新失败')
            }
        } catch (error) {
            console.error('更新异常:', error)
            showError('更新失败，请重试')
        } finally {
            setLoading(false)
        }
    }

    if (fetching) return <div style={{ padding: 50, textAlign: 'center' }}><Spin size="large" /></div>

    return (
        <div style={{ padding: 24 }}>
            <div style={{ marginBottom: 16 }}>
                <h2 style={{ margin: 0 }}>编辑合同</h2>
            </div>
            <ContractForm
                mode="edit"
                initialValues={initialValues}
                onSubmit={handleSubmit}
                loading={loading}
            />
        </div>
    )
}
