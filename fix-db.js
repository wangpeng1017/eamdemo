const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    try {
        console.log('Starting DB cleanup...')

        // Drop conflicting tables
        await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS biz_consultation_assessment;')
        await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS consultation_sample_assessment;')
        console.log('Dropped conflicting tables')

        // Fix orphaned TestTask.projectId
        console.log('Fixing orphaned TestTask.projectId...')
        const result = await prisma.$executeRawUnsafe(`
      UPDATE biz_test_task 
      SET projectId = NULL 
      WHERE projectId IS NOT NULL 
      AND projectId NOT IN (SELECT id FROM biz_entrustment_project)
    `)
        console.log(`Updated ${result} rows for TestTask.projectId`)

        // Fix orphaned TestTask.sampleId (proactive)
        console.log('Fixing orphaned TestTask.sampleId...')
        const resultSample = await prisma.$executeRawUnsafe(`
      UPDATE biz_test_task 
      SET sampleId = NULL 
      WHERE sampleId IS NOT NULL 
      AND sampleId NOT IN (SELECT id FROM biz_sample)
    `)
        console.log(`Updated ${resultSample} rows for TestTask.sampleId`)

    } catch (e) {
        console.error('Error in cleanup:', e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
