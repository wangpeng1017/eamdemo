import EditContractPageClient from './EditPageClient'

export async function generateStaticParams() {
    return []
}

export default function EditContractPage({ params }: { params: { id: string } }) {
    const { id } = params
    return <EditContractPageClient id={id} />
}
