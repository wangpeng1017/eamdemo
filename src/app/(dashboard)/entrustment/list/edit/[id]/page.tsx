import EditEntrustmentPageClient from './EditPageClient'

export default async function EditEntrustmentPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    return <EditEntrustmentPageClient id={id} />
}
