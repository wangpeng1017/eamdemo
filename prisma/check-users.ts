import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Checking users in database...')
    const users = await prisma.user.findMany({
        include: {
            dept: true,
            roles: {
                include: {
                    role: true
                }
            }
        }
    })

    console.log(`Found ${users.length} users:`)
    users.forEach(u => {
        console.log(`- ${u.name} (${u.username}): Dept=${u.dept?.name}, Roles=${u.roles.map(r => r.role.name).join(', ')}`)
    })

    if (users.length === 0) {
        console.log('WARNING: No users found!')
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
