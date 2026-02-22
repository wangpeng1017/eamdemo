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

/**
 * 校验用户是否有权限访问指定咨询单
 * 允许条件：全部数据权限 / 部门数据权限（同部门）/ 创建人 / 跟单人
 */
export async function checkConsultationAccess(consultationId: string, userId: string): Promise<boolean> {
    try {
        const { prisma } = await import('@/lib/prisma')

        // 查询咨询单归属信息
        const consultation = await prisma.consultation.findUnique({
            where: { id: consultationId },
            select: { createdById: true, followerId: true }
        })

        if (!consultation) return false

        // 创建人或跟单人直接放行
        if (consultation.createdById === userId || (consultation.followerId != null && consultation.followerId === userId)) {
            return true
        }

        // 检查角色数据权限
        const userWithRoles = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                deptId: true,
                roles: { select: { role: { select: { dataScope: true } } } }
            }
        })

        if (!userWithRoles) return false

        let hasAll = false
        let hasDept = false
        userWithRoles.roles.forEach((ur: { role: { dataScope: string } }) => {
            if (ur.role.dataScope === 'all') hasAll = true
            if (ur.role.dataScope === 'dept') hasDept = true
        })

        if (hasAll) return true

        if (hasDept && userWithRoles.deptId && consultation.createdById) {
            // 检查咨询单创建人是否在同一部门
            const creator = await prisma.user.findUnique({
                where: { id: consultation.createdById },
                select: { deptId: true }
            })
            if (creator?.deptId === userWithRoles.deptId) return true
        }

        return false
    } catch (error) {
        logger.error('checkConsultationAccess: 校验权限时发生错误', {
            userId,
            error: error instanceof Error ? error.message : String(error),
            data: { consultationId }
        })
        return false
    }
}

/**
 * 校验用户是否为指定样品检测项的当前评估人
 */
export async function checkAssessmentItemAccess(sampleTestItemId: string, userId: string): Promise<boolean> {
    try {
        const { prisma } = await import('@/lib/prisma')
        const item = await prisma.sampleTestItem.findUnique({
            where: { id: sampleTestItemId },
            select: { currentAssessorId: true }
        })
        return item?.currentAssessorId === userId
    } catch (error) {
        logger.error('checkAssessmentItemAccess: 校验权限时发生错误', {
            userId,
            error: error instanceof Error ? error.message : String(error),
            data: { sampleTestItemId }
        })
        return false
    }
}

/**
 * 基于委托单链路的数据权限过滤
 * 用于没有 createdById 字段但有 entrustmentId 的业务模型
 * 返回 { entrustmentId: { in: [...] } } 或 {}（全部可见）
 *
 * @param userId 当前用户ID
 * @returns Prisma where 条件片段
 */
export async function getEntrustmentBasedFilter(userId: string): Promise<Record<string, unknown>> {
    try {
        const { prisma } = await import('@/lib/prisma')

        // 查询用户角色的数据范围
        const userWithRoles = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                deptId: true,
                roles: { select: { role: { select: { dataScope: true } } } }
            }
        })

        if (!userWithRoles) {
            return { entrustmentId: 'never-match-user-not-found' }
        }

        let hasAll = false
        let hasDept = false
        userWithRoles.roles.forEach((ur: { role: { dataScope: string } }) => {
            if (ur.role.dataScope === 'all') hasAll = true
            if (ur.role.dataScope === 'dept') hasDept = true
        })

        // 全部数据权限：不过滤
        if (hasAll) return {}

        // 部门数据权限：查同部门用户创建/跟单的委托单
        if (hasDept && userWithRoles.deptId) {
            const deptUserIds = await prisma.user.findMany({
                where: { deptId: userWithRoles.deptId },
                select: { id: true }
            }).then(users => users.map(u => u.id))

            const entrustmentIds = await prisma.entrustment.findMany({
                where: {
                    OR: [
                        { createdById: { in: deptUserIds } },
                        { followerId: { in: deptUserIds } },
                    ]
                },
                select: { id: true }
            }).then(list => list.map(e => e.id))

            return { entrustmentId: { in: entrustmentIds } }
        }

        // 仅本人数据权限：查本人创建/跟单的委托单
        const entrustmentIds = await prisma.entrustment.findMany({
            where: {
                OR: [
                    { createdById: userId },
                    { followerId: userId },
                ]
            },
            select: { id: true }
        }).then(list => list.map(e => e.id))

        return { entrustmentId: { in: entrustmentIds } }
    } catch (error) {
        logger.error('getEntrustmentBasedFilter: 查询权限时发生错误', {
            userId,
            error: error instanceof Error ? error.message : String(error)
        })
        return { entrustmentId: 'never-match-error' }
    }
}
