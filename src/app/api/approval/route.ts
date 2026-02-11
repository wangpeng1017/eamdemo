/**
 * @file route.ts
 * @desc 统一审批 API - 提交审批、查询列表
 * @method POST, GET
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { approvalEngine } from '@/lib/approval/engine'
import { withErrorHandler, success, validateRequired } from '@/lib/api-handler'
import { withAuth } from '@/lib/api-handler'
import { auth } from '@/lib/auth'
import { filterViewableApprovals } from '@/lib/approval/permission'

/**
 * 查询审批实例列表
 * GET /api/approval
 *
 * @query status - 审批状态 (pending/approved/rejected/cancelled)
 * @query submitterId - 提交人ID
 * @query bizType - 业务类型 (quotation/contract/client)
 *
 * @security 权限过滤：只返回用户有权限查看的审批实例
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const submitterId = searchParams.get('submitterId')
  const bizType = searchParams.get('bizType')

  const where: any = {}

  if (status) {
    where.status = status
  }

  if (submitterId) {
    where.submitterId = submitterId
  }

  if (bizType) {
    where.bizType = bizType
  }

  // 查询审批实例
  const instances = await prisma.approvalInstance.findMany({
    where,
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
      testReport: {
        select: {
          reportNo: true,
          projectName: true,
          clientName: true,
        }
      },
      inspectionItem: {
        select: {
          name: true,
          executionStandard: true,
          approvalStatus: true,
        }
      }

    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // 🔒 关键安全修复：过滤用户有权限查看的审批实例
  const userWithRoles = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      roles: {
        include: {
          role: true
        }
      }
    }
  })

  if (!userWithRoles) {
    return success([])
  }

  // 🔍 调试日志
  const userRoleCodes = userWithRoles.roles.map(r => r.role.code)
  console.log('[DEBUG] 审批权限检查 - 用户:', (user as any).username, '角色:', userRoleCodes)
  console.log('[DEBUG] 审批权限检查 - 过滤前实例数:', instances.length)


  const filteredInstances = await filterViewableApprovals(instances as any, userWithRoles)


  console.log('[DEBUG] 审批权限检查 - 过滤后实例数:', filteredInstances.length)
  if (filteredInstances.length < instances.length) {
    console.log('[DEBUG] 审批权限检查 - 已过滤的实例:', instances.length - filteredInstances.length, '条')
  }

  return success(filteredInstances)
})

/**
 * 提交审批
 * POST /api/approval
 *
 * @body {
 *   bizType: string      // 业务类型 (quotation/contract/client)
 *   bizId: string        // 业务ID
 *   flowCode: string     // 流程编码
 *   submitterId: string  // 提交人ID
 *   submitterName: string // 提交人姓名
 * }
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const data = await request.json()

  validateRequired(data, ['bizType', 'bizId', 'flowCode', 'submitterId', 'submitterName'])

  const instance = await approvalEngine.submit({
    bizType: data.bizType,
    bizId: data.bizId,
    flowCode: data.flowCode,
    submitterId: data.submitterId,
    submitterName: data.submitterName,
  })

  return success(instance)
})
