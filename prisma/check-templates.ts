
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const count = await prisma.testTemplate.count()
    console.log(`Total TestTemplates: ${count}`)

    const list = await prisma.testTemplate.findMany({
        take: 5
    })
    console.log('First 5 templates:', JSON.stringify(list, null, 2))
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
