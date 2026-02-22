/**
 * @file 记录级操作权限判断
 * @desc 根据数据归属关系判断当前用户对记录的操作权限
 *
 * 规则：
 * - 编辑/删除（canModify）：仅创建人 + 管理员（dataScope=all）
 * - 业务流转（canOperate）：创建人 + 跟单人 + 管理员
 * - 查看：所有可见用户始终可查看
 */

export interface RecordPermissionContext {
    userId: string
    dataScope: string // 'all' | 'dept' | 'self'
}

/**
 * 判断是否可编辑/删除（创建人 or 管理员）
 */
export function canModify(
    record: { createdById?: string | null },
    ctx: RecordPermissionContext
): boolean {
    if (!ctx.userId) return false
    // 管理员（全局数据权限）可操作所有记录
    if (ctx.dataScope === 'all') return true
    // 创建人可操作
    return record.createdById === ctx.userId
}

/**
 * 判断是否可执行业务流转操作（创建人 or 跟单人 or 管理员）
 */
export function canOperate(
    record: { createdById?: string | null; followerId?: string | null },
    ctx: RecordPermissionContext
): boolean {
    if (!ctx.userId) return false
    // 管理员可操作
    if (ctx.dataScope === 'all') return true
    // 创建人可操作
    if (record.createdById === ctx.userId) return true
    // 跟单人可操作
    if (record.followerId && record.followerId === ctx.userId) return true
    return false
}
