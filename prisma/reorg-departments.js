
const { PrismaClient } = require('@prisma/client')
try { require('dotenv').config() } catch (e) { }

const prisma = new PrismaClient()

async function main() {
    // 1. Find "国轻检测"
    const company = await prisma.dept.findFirst({
        where: { name: '国轻检测' }
    })

    if (!company) {
        console.error('Company "国轻检测" not found! Please check previous step.')
        process.exit(1)
    }
    console.log('Found Company:', company.name, company.id)

    // 2. Departments to move
    const deptNames = ['试验中心', '质量部', '业务部', '检测部']

    console.log(`Moving departments [${deptNames.join(', ')}] under ${company.name}...`)

    const result = await prisma.dept.updateMany({
        where: {
            name: { in: deptNames }
        },
        data: {
            parentId: company.id
        }
    })

    console.log(`Updated ${result.count} departments.`)

    // 3. Verify structure
    console.log('\nVerifying new structure:')
    const children = await prisma.dept.findMany({
        where: { parentId: company.id }
    })

    children.forEach(c => {
        console.log(`- ${c.name} (Parent: ${company.name})`)
    })
}

main()
    .catch(e => {
        console.error('Error during reorganization:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
