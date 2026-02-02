'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { message } from 'antd'
import ContractForm from '@/components/business/ContractForm'
import { showSuccess, showError } from '@/lib/confirm'

export default function CreateContractPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

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

                // 2. 保存样品检测项数据的逻辑已在 Form 组件中通过 values 返回，或者后端处理
                // 如果 values 中包含了 sampleTestItems，需要单独保存
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
                            message.warning('合同创建成功，但样品检测项保存失败，请在编辑页重试')
                        }
                    } catch (error) {
                        console.error('保存样品检测项异常:', error)
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

    return (
        <div style={{ padding: 24 }}>
            <div style={{ marginBottom: 16 }}>
                <h2 style={{ margin: 0 }}>新增合同</h2>
            </div>
            <ContractForm mode="create" onSubmit={handleSubmit} loading={loading} />
        </div>
    )
}
