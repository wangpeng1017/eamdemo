
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const depts = await prisma.dept.findMany({
        include: { children: true },
        orderBy: { sort: 'asc' }
    })

    console.log('Total departments:', depts.length)

    const roots = depts.filter(d => !d.parentId)
    console.log('Root nodes:', roots.map(d => `${d.name} (${d.id})`))

    roots.forEach(r => {
        printTree(r, depts)
    })
}

function printTree(node: any, allDepts: any[], level = 0) {
    const indent = '  '.repeat(level)
    console.log(`${indent}- ${node.name} [${node.code || 'no-code'}]`)

    const children = allDepts.filter(d => d.parentId === node.id)
    children.forEach(c => printTree(c, allDepts, level + 1))
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
