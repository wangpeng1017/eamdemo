import EditPageClient from './EditPageClient'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    return <EditPageClient id={id} />
}
