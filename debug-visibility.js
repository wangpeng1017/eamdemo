
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
    const quotationNo = 'BJ202602030002'
    const userName = '秦兴国'

    console.log(`Checking quotation ${quotationNo} and user ${userName}...`)

    // 1. Get User Details
    const user = await prisma.user.findFirst({
        where: { name: userName },
        include: {
            roles: {
                include: { role: true }
            }
        }
    })

    if (!user) {
        console.log(`User ${userName} not found`)
        return
    }

    console.log('User:', {
        id: user.id,
        name: user.name,
        username: user.username,
        deptId: user.deptId,
        roles: user.roles.map(r => r.role.code)
    })

    // 2. Get Quotation and Approval Instance
    const quotation = await prisma.quotation.findUnique({
        where: { quotationNo },
        include: { approvalInstance: true }
    })

    if (!quotation) {
        console.log(`Quotation ${quotationNo} not found`)
        return
    }

    if (!quotation.approvalInstance) {
        console.log('Quotation has no approval instance')
        return
    }

    const instance = quotation.approvalInstance
    console.log('Instance:', {
        id: instance.id,
        flowCode: instance.flowCode,
        currentStep: instance.currentStep,
        status: instance.status,
        submitterId: instance.submitterId
    })

    // 3. Get Flow Config
    const flow = await prisma.approvalFlow.findUnique({
        where: { code: instance.flowCode },
    })

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

    // Normalize nodes (same logic as in permission.ts)
    nodes = nodes.map(n => ({
        ...n,
        step: n.step || n.order || 0
    }))

    console.log('Nodes:', JSON.stringify(nodes, null, 2))

    const currentNode = nodes.find(n => n.step === instance.currentStep)
    console.log('Current Node:', currentNode)

    // 4. Check Permission manually
    if (!currentNode) {
        console.log('Current node not found!')
        return
    }

    const userRoleCodes = user.roles.map(r => r.role.code)
    let hasPermission = false

    if (user.username === 'admin' || userRoleCodes.includes('admin')) {
        hasPermission = true
        console.log('Admin exemption')
    } else {
        switch (currentNode.type) {
            case 'role':
                hasPermission = userRoleCodes.includes(currentNode.targetId)
                console.log(`Role check: ${currentNode.targetId} in [${userRoleCodes}] = ${hasPermission}`)
                break
            case 'user':
                hasPermission = user.id === currentNode.targetId
                console.log(`User check: ${currentNode.targetId} === ${user.id} = ${hasPermission}`)
                break
            case 'department':
                if (user.deptId !== currentNode.targetId) {
                    console.log(`Dept check: ${currentNode.targetId} !== ${user.deptId}`)
                    hasPermission = false
                } else {
                    const managerRoles = ['admin', 'manager', 'dept_manager', 'sales_manager', 'lab_director']
                    hasPermission = userRoleCodes.some(code => managerRoles.includes(code))
                    console.log(`Dept manager check: [${userRoleCodes}] has manager role? ${hasPermission}`)
                }
                break
        }
    }

    console.log('Has Permission:', hasPermission)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
