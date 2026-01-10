import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('👤 Checking for admin user (id="admin")...')

    const adminById = await prisma.user.findUnique({
        where: { id: 'admin' }
    })

    if (adminById) {
        console.log('✅ User with id="admin" already exists.')
        return
    }

    console.log('⚠️ User id="admin" not found. Creating...')

    // Check if username 'admin' is taken
    const adminByName = await prisma.user.findUnique({
        where: { username: 'admin' }
    })

    let username = 'admin'
    if (adminByName) {
        console.log(`ℹ️ Username "admin" is already taken by user ${adminByName.id}. Using "system_admin" instead.`)
        username = 'system_admin'
    }

    await prisma.user.create({
        data: {
            id: 'admin',      // The ID the backend expects
            username: username,
            password: 'password_hash_placeholder',
            name: '系统管理员',
            status: 1,
        }
    })
    console.log(`✅ User created: id="admin", username="${username}"`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
