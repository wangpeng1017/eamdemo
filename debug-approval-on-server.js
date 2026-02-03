
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
    const id = 'cml5yuvqv000613hodhd35v3e'
    console.log(`Checking instance ${id}...`)

    const instance = await prisma.approvalInstance.findUnique({
        where: { id },
    })

    if (!instance) {
        console.log('Instance not found')
        return
    }

    console.log('Instance:', JSON.stringify(instance, null, 2))

    const flow = await prisma.approvalFlow.findUnique({
        where: { code: instance.flowCode },
    })

    if (!flow) {
        console.log(`Flow not found: ${instance.flowCode}`)
        return
    }

    console.log('Flow:', JSON.stringify(flow, null, 2))

    let nodes = []
    try {
        if (typeof flow.nodes === 'string') {
            nodes = JSON.parse(flow.nodes)
        } else if (Array.isArray(flow.nodes)) {
            nodes = flow.nodes
        }
    } catch (e) {
        console.log('Error parsing nodes:', e)
    }

    console.log('Parsed Nodes:', JSON.stringify(nodes, null, 2))

    const currentNode = nodes.find(n => n.step === instance.currentStep)
    console.log('Current Node:', currentNode)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
