/**
 * @file route.ts
 * @desc 工作台待审批列表API
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { withErrorHandler, success, unauthorized } from '@/lib/api-handler'

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

    // 根据用户角色过滤待审批数据
    const myPendingApprovals = pendingInstances.filter((item) => {
        // 管理员可以看到所有
        if (userRoles.includes('admin')) return true

        // 根据当前审批步骤和用户角色匹配（兼容新旧角色）
        // 步骤1：业务经理审批
        if (item.currentStep === 1 && (
            userRoles.includes('sales_manager') ||
            userRoles.includes('BUSINESS_MANAGER') ||
            userRoles.includes('TEST_DIRECTOR')
        )) return true
        // 步骤2：财务审批
        if (item.currentStep === 2 && userRoles.includes('finance')) return true
        // 步骤3：实验室负责人审批
        if (item.currentStep === 3 && (
            userRoles.includes('lab_director') ||
            userRoles.includes('TEST_DIRECTOR') ||
            userRoles.includes('MATERIAL_TEST_MANAGER') ||
            userRoles.includes('PRODUCT_TEST_MANAGER')
        )) return true

        return false
    })

    return success({
        list: myPendingApprovals,
        total: myPendingApprovals.length,
    })
})
