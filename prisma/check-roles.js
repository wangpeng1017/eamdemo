
const { PrismaClient } = require('@prisma/client')
try { require('dotenv').config() } catch (e) { }

const prisma = new PrismaClient()

async function main() {
    console.log('1. Fetching all Users with Roles...')
    const users = await prisma.user.findMany({
        select: {
            name: true,
            roles: {
                include: { role: true }
            }
        }
    })

    console.log('2. Fetching all Roles from Role table...')
    const allRoles = await prisma.role.findMany()
    const roleMap = new Map(allRoles.map(r => [r.id, r.name]))

    console.log('--- Analysis ---')
    console.log(`Total Users: ${users.length}`)
    console.log(`Total Roles Defined: ${allRoles.length}`)

    const userRoleIds = new Set()
    const userRoleNames = new Set()

    users.forEach(u => {
        if (u.roles.length > 0) {
            u.roles.forEach(ur => {
                userRoleIds.add(ur.role.id)
                userRoleNames.add(ur.role.name)

                // detailed check
                if (!roleMap.has(ur.role.id)) {
                    console.warn(`WARNING: User ${u.name} has role ID ${ur.role.id} which is NOT in Role table! (Should be impossible due to foreign key)`)
                }
            })
        }
    })

    console.log(`Distinct Role IDs used by Users: ${userRoleIds.size}`)
    console.log(`Distinct Role Names used by Users: ${Array.from(userRoleNames).join(', ')}`)

    const unusedRoles = allRoles.filter(r => !userRoleIds.has(r.id))
    console.log(`Roles defined but NOT assigned to any user: ${unusedRoles.map(r => r.name).join(', ')}`)
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
