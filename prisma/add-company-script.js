
const { PrismaClient } = require('@prisma/client')
// Try to load dotenv if available, otherwise rely on Prisma loading .env
try { require('dotenv').config() } catch (e) { }

const prisma = new PrismaClient()

async function main() {
    console.log('Checking for existing company "国轻检测"...')
    const existing = await prisma.dept.findFirst({
        where: { name: '国轻检测' }
    })

    if (existing) {
        console.log('Company "国轻检测" already exists. ID:', existing.id)
        return
    }

    console.log('Creating new top-level company "国轻检测"...')
    const company = await prisma.dept.create({
        data: {
            name: '国轻检测',
            code: 'GQ', // Assigned code
            parentId: null,
            sort: 0,
            status: 1
        }
    })
    console.log('Successfully created company:', company)
}

main()
    .catch(e => {
        console.error('Error creating company:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
