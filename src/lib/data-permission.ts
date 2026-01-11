import { auth } from '@/lib/auth'

/**
 * 获取基于角色的数据过滤条件
 * 优先级: All > Dept > Self
 * 
 * 使用方法:
 * const filter = await getDataFilter(userId)
 * const list = await prisma.tableName.findMany({
 *   where: { ...otherConditions, ...filter }
 * })
 */
export async function getDataFilter(userId?: string) {
    const session = await auth()
    if (!session?.user) return { createdById: 'unknown' } // 兜底：未登录不可见任何数据

    const user = session.user
    const permissions = user.roles || [] // 注意：auth.ts 中 roles 是 Role.code 数组，但并未透传 dataScope

    // auth.ts 默认只注入了 roles (code)，我们需要 user 的完整 role dataScope 信息
    // 由于 next-auth session 中默认不包含 dataScope，我们需要查询数据库或修改 auth.ts
    // 考虑到性能，最好修改 auth.ts 注入 dataScope。但此处为了稳妥，先查询数据库。

    // 既然 auth() 无法直接获取 dataScope，我们先导入 prisma 查询
    const { prisma } = await import('@/lib/prisma')

    const userWithRoles = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
            deptId: true,
            roles: {
                select: {
                    role: {
                        select: {
                            dataScope: true
                        }
                    }
                }
            }
        }
    })

    if (!userWithRoles) return { createdById: 'unknown' }

    let hasAll = false
    let hasDept = false

    userWithRoles.roles.forEach((ur: { role: { dataScope: string } }) => {
        const scope = ur.role.dataScope
        if (scope === 'all') hasAll = true
        if (scope === 'dept') hasDept = true
    })

    // 1. 全部数据权限
    if (hasAll) {
        return {} // 无过滤条件
    }

    // 2. 部门数据权限
    if (hasDept && userWithRoles.deptId) {
        // 查询本部门所有用户ID
        // 简单实现：只查本部门，不递归子部门 (如需递归需配合 CTE 或 path 字段)
        const deptUserIds = await prisma.user.findMany({
            where: { deptId: userWithRoles.deptId },
            select: { id: true }
        }).then(users => users.map(u => u.id))

        // 包含自己
        return {
            createdById: { in: deptUserIds }
        }
    }

    // 3. 仅本人数据权限 (默认)
    return {
        createdById: user.id
    }
}
