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

    try {
        console.log('Adding sampleName column to biz_contract...')
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_contract ADD COLUMN sampleName VARCHAR(200);`)
        console.log('✅ sampleName column added to biz_contract.')
    } catch (e) {
        if (e.message.includes('Duplicate column name')) {
            console.log('ℹ️ sampleName column already exists in biz_contract.')
        } else {
            console.error('❌ Error adding sampleName column to biz_contract:', e.message)
        }
    }

    try {
        console.log('Adding follower column to biz_contract...')
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_contract ADD COLUMN follower VARCHAR(50);`)
        console.log('✅ follower column added to biz_contract.')
    } catch (e) {
        if (e.message.includes('Duplicate column name')) {
            console.log('ℹ️ follower column already exists in biz_contract.')
        } else {
            console.error('❌ Error adding follower column to biz_contract:', e.message)
        }
    }

    try {
        console.log('Adding partyAEmail column to biz_contract...')
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_contract ADD COLUMN partyAEmail VARCHAR(100);`)
        console.log('✅ partyAEmail column added to biz_contract.')
    } catch (e) {
        if (e.message.includes('Duplicate column name')) {
            console.log('ℹ️ partyAEmail column already exists in biz_contract.')
        } else {
            console.error('❌ Error adding partyAEmail column to biz_contract:', e.message)
        }
    }

    // ==================== Quotation 表更新 ====================
    try {
        console.log('Adding client info columns to biz_quotation...')
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_quotation ADD COLUMN clientPhone VARCHAR(50);`)
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_quotation ADD COLUMN clientEmail VARCHAR(100);`)
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_quotation ADD COLUMN clientAddress VARCHAR(500);`)
        console.log('✅ Client info columns added to biz_quotation.')
    } catch (e) {
        if (e.message.includes('Duplicate column name')) {
            console.log('ℹ️ Client info columns already exist in biz_quotation.')
        } else {
            console.error('❌ Error adding client info columns to biz_quotation:', e.message)
        }
    }

    // ==================== Consultation 表更新 ====================
    try {
        console.log('Adding client info columns to biz_consultation...')
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_consultation ADD COLUMN clientPhone VARCHAR(50);`)
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_consultation ADD COLUMN clientEmail VARCHAR(100);`)
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_consultation ADD COLUMN clientAddress VARCHAR(500);`)
        console.log('✅ Client info columns added to biz_consultation.')
    } catch (e) {
        if (e.message.includes('Duplicate column name')) {
            console.log('ℹ️ Client info columns already exist in biz_consultation.')
        } else {
            console.error('❌ Error adding client info columns to biz_consultation:', e.message)
        }
    }

    // ==================== Entrustment 表更新 ====================
    try {
        console.log('Adding client info columns to biz_entrustment...')
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_entrustment ADD COLUMN contactPhone VARCHAR(50);`)
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_entrustment ADD COLUMN contactEmail VARCHAR(100);`)
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_entrustment ADD COLUMN clientAddress VARCHAR(500);`)
        console.log('✅ Client info columns added to biz_entrustment.')
    } catch (e) {
        if (e.message.includes('Duplicate column name')) {
            console.log('ℹ️ Client info columns already exist in biz_entrustment.')
        } else {
            console.error('❌ Error adding client info columns to biz_entrustment:', e.message)
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

    // ==================== Quotation Item Update ====================
    try {
        console.log('Adding sampleName column to biz_quotation_item...')
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_quotation_item ADD COLUMN sampleName VARCHAR(200);`)
        console.log('✅ sampleName column added to biz_quotation_item.')
    } catch (e) {
        if (e.message.includes('Duplicate column name')) {
            console.log('ℹ️ sampleName column already exists in biz_quotation_item.')
        } else {
            console.error('❌ Error adding sampleName column to biz_quotation_item:', e.message)
        }
    }

    // ==================== 2026-02-09 报价单迭代 - 新增字段 ====================

    // QuotationItem: remark 字段
    try {
        console.log('Adding remark column to biz_quotation_item...')
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_quotation_item ADD COLUMN remark VARCHAR(500);`)
        console.log('✅ remark column added to biz_quotation_item.')
    } catch (e) {
        if (e.message.includes('Duplicate column name')) {
            console.log('ℹ️ remark column already exists in biz_quotation_item.')
        } else {
            console.error('❌ Error:', e.message)
        }
    }

    // QuotationItem: quantity 类型变更 Int → VARCHAR(20)
    try {
        console.log('Changing quantity column type in biz_quotation_item to VARCHAR(20)...')
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_quotation_item MODIFY COLUMN quantity VARCHAR(20) NOT NULL DEFAULT '1';`)
        console.log('✅ quantity column type changed to VARCHAR(20).')
    } catch (e) {
        console.error('❌ Error modifying quantity column:', e.message)
    }

    // Quotation: serviceEmail 字段
    try {
        console.log('Adding serviceEmail column to biz_quotation...')
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_quotation ADD COLUMN serviceEmail VARCHAR(100);`)
        console.log('✅ serviceEmail column added.')
    } catch (e) {
        if (e.message.includes('Duplicate column name')) {
            console.log('ℹ️ serviceEmail already exists.')
        } else {
            console.error('❌ Error:', e.message)
        }
    }

    // Quotation: serviceAddress 字段
    try {
        console.log('Adding serviceAddress column to biz_quotation...')
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_quotation ADD COLUMN serviceAddress VARCHAR(500);`)
        console.log('✅ serviceAddress column added.')
    } catch (e) {
        if (e.message.includes('Duplicate column name')) {
            console.log('ℹ️ serviceAddress already exists.')
        } else {
            console.error('❌ Error:', e.message)
        }
    }

    // Quotation: taxRate 字段（默认 0.06）
    try {
        console.log('Adding taxRate column to biz_quotation...')
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_quotation ADD COLUMN taxRate DECIMAL(5,4) NOT NULL DEFAULT 0.0600;`)
        console.log('✅ taxRate column added.')
    } catch (e) {
        if (e.message.includes('Duplicate column name')) {
            console.log('ℹ️ taxRate already exists.')
        } else {
            console.error('❌ Error:', e.message)
        }
    }

    // ==================== Quotation Rejection Fields ====================
    try {
        console.log('Adding rejection fields to biz_quotation...')
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_quotation ADD COLUMN rejectedCount INT DEFAULT 0;`)
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_quotation ADD COLUMN lastRejectReason TEXT;`)
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_quotation ADD COLUMN lastRejectBy VARCHAR(50);`)
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_quotation ADD COLUMN lastRejectAt DATETIME(3);`)
        console.log('✅ Rejection fields added to biz_quotation.')
    } catch (e) {
        if (e.message.includes('Duplicate column name')) {
            console.log('ℹ️ Rejection fields already exist in biz_quotation.')
        } else {
            console.error('❌ Error adding rejection fields to biz_quotation:', e.message)
        }
    }

    // ==================== Contract Rejection Fields ====================
    try {
        console.log('Adding rejection fields to biz_contract...')
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_contract ADD COLUMN rejectedCount INT DEFAULT 0;`)
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_contract ADD COLUMN lastRejectReason TEXT;`)
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_contract ADD COLUMN lastRejectBy VARCHAR(50);`)
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_contract ADD COLUMN lastRejectAt DATETIME(3);`)
        console.log('✅ Rejection fields added to biz_contract.')
    } catch (e) {
        if (e.message.includes('Duplicate column name')) {
            console.log('ℹ️ Rejection fields already exist in biz_contract.')
        } else {
            console.error('❌ Error adding rejection fields to biz_contract:', e.message)
        }
    }

    // ==================== Entrustment Rejection Fields ====================
    try {
        console.log('Adding rejection fields to biz_entrustment...')
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_entrustment ADD COLUMN rejectedCount INT DEFAULT 0;`)
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_entrustment ADD COLUMN lastRejectReason TEXT;`)
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_entrustment ADD COLUMN lastRejectBy VARCHAR(50);`)
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_entrustment ADD COLUMN lastRejectAt DATETIME(3);`)
        console.log('✅ Rejection fields added to biz_entrustment.')
    } catch (e) {
        if (e.message.includes('Duplicate column name')) {
            console.log('ℹ️ Rejection fields already exist in biz_entrustment.')
        } else {
            console.error('❌ Error adding rejection fields to biz_entrustment:', e.message)
        }
    }

    // ==================== Client Rejection Fields ====================
    try {
        console.log('Adding rejection fields to biz_client...')
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_client ADD COLUMN rejectedCount INT DEFAULT 0;`)
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_client ADD COLUMN lastRejectReason TEXT;`)
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_client ADD COLUMN lastRejectBy VARCHAR(50);`)
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_client ADD COLUMN lastRejectAt DATETIME(3);`)
        console.log('✅ Rejection fields added to biz_client.')
    } catch (e) {
        if (e.message.includes('Duplicate column name')) {
            console.log('ℹ️ Rejection fields already exist in biz_client.')
        } else {
            console.error('❌ Error adding rejection fields to biz_client:', e.message)
        }
    }

    // ==================== TestReport 表更新 ====================
    try {
        console.log('Adding approval fields to biz_test_report...')
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_test_report ADD COLUMN approvalStatus VARCHAR(50) DEFAULT 'pending';`)
    } catch (e) { console.log('approvalStatus column check...'); }
    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_test_report ADD COLUMN approvalStep INT DEFAULT 0;`)
    } catch (e) { console.log('approvalStep column check...'); }
    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_test_report ADD COLUMN approvalInstanceId VARCHAR(191);`)
        console.log('✅ Approval fields added to biz_test_report.')
    } catch (e) {
        if (e.message.includes('Duplicate column name')) {
            console.log('ℹ️ Approval fields already exist in biz_test_report.')
        } else {
            console.error('❌ Error adding approval fields to biz_test_report:', e.message)
        }
    }

    // ==================== Consultation - CreatedById ====================
    try {
        console.log('Adding createdById to biz_consultation...')
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_consultation ADD COLUMN createdById VARCHAR(191);`)
        console.log('✅ createdById added to biz_consultation.')
    } catch (e) {
        if (e.message.includes('Duplicate column name')) {
            console.log('ℹ️ createdById already exists in biz_consultation.')
        } else {
            console.error('❌ Error adding createdById to biz_consultation:', e.message)
        }
    }

    // ==================== ConsultationSampleAssessment - round, isLatest ====================
    try {
        console.log('Adding round and isLatest to consultation_sample_assessment...')
        await prisma.$executeRawUnsafe(`ALTER TABLE consultation_sample_assessment ADD COLUMN round INT DEFAULT 1;`)
        await prisma.$executeRawUnsafe(`ALTER TABLE consultation_sample_assessment ADD COLUMN isLatest BOOLEAN DEFAULT TRUE;`)
        console.log('✅ round and isLatest added.')
    } catch (e) {
        if (e.message.includes('Duplicate column name')) {
            console.log('ℹ️ round or isLatest already exists.')
        } else {
            console.error('❌ Error adding round/isLatest:', e.message)
        }
    }

    try {
        console.log('Adding indexes to consultation_sample_assessment...')
        await prisma.$executeRawUnsafe(`CREATE INDEX consultation_sample_assessment_consultationId_isLatest_idx ON consultation_sample_assessment (consultationId, isLatest);`)
        await prisma.$executeRawUnsafe(`CREATE INDEX consultation_sample_assessment_sampleTestItemId_isLatest_idx ON consultation_sample_assessment (sampleTestItemId, isLatest);`)
        console.log('✅ Indexes added.')
    } catch (e) {
        console.log('ℹ️ Indexes check (might already exist or implicit).')
    }

    // ==================== Quotation - Approval & CreatedBy ====================
    try {
        console.log('Updating biz_quotation schema...')
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_quotation ADD COLUMN approvalStatus VARCHAR(50) DEFAULT 'pending';`)
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_quotation ADD COLUMN approvalStep INT DEFAULT 0;`)
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_quotation ADD COLUMN approvalInstanceId VARCHAR(191);`)
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_quotation ADD COLUMN createdById VARCHAR(191);`)
        console.log('✅ Quotation fields updated.')
    } catch (e) {
        console.log('ℹ️ Quotation fields update check (ignoring duplicate column errors).')
    }

    // ==================== Contract - Approval & CreatedBy ====================
    try {
        console.log('Updating biz_contract schema...')
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_contract ADD COLUMN approvalStatus VARCHAR(50) DEFAULT 'pending';`)
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_contract ADD COLUMN approvalStep INT DEFAULT 0;`)
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_contract ADD COLUMN approvalInstanceId VARCHAR(191);`)
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_contract ADD COLUMN createdById VARCHAR(191);`)
        console.log('✅ Contract fields updated.')
    } catch (e) {
        console.log('ℹ️ Contract fields update check (ignoring duplicate column errors).')
    }

    // ==================== 2026-02-05 报告增强与任务时间补全 ====================

    // 1. TestTask 时间字段
    try {
        console.log('Adding plannedStartDate/End to biz_test_task...')
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_test_task ADD COLUMN plannedStartDate DATETIME(3);`)
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_test_task ADD COLUMN plannedEndDate DATETIME(3);`)
        console.log('✅ Task time fields added.')
    } catch (e) { console.log('ℹ️ Task time fields check.'); }

    // 2. TestReport 增强字段
    try {
        console.log('Updating biz_test_report for custom content...')
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_test_report ADD COLUMN precautions TEXT;`)
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_test_report ADD COLUMN isClientReport BOOLEAN DEFAULT FALSE;`)
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_test_report ADD COLUMN clientReportId VARCHAR(191);`)
        console.log('✅ TestReport custom fields added.')
    } catch (e) { console.log('ℹ️ TestReport custom fields check.'); }

    // 3. ReportTemplate 配置字段
    try {
        console.log('Updating biz_report_template for configs...')
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_report_template ADD COLUMN coverConfig TEXT;`)
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_report_template ADD COLUMN backCoverConfig TEXT;`)
        console.log('✅ ReportTemplate config fields added.')
    } catch (e) { console.log('ℹ️ ReportTemplate config fields check.'); }

    // 4. 创建 ClientReport 表
    try {
        console.log('Creating biz_client_report table...')
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS biz_client_report (
                id VARCHAR(191) NOT NULL,
                reportNo VARCHAR(50) NOT NULL UNIQUE,
                entrustmentId VARCHAR(50),
                projectName VARCHAR(200),
                clientName VARCHAR(200) NOT NULL,
                clientAddress VARCHAR(500),
                sampleName VARCHAR(200) NOT NULL,
                sampleNo VARCHAR(50),
                specification VARCHAR(200),
                sampleQuantity VARCHAR(50),
                receivedDate DATETIME(3),
                taskReportNos TEXT,
                testItems TEXT,
                testStandards TEXT,
                overallConclusion TEXT,
                preparer VARCHAR(50),
                reviewer VARCHAR(50),
                approver VARCHAR(50),
                status VARCHAR(50) NOT NULL DEFAULT 'draft',
                approvalFlow TEXT,
                issuedDate DATETIME(3),
                attachmentUrl VARCHAR(500),
                templateId VARCHAR(191),
                coverData TEXT,
                backCoverData TEXT,
                createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                updatedAt DATETIME(3) NOT NULL,
                
                PRIMARY KEY (id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        `)
        console.log('✅ biz_client_report table checked/created.')
    } catch (e) {
        console.error('❌ Error creating biz_client_report table:', e.message)
    }

    // 4.1 显式检查并添加 biz_client_report 字段 (针对已存在的表)
    const clientReportColumns = [
        ['templateId', 'VARCHAR(191)'],
        ['coverData', 'TEXT'],
        ['backCoverData', 'TEXT'],
        ['clientAddress', 'VARCHAR(500)'],
        ['memo', 'TEXT']
    ]

    for (const [col, type] of clientReportColumns) {
        try {
            await prisma.$executeRawUnsafe(`ALTER TABLE biz_client_report ADD COLUMN ${col} ${type};`)
            console.log(`✅ Column ${col} added to biz_client_report.`)
        } catch (e) {
            // 忽略重复列错误
        }
    }

    // 5. 建立 ClientReport 外键关联 (可选，防止失败)
    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_test_report ADD CONSTRAINT biz_test_report_clientReportId_fkey FOREIGN KEY (clientReportId) REFERENCES biz_client_report(id) ON DELETE SET NULL ON UPDATE CASCADE;`)
    } catch (e) { console.log('ℹ️ FK relation check.'); }

    // 6. 添加 followerId 到 biz_consultation（跟单人）
    try {
        console.log('Adding followerId column to biz_consultation...')
        await prisma.$executeRawUnsafe(`ALTER TABLE biz_consultation ADD COLUMN followerId VARCHAR(191) NULL;`)
        console.log('✅ followerId column added to biz_consultation.')
    } catch (e) {
        if (e.message.includes('Duplicate column name')) {
            console.log('ℹ️ followerId already exists in biz_consultation.')
        } else {
            console.error('❌ Error:', e.message)
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
