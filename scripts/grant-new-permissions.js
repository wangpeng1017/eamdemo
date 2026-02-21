/**
 * 给所有角色分配新增菜单权限
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function grantPermissions() {
    const newCodes = [
        'menu:consumable', 'menu:consumable:info', 'menu:consumable:transaction',
        'menu:system-document'
    ];

    const newPerms = await prisma.permission.findMany({
        where: { code: { in: newCodes } }
    });
    console.log('新权限:', newPerms.map(p => p.code + ' (' + p.id + ')'));

    const roles = await prisma.role.findMany();
    console.log('角色:', roles.map(r => r.name + ' (' + r.id + ')'));

    for (const role of roles) {
        for (const perm of newPerms) {
            const exists = await prisma.rolePermission.findFirst({
                where: { roleId: role.id, permissionId: perm.id }
            });
            if (!exists) {
                await prisma.rolePermission.create({
                    data: { roleId: role.id, permissionId: perm.id }
                });
                console.log('  ✅ 授权: ' + role.name + ' <- ' + perm.code);
            } else {
                console.log('  ⏭ 已有: ' + role.name + ' <- ' + perm.code);
            }
        }
    }
    console.log('✅ 完成');
    await prisma.$disconnect();
}

grantPermissions().catch(err => {
    console.error('失败:', err);
    prisma.$disconnect();
    process.exit(1);
});
