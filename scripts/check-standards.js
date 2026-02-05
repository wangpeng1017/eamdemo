const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
    const count = await prisma.inspectionStandard.count()
    console.log(`Total inspection standards: ${count}`)
    const latest = await prisma.inspectionStandard.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5
    })
    console.log('Latest 5 items:')
    console.log(JSON.stringify(latest, null, 2))
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
