const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
    console.log('Start updating database schema...')

    try {
        // 添加 sheetData 字段用于存储 Fortune-sheet 数据
        console.log('Adding sheetData column to biz_test_task...')
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_test_task ADD COLUMN sheetData LONGTEXT;`)
        console.log('✅ sheetData column added.')
    } catch (e) {
        if (e.message.includes('Duplicate column name')) {
            console.log('ℹ️ sheetData column already exists.')
        } else {
            console.error('❌ Error adding sheetData column:', e.message)
        }
    }

    try {
        // 添加 submittedAt 字段
        console.log('Adding submittedAt column to biz_test_task...')
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_test_task ADD COLUMN submittedAt DATETIME(3);`)
        console.log('✅ submittedAt column added.')
    } catch (e) {
        if (e.message.includes('Duplicate column name')) {
            console.log('ℹ️ submittedAt column already exists.')
        } else {
            console.error('❌ Error adding submittedAt column:', e.message)
        }
    }

    try {
        // 添加 submittedBy 字段
        console.log('Adding submittedBy column to biz_test_task...')
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_test_task ADD COLUMN submittedBy VARCHAR(191);`)
        console.log('✅ submittedBy column added.')
    } catch (e) {
        if (e.message.includes('Duplicate column name')) {
            console.log('ℹ️ submittedBy column already exists.')
        } else {
            console.error('❌ Error adding submittedBy column:', e.message)
        }
    }

    try {
        // 添加 summary 字段
        console.log('Adding summary column to biz_test_task...')
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_test_task ADD COLUMN summary TEXT;`)
        console.log('✅ summary column added.')
    } catch (e) {
        if (e.message.includes('Duplicate column name')) {
            console.log('ℹ️ summary column already exists.')
        } else {
            console.error('❌ Error adding summary column:', e.message)
        }
    }

    try {
        // 添加 conclusion 字段
        console.log('Adding conclusion column to biz_test_task...')
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_test_task ADD COLUMN conclusion VARCHAR(191);`)
        console.log('✅ conclusion column added.')
    } catch (e) {
        if (e.message.includes('Duplicate column name')) {
            console.log('ℹ️ conclusion column already exists.')
        } else {
            console.error('❌ Error adding conclusion column:', e.message)
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
