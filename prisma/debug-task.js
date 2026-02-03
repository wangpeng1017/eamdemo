
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const task = await prisma.testTask.findUnique({
        where: { taskNo: 'T20260203002' },
        include: {
            sample: true,
            entrustmentProject: true
        }
    })
    console.log(JSON.stringify(task, null, 2))
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
