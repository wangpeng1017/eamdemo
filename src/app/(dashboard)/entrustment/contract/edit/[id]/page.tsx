import EditContractPageClient from './EditPageClient'

export async function generateStaticParams() {
    return []
}

export default async function EditContractPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    return <EditContractPageClient id={id} />
}
