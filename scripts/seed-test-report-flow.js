const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
    console.log('Upserting TEST_REPORT_APPROVAL flow...');
    const flow = await prisma.approvalFlow.upsert({
        where: { code: 'TEST_REPORT_APPROVAL' },
        update: {
            businessType: 'test_report',
            nodes: JSON.stringify([
                { step: 1, type: 'role', targetId: 'lab_director', targetName: '实验室负责人' }
            ]),
            status: true
        },
        create: {
            name: '检测报告审批',
            code: 'TEST_REPORT_APPROVAL',
            businessType: 'test_report',
            nodes: JSON.stringify([
                { step: 1, type: 'role', targetId: 'lab_director', targetName: '实验室负责人' }
            ]),
            status: true
        }
    });
    console.log('✅ Created/Updated flow:', flow);
}

seed().catch(console.error).finally(() => prisma.$disconnect());
