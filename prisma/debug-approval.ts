
import { PrismaClient } from '@prisma/client'
import { approvalEngine } from '../src/lib/approval/engine'

const prisma = new PrismaClient()

async function main() {
    const instanceId = 'cmk9u6eaj0000tiimh6hjnw3d'
    console.log(`Checking instance: ${instanceId}`)

    const instance = await prisma.approvalInstance.findUnique({
        where: { id: instanceId },
        include: { records: true }
    })

    if (!instance) {
        console.error('Instance not found')
        return
    }
    console.log('Instance:', JSON.stringify(instance, null, 2))

    const flow = await prisma.approvalFlow.findUnique({
        where: { code: instance.flowCode }
    })
    console.log('Flow:', JSON.stringify(flow, null, 2))

    if (!flow) return

    const nodes = approvalEngine.parseNodes(flow)
    const currentNode = nodes.find(n => n.step === instance.currentStep)
    console.log('Current Node:', currentNode)

    // Check admin user
    const admin = await prisma.user.findFirst({
        where: { username: 'admin' },
        include: { roles: { include: { role: true } } }
    })

    if (!admin) {
        console.error('Admin user not found')
        return
    }

    console.log('Admin User Roles:', admin.roles.map(r => r.role.code))

    if (currentNode) {
        const hasPermission = await approvalEngine.checkApprovalPermission(currentNode, admin.id)
        console.log(`Admin has permission? ${hasPermission}`)

        // Check match details
        if (currentNode.type === 'role') {
            const hasRole = admin.roles.some(r => r.role.code === currentNode.targetId)
            console.log(`Role match check: User has ${currentNode.targetId}? ${hasRole}`)
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
