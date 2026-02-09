/**
 * 角色清理 + 默认权限初始化脚本
 * 
 * 1. 删除没有用户的空角色
 * 2. 管理员角色分配全部权限
 * 3. 其他角色只分配"工作台"权限
 *
 * 使用方式：node scripts/init-role-permissions.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log('🧹 第一步：清理没有用户的空角色\n')

    const allRoles = await prisma.role.findMany({
        include: { _count: { select: { users: true } } }
    })

    for (const role of allRoles) {
        if (role._count.users === 0) {
            // 删除关联的权限记录
            await prisma.rolePermission.deleteMany({ where: { roleId: role.id } })
            await prisma.role.delete({ where: { id: role.id } })
            console.log(`  🗑️ 删除空角色: ${role.name} (${role.code})`)
        } else {
            console.log(`  ✅ 保留: ${role.name} (${role.code}) - ${role._count.users} 个用户`)
        }
    }

    console.log('\n🔐 第二步：初始化默认权限\n')

    // 获取所有权限
    const allPermissions = await prisma.permission.findMany()
    const dashboardPerm = allPermissions.find(p => p.code === 'menu:dashboard')

    if (!dashboardPerm) {
        console.log('  ⚠️ 未找到 menu:dashboard 权限，跳过')
        await prisma.$disconnect()
        return
    }

    // 获取清理后的角色
    const remainingRoles = await prisma.role.findMany()

    for (const role of remainingRoles) {
        // 先清空现有权限
        await prisma.rolePermission.deleteMany({ where: { roleId: role.id } })

        if (role.code === 'admin') {
            // 管理员：分配全部权限
            const records = allPermissions.map(p => ({
                roleId: role.id,
                permissionId: p.id,
            }))
            await prisma.rolePermission.createMany({ data: records })
            console.log(`  ✅ ${role.name}: 分配全部 ${allPermissions.length} 个权限`)
        } else {
            // 其他角色：只分配工作台
            await prisma.rolePermission.create({
                data: { roleId: role.id, permissionId: dashboardPerm.id }
            })
            console.log(`  ✅ ${role.name}: 分配工作台权限`)
        }
    }

    // 最终汇总
    console.log('\n' + '='.repeat(50))
    console.log('✅ 完成！')
    const finalRoles = await prisma.role.findMany({
        include: {
            _count: { select: { users: true, permissions: true } }
        }
    })
    finalRoles.forEach(r => {
        console.log(`  ${r.name} (${r.code}): ${r._count.users} 用户, ${r._count.permissions} 权限`)
    })
    console.log('='.repeat(50))

    await prisma.$disconnect()
}

main().catch(err => {
    console.error('❌ 失败:', err)
    prisma.$disconnect()
    process.exit(1)
})
