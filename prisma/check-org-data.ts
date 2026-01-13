
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- 部门及人员清单 ---')
    const depts = await prisma.dept.findMany({
        include: {
            users: {
                include: {
                    roles: {
                        include: {
                            role: true
                        }
                    }
                }
            }
        }
    })

    // 还有未分配部门的用户
    const noDeptUsers = await prisma.user.findMany({
        where: { deptId: null },
        include: {
            roles: {
                include: {
                    role: true
                }
            }
        }
    })

    for (const dept of depts) {
        console.log(`\n📁 部门: ${dept.name} (Code: ${dept.code})`)
        if (dept.users.length === 0) {
            console.log('   (无人员)')
            continue
        }
        for (const user of dept.users) {
            const roleNames = user.roles.map(r => r.role.name).join(', ')
            console.log(`   👤 ${user.name} (${user.phone}) - ${roleNames}`)
        }
    }

    if (noDeptUsers.length > 0) {
        console.log('\n❓ 未分配部门用户:')
        for (const user of noDeptUsers) {
            const roleNames = user.roles.map(r => r.role.name).join(', ')
            console.log(`   👤 ${user.name} (${user.phone}) - ${roleNames}`)
        }
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
