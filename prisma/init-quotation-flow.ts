import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const flow = await prisma.approvalFlow.upsert({
        where: { code: 'QUOTATION_APPROVAL' },
        update: {
            nodes: JSON.stringify([
                { step: 1, name: '销售经理审批', type: 'role', targetId: 'sales_manager', targetName: '销售经理' },
                { step: 2, name: '财务审批', type: 'role', targetId: 'finance', targetName: '财务' },
                { step: 3, name: '实验室负责人审批', type: 'role', targetId: 'lab_director', targetName: '实验室负责人' },
            ]),
            status: true,
        },
        create: {
            id: 'quotation-flow-001',
            name: '报价单审批流',
            code: 'QUOTATION_APPROVAL',
            businessType: 'quotation',
            description: '报价单三级审批：销售经理 -> 财务 -> 实验室负责人',
            nodes: JSON.stringify([
                { step: 1, name: '销售经理审批', type: 'role', targetId: 'sales_manager', targetName: '销售经理' },
                { step: 2, name: '财务审批', type: 'role', targetId: 'finance', targetName: '财务' },
                { step: 3, name: '实验室负责人审批', type: 'role', targetId: 'lab_director', targetName: '实验室负责人' },
            ]),
            status: true,
        },
    })
    console.log('✅ 报价单审批流配置已初始化:', flow.code)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
