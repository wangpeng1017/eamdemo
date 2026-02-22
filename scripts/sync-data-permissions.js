/**
 * 数据权限同步脚本
 * 
 * 每次部署时执行，确保角色的 dataScope 字段正确设置。
 * 规则：
 *   - ADMIN 角色 → dataScope = 'all'（全部数据权限）
 *   - TEST_DIRECTOR 角色 → dataScope = 'all'（检测部主任可查看全部数据）
 *   - 其他角色 → dataScope = 'self'（仅本人数据）
 * 
 * 使用方式：node scripts/sync-data-permissions.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// 定义角色数据权限映射
// all = 可以看到所有数据
// dept = 可以看到本部门的数据
// self = 只能看到自己的数据
const ROLE_DATA_SCOPE = {
    'ADMIN': 'all',           // 系统管理员：全部数据权限
    'admin': 'all',           // 系统管理员（兼容小写 code）
    'TEST_DIRECTOR': 'all',   // 检测部主任（秦兴国）：全部数据权限
    // 以下角色默认 self，可按需调整
    // 'BUSINESS_MANAGER': 'dept',  // 业务经理：本部门数据（如需开启取消注释）
    // 'QUALITY_MANAGER': 'dept',   // 质量负责人：本部门数据
}

async function syncDataPermissions() {
    console.log('🔐 开始同步数据权限...\n')

    const allRoles = await prisma.role.findMany()
    let updatedCount = 0

    for (const role of allRoles) {
        const targetScope = ROLE_DATA_SCOPE[role.code] || 'self'

        if (role.dataScope !== targetScope) {
            await prisma.role.update({
                where: { id: role.id },
                data: { dataScope: targetScope }
            })
            console.log(`  ✅ ${role.name} (${role.code}): ${role.dataScope} → ${targetScope}`)
            updatedCount++
        } else {
            console.log(`  ⏭️ ${role.name} (${role.code}): 已是 ${targetScope}，无需更新`)
        }
    }

    console.log()
    console.log('='.repeat(50))
    console.log(`🔐 数据权限同步完成！`)
    console.log(`  总角色: ${allRoles.length}`)
    console.log(`  已更新: ${updatedCount}`)
    console.log('='.repeat(50))

    await prisma.$disconnect()
}

syncDataPermissions().catch(err => {
    console.error('❌ 数据权限同步失败:', err)
    prisma.$disconnect()
    process.exit(1)
})
