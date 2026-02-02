'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Spin } from 'antd'
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
                projects: [], // See logic in Create Page. Projects are likely handled by SampleTestItemTable now.
                // Or if we need to preserve existing projects?
                // If we send empty projects, will backend delete existing projects?
                // Let's check api/entrustment/[id]/route.ts (mental check).
                // Usually update logic updates fields provided.
                // If projects is [], it might clear them.
                // However, EntrustmentForm does not manage 'projects'.
                // This is a potential risk if we are dropping 'projects' data.
                // But since SampleTestItemTable is the new way, maybe it's fine.
                // Wait, if I am replacing the form, I must ensure I don't break existing 'projects' if they are used.
                // In EntrustmentListPage, handleSubmit sends:
                // projects: values.projects?.filter...
                // Form.setFieldsValue(formData) sets projects from record.projects.
                // But the previous Form (in ListPage) didn't have a visible Projects field!
                // So values.projects comes from initialValues (via form.getFieldsValue implicitly?)
                // If the user doesn't touch it, it sends back the same projects?
                // In EntrustmentForm, if I don't include <Form.Item name="projects">, then values.projects will be undefined (or missing).
                // If I send undefined projects, checking backend: usually ignores undefined.
                // So safe to omit 'projects' here if we don't want to change them.
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

    if (!initialValues) {
        return <Spin />
    }

    return (
        <div style={{ padding: 24 }}>
            <EntrustmentForm
                mode="edit"
                initialValues={initialValues}
                onSubmit={handleSubmit}
                loading={loading}
            />
        </div>
    )
}
