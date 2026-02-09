/**
 * 角色数据清理脚本
 * 
 * 合并重复角色，迁移用户关系，删除空重复角色
 * 使用方式：node scripts/cleanup-roles.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// 需要合并的角色组：[保留code, 删除code]
const MERGE_GROUPS = [
    { keepCode: 'sales_manager', deleteCode: 'BUSINESS_MANAGER', name: '业务经理' },
    { keepCode: 'MATERIAL_TEST_LEAD', deleteCode: 'MATERIAL_TEST_MANAGER', name: '材料检测负责人' },
    { keepCode: 'PRODUCT_TEST_LEAD', deleteCode: 'PRODUCT_TEST_MANAGER', name: '产品检测负责人' },
    { keepCode: 'CHEM_GROUP_LEAD', deleteCode: 'CHEMICAL_TEAM_LEADER', name: '化学组组长' },
]

async function cleanup() {
    console.log('🧹 开始角色数据清理...\n')

    for (const group of MERGE_GROUPS) {
        console.log(`📋 处理：${group.name}`)

        const keepRole = await prisma.role.findUnique({
            where: { code: group.keepCode },
            include: { users: { include: { user: { select: { name: true } } } } }
        })
        const deleteRole = await prisma.role.findUnique({
            where: { code: group.deleteCode },
            include: { users: { include: { user: { select: { name: true } } } } }
        })

        if (!keepRole) {
            console.log(`  ⚠️ 保留角色 ${group.keepCode} 不存在，跳过`)
            continue
        }
        if (!deleteRole) {
            console.log(`  ⚠️ 删除角色 ${group.deleteCode} 不存在，跳过`)
            continue
        }

        console.log(`  保留: ${group.keepCode} (${keepRole.users.map(u => u.user.name).join(', ') || '无用户'})`)
        console.log(`  删除: ${group.deleteCode} (${deleteRole.users.map(u => u.user.name).join(', ') || '无用户'})`)

        // 迁移用户：将删除角色的用户转移到保留角色
        for (const userRole of deleteRole.users) {
            // 检查是否已在保留角色中
            const existing = await prisma.userRole.findUnique({
                where: { userId_roleId: { userId: userRole.userId, roleId: keepRole.id } }
            })
            if (existing) {
                console.log(`  ⏭ ${userRole.user.name} 已在保留角色中`)
            } else {
                await prisma.userRole.create({
                    data: { userId: userRole.userId, roleId: keepRole.id }
                })
                console.log(`  ✅ 迁移用户 ${userRole.user.name} → ${group.keepCode}`)
            }
        }

        // 删除重复角色（级联删除 UserRole 和 RolePermission）
        await prisma.userRole.deleteMany({ where: { roleId: deleteRole.id } })
        await prisma.rolePermission.deleteMany({ where: { roleId: deleteRole.id } })
        await prisma.role.delete({ where: { id: deleteRole.id } })
        console.log(`  🗑️ 已删除角色 ${group.deleteCode}\n`)
    }

    // 最终状态
    const roles = await prisma.role.findMany({
        include: { users: { include: { user: { select: { name: true } } } } },
        orderBy: { createdAt: 'asc' }
    })
    console.log('='.repeat(50))
    console.log('✅ 清理完成！当前角色列表：')
    roles.forEach(r => {
        const users = r.users.map(u => u.user.name).join(', ') || '—'
        console.log(`  ${r.name} (${r.code}): ${users}`)
    })
    console.log(`  共 ${roles.length} 个角色`)
    console.log('='.repeat(50))

    await prisma.$disconnect()
}

cleanup().catch(err => {
    console.error('❌ 清理失败:', err)
    prisma.$disconnect()
    process.exit(1)
})
