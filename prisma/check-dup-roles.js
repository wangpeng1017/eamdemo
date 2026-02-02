
const { PrismaClient } = require('@prisma/client')
try { require('dotenv').config() } catch (e) { }

const prisma = new PrismaClient()

async function main() {
    const allRoles = await prisma.role.findMany()
    const users = await prisma.user.findMany({ select: { roles: true } })

    const usedRoleIds = new Set()
    users.forEach(u => u.roles.forEach(ur => usedRoleIds.add(ur.roleId)))

    const nameMap = {}

    allRoles.forEach(r => {
        if (!nameMap[r.name]) nameMap[r.name] = []
        nameMap[r.name].push({
            id: r.id,
            code: r.code,
            isUsed: usedRoleIds.has(r.id)
        })
    })

    console.log('--- Duplicate Roles Check ---')
    Object.keys(nameMap).forEach(name => {
        const roles = nameMap[name]
        if (roles.length > 1) {
            console.log(`Duplicate Name: "${name}"`)
            roles.forEach(r => {
                console.log(`  - ID: ${r.id}, Code: ${r.code}, Used: ${r.isUsed}`)
            })
        }
    })
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
