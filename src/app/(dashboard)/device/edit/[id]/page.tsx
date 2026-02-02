import EditDevicePageClient from './EditPageClient'

export default async function EditDevicePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    return <EditDevicePageClient id={id} />
}
