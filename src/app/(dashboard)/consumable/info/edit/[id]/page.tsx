import EditConsumablePageClient from './EditPageClient'

export default async function EditConsumablePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    return <EditConsumablePageClient id={id} />
}
