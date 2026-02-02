import EditClientReportPageClient from './EditPageClient'

export default async function EditClientReportPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    return <EditClientReportPageClient id={id} />
}
