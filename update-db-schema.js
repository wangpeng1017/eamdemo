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

    // ==================== Contract 表更新 ====================
    try {
        console.log('Adding sampleModel column to biz_contract...')
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_contract ADD COLUMN sampleModel VARCHAR(100);`)
        console.log('✅ sampleModel column added.')
    } catch (e) {
        if (e.message.includes('Duplicate column name')) {
            console.log('ℹ️ sampleModel column already exists.')
        } else {
            console.error('❌ Error adding sampleModel column:', e.message)
        }
    }

    try {
        console.log('Adding sampleMaterial column to biz_contract...')
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_contract ADD COLUMN sampleMaterial VARCHAR(100);`)
        console.log('✅ sampleMaterial column added.')
    } catch (e) {
        if (e.message.includes('Duplicate column name')) {
            console.log('ℹ️ sampleMaterial column already exists.')
        } else {
            console.error('❌ Error adding sampleMaterial column:', e.message)
        }
    }

    try {
        console.log('Adding sampleQuantity column to biz_contract...')
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_contract ADD COLUMN sampleQuantity INT;`)
        console.log('✅ sampleQuantity column added.')
    } catch (e) {
        if (e.message.includes('Duplicate column name')) {
            console.log('ℹ️ sampleQuantity column already exists.')
        } else {
            console.error('❌ Error adding sampleQuantity column:', e.message)
        }
    }

    // ==================== ContractItem 表创建 ====================
    try {
        console.log('Creating biz_contract_item table...')
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS biz_contract_item (
                id VARCHAR(191) NOT NULL,
                contractId VARCHAR(191) NOT NULL,
                serviceItem VARCHAR(200) NOT NULL,
                methodStandard VARCHAR(200) NOT NULL,
                quantity INT NOT NULL DEFAULT 1,
                unitPrice DECIMAL(10, 2) NOT NULL,
                totalPrice DECIMAL(12, 2) NOT NULL,
                sort INT NOT NULL DEFAULT 0,
                
                PRIMARY KEY (id),
                INDEX biz_contract_item_contractId_idx (contractId)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        `)

        console.log('✅ biz_contract_item table checked/created.')
    } catch (e) {
        console.error('❌ Error creating biz_contract_item table:', e.message)
    }

    // ==================== Sample Table Update ====================
    try {
        console.log('Adding material column to biz_sample...')
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_sample ADD COLUMN material VARCHAR(100);`)
        console.log('✅ material column added to biz_sample.')
    } catch (e) {
        if (e.message.includes('Duplicate column name')) {
            console.log('ℹ️ material column already exists in biz_sample.')
        } else {
            console.error('❌ Error adding material column to biz_sample:', e.message)
        }
    }

    // ==================== New Sample Tables Creation ====================

    // ConsultationSample
    try {
        console.log('Creating biz_consultation_sample table...')
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS biz_consultation_sample (
                id VARCHAR(191) NOT NULL,
                consultationId VARCHAR(191) NOT NULL,
                name VARCHAR(200) NOT NULL,
                model VARCHAR(100),
                material VARCHAR(100),
                quantity INT NOT NULL DEFAULT 1,
                remark TEXT,
                createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                updatedAt DATETIME(3) NOT NULL,
                
                PRIMARY KEY (id),
                INDEX biz_consultation_sample_consultationId_idx (consultationId)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        `)
        console.log('✅ biz_consultation_sample table checked/created.')
    } catch (e) {
        console.error('❌ Error creating biz_consultation_sample table:', e.message)
    }

    // QuotationSample
    try {
        console.log('Creating biz_quotation_sample table...')
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS biz_quotation_sample (
                id VARCHAR(191) NOT NULL,
                quotationId VARCHAR(191) NOT NULL,
                name VARCHAR(200) NOT NULL,
                model VARCHAR(100),
                material VARCHAR(100),
                quantity INT NOT NULL DEFAULT 1,
                remark TEXT,
                createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                updatedAt DATETIME(3) NOT NULL,
                
                PRIMARY KEY (id),
                INDEX biz_quotation_sample_quotationId_idx (quotationId)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        `)
        console.log('✅ biz_quotation_sample table checked/created.')
    } catch (e) {
        console.error('❌ Error creating biz_quotation_sample table:', e.message)
    }

    // ContractSample
    try {
        console.log('Creating biz_contract_sample table...')
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS biz_contract_sample (
                id VARCHAR(191) NOT NULL,
                contractId VARCHAR(191) NOT NULL,
                name VARCHAR(200) NOT NULL,
                model VARCHAR(100),
                material VARCHAR(100),
                quantity INT NOT NULL DEFAULT 1,
                remark TEXT,
                createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                updatedAt DATETIME(3) NOT NULL,
                
                PRIMARY KEY (id),
                INDEX biz_contract_sample_contractId_idx (contractId)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        `)
        console.log('✅ biz_contract_sample table checked/created.')
    } catch (e) {
        console.error('❌ Error creating biz_contract_sample table:', e.message)
    }

    // ==================== TestTask - EntrustmentProject FK ====================
    try {
        console.log('Adding FK to biz_test_task for projectId...')
        await prisma.$executeRawUnsafe(`
            ALTER TABLE biz_test_task
            ADD CONSTRAINT biz_test_task_projectId_fkey
            FOREIGN KEY (projectId) REFERENCES biz_entrustment_project(id) ON DELETE SET NULL ON UPDATE CASCADE;
        `)
        console.log('✅ FK biz_test_task_projectId_fkey added.')
    } catch (e) {
        if (e.message.includes('Duplicate') || e.message.includes('already exists')) {
            console.log('ℹ️ FK already exists.')
        } else {
            // 忽略 FK 错误，防止部署中断
            console.error('❌ Error adding FK (ignoring):', e.message)
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
