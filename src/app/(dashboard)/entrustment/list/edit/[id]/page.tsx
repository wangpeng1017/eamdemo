import EditEntrustmentPageClient from './EditPageClient'

export async function generateStaticParams() {
    return []
}

export default function EditEntrustmentPage({ params }: { params: { id: string } }) {
    return <EditEntrustmentPageClient id={params.id} />
}
