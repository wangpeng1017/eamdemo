
const { PrismaClient } = require('@prisma/client')
try { require('dotenv').config() } catch (e) { }

const prisma = new PrismaClient()

async function main() {
    const idsToDelete = [
        'cmkc9f5u8000b106xu0howuul', // PRODUCT_TEST_MANAGER (Unused)
        'cmkc9f5tn0009106xxjg0098x', // CHEMICAL_TEAM_LEADER (Unused)
        'cmkc9f5t90007106xq2szkpzv', // MATERIAL_TEST_MANAGER (Unused)
        'cmkc9f5ss0006106xzmwivhia'  // BUSINESS_MANAGER (Unused)
    ]

    console.log(`Deleting ${idsToDelete.length} unused duplicate roles...`)

    const result = await prisma.role.deleteMany({
        where: {
            id: { in: idsToDelete }
        }
    })

    console.log(`Deleted ${result.count} roles.`)

    // Verify
    const remaining = await prisma.role.findMany({
        where: { name: { in: ['产品检测负责人', '化学组组长', '材料检测负责人', '业务经理'] } }
    })

    console.log('Remaining roles for these names:')
    remaining.forEach(r => console.log(`- ${r.name} (${r.code})`))
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
