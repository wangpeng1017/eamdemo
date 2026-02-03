
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const entrustmentNo = 'WT-20260203-004'
    console.log(`Querying entrustment: ${entrustmentNo}`)

    const entrustment = await prisma.entrustment.findFirst({
        where: { entrustmentNo: { contains: entrustmentNo } },
        include: {
            projects: true
        }
    })

    if (!entrustment) {
        console.log('Entrustment not found')
        return
    }

    console.log('Entrustment found:', entrustment.id, entrustment.entrustmentNo)
    console.log('Projects count:', entrustment.projects.length)

    entrustment.projects.forEach((p, i) => {
        console.log(`\nProject ${i + 1}:`)
        console.log('  ID:', p.id)
        console.log('  Name:', p.name)
        console.log('  TestItems Type:', typeof p.testItems)
        console.log('  TestItems Content:', p.testItems)
        try {
            const parsed = JSON.parse(p.testItems);
            console.log('  Parsed TestItems:', parsed);
            console.log('  Is Array:', Array.isArray(parsed));
        } catch (e) {
            console.log('  Parse Error:', e.message);
        }
    })
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
