
import { prisma } from '../src/lib/prisma'

async function main() {
    console.log('--- Users ---')
    const users = await prisma.user.findMany()
    users.forEach(u => console.log(`${u.id}: ${u.name} (${u.username})`))

    console.log('\n--- Approval Instances ---')
    const instances = await prisma.approvalInstance.findMany({
        include: {
            quotation: { select: { quotationNo: true } }
        }
    })

    if (instances.length === 0) {
        console.log('No approval instances found.')
    } else {
        instances.forEach(i => {
            console.log(`ID: ${i.id}`)
            console.log(`  Biz: ${i.bizType} ${i.bizId} (${i.quotation?.quotationNo})`)
            console.log(`  Submitter: ${i.submitterId} (${i.submitterName})`)
            console.log(`  Status: ${i.status}, Step: ${i.currentStep}`)
            console.log('---')
        })
    }
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
