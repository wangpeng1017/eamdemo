import EditSamplePageClient from './EditPageClient'

export default async function EditSamplePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    return <EditSamplePageClient id={id} />
}
