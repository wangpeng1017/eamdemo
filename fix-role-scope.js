const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // 将所有审批相关角色的 dataScope 设为 all（确保审批人能看到待审批数据）
    const result = await prisma.role.updateMany({
        where: { code: { in: ['admin', 'sales_manager', 'finance', 'lab_director'] } },
        data: { dataScope: 'all' }
    });
    console.log('Updated approver roles to "all":', result.count);

    // 验证
    const roles = await prisma.role.findMany({ select: { name: true, code: true, dataScope: true } });
    console.log('Current roles:', JSON.stringify(roles, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
