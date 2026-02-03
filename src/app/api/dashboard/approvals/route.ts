/**
 * @file route.ts
 * @desc 工作台待审批列表API
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { withErrorHandler, success, unauthorized } from '@/lib/api-handler'
import { filterViewableApprovals } from '@/lib/approval/permission'

/**
 * 获取当前用户待审批的单据列表
 * GET /api/dashboard/approvals
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
    const session = await auth()

    if (!session?.user?.id) {
        return unauthorized()
    }

    const userId = session.user.id
    const userRoles = session.user.roles || []

    // 获取所有pending状态的审批实例
    const pendingInstances = await prisma.approvalInstance.findMany({
        where: { status: 'pending' },
        include: {
            quotation: {
                select: {
                    quotationNo: true,
                    subtotal: true,
                    taxTotal: true,
                },
            },
            contract: {
                select: {
                    contractNo: true,
                    contractAmount: true,
                },
            },
            client: {
                select: {
                    name: true,
                    shortName: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
    })

    // 1. 获取完整用户信息（包含角色）
    // 注意：session 中的 user 可能不包含 roles 或 deptId，所以需要重新查询
    const userWithRoles = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            roles: {
                include: {
                    role: true
                }
            }
        }
    })

    if (!userWithRoles) {
        return success({ list: [], total: 0 })
    }

    // 2. 转换数据格式以匹配 ApprovalInstance 接口
    const instancesForCheck = pendingInstances.map(instance => ({
        ...instance,
        submittedAt: instance.submittedAt ? instance.submittedAt.toISOString() : '',
    }))

    // 3. 使用统一的权限过滤逻辑
    const filteredInstances = await filterViewableApprovals(instancesForCheck, userWithRoles)

    // 4. 还原原始数据对象（因为 filterViewableApprovals 返回的是精简版接口）
    // 这里我们只需要过滤后的 ID 列表
    const filteredIds = filteredInstances.map(i => i.id)
    const finalResult = pendingInstances.filter(i => filteredIds.includes(i.id))

    return success({
        list: finalResult,
        total: finalResult.length,
    })


})
