const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Altering table sys_approval_log...')
    await prisma.$executeRawUnsafe('ALTER TABLE sys_approval_log MODIFY COLUMN operatorId VARCHAR(191) NULL;')
    console.log('Successfully altered column operatorId to NULL')
  } catch (e) {
    console.error('Error:', e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
