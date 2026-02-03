
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const id = 'cml5yuvqv000613hodhd35v3e'
    console.log(`Checking instance ${id}...`)
    const instance = await prisma.approvalInstance.findUnique({
        where: { id },
    })
    console.log('Instance:', instance)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
