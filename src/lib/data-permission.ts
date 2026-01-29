import { auth } from '@/lib/auth'
import { logger } from '@/lib/logger'

/**
 * 获取基于角色的数据过滤条件
 * 优先级: All > Dept > Self
 *
 * 使用方法:
 * const filter = await getDataFilter()
 * const list = await prisma.tableName.findMany({
 *   where: { ...otherConditions, ...filter }
 * })
 */
export async function getDataFilter(userId?: string) {
    try {
        const session = await auth()

        // 未登录用户应该在前端被拦截，这里作为双重保险
        if (!session?.user?.id) {
            logger.warn('getDataFilter: 未登录用户尝试访问数据', { userId })
            // 返回一个永远匹配不到的条件，而不是返回空对象
            return { id: 'never-match-unknown-user' }
        }

        const user = session.user
        const permissions = user.roles || []

        // auth.ts 默认只注入了 roles (code)，我们需要 user 的完整 role dataScope 信息
        // 由于 next-auth session 中默认不包含 dataScope，我们需要查询数据库
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

        if (!userWithRoles) {
            logger.error('getDataFilter: 用户不存在于数据库', { userId: user.id })
            // 返回一个永远匹配不到的条件
            return { id: 'never-match-user-not-found' }
        }

        let hasAll = false
        let hasDept = false

        userWithRoles.roles.forEach((ur: { role: { dataScope: string } }) => {
            const scope = ur.role.dataScope
            if (scope === 'all') hasAll = true
            if (scope === 'dept') hasDept = true
        })

        // 1. 全部数据权限
        if (hasAll) {
            logger.info('getDataFilter: 用户拥有全部数据权限', { userId: user.id })
            return {} // 无过滤条件，返回所有数据
        }

        // 2. 部门数据权限
        if (hasDept && userWithRoles.deptId) {
            // 查询本部门所有用户ID
            const deptUserIds = await prisma.user.findMany({
                where: { deptId: userWithRoles.deptId },
                select: { id: true }
            }).then(users => users.map(u => u.id))

            logger.info('getDataFilter: 用户拥有部门数据权限', {
                userId: user.id,
                data: { deptId: userWithRoles.deptId, deptUserCount: deptUserIds.length }
            })

            // 包含本部门所有用户创建的数据
            return {
                createdById: { in: deptUserIds }
            }
        }

        // 3. 仅本人数据权限 (默认)
        logger.info('getDataFilter: 用户仅拥有本人数据权限', { userId: user.id })
        return {
            createdById: user.id
        }
    } catch (error) {
        logger.error('getDataFilter: 查询数据权限时发生错误', {
            userId,
            error: error instanceof Error ? error.message : String(error)
        })
        // 发生错误时返回一个永远匹配不到的条件，确保数据安全
        return { id: 'never-match-error' }
    }
}
