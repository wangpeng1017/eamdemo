const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const count = await prisma.role.count();
    console.log('Current roles count:', count);

    if (count === 0) {
        console.log('Inserting initial roles...');
        await prisma.role.createMany({
            data: [
                { name: '管理员', code: 'admin', description: '系统管理员，拥有所有权限', dataScope: 'all' },
                { name: '销售经理', code: 'sales_manager', description: '销售部门经理', dataScope: 'dept' },
                { name: '销售人员', code: 'sales', description: '销售部门员工', dataScope: 'self' },
                { name: '实验室负责人', code: 'lab_director', description: '检测实验室负责人', dataScope: 'dept' },
                { name: '检测人员', code: 'tester', description: '检测实验室员工', dataScope: 'self' },
                { name: '财务人员', code: 'finance', description: '财务部门员工', dataScope: 'dept' },
                { name: '样品管理员', code: 'sample_admin', description: '样品库管理员', dataScope: 'self' },
            ]
        });
        console.log('Roles inserted successfully');
    } else {
        console.log('Roles already exist, skipping insert');
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
