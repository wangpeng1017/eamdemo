/**
 * @file approval-permission.ts
 * @desc 审批权限检查工具 - 统一的前后端权限过滤逻辑
 * @security CRITICAL - 必须前后端保持一致的权限检查逻辑
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

/**
 * 审批节点配置
 */
interface ApprovalNode {
  step: number
  order?: number
  name: string
  type: 'role' | 'user' | 'department'
  targetId: string
  targetName: string
}

/**
 * 审批实例（简化版）
 */
interface ApprovalInstance {
  id: string
  bizType: string
  bizId: string
  flowCode: string
  currentStep: number
  status: string
  submittedAt: string
  submitterId?: string
}

/**
 * 用户信息
 */
interface User {
  id: string
  username: string
  roles: Array<{ role: { code: string } }>
  deptId?: string | null
}

/**
 * 检查用户是否可以查看某个审批实例
 *
 * 规则：
 * 1. 管理员可以看到所有审批
 * 2. 提交人可以看到自己提交的审批
 * 3. 只有当前步骤的审批人可以看到待审批的单据
 *
 * @param instance 审批实例
 * @param user 当前用户
 * @param flowNodes 审批流程节点
 * @returns 是否有权限查看
 */
export function canViewApproval(
  instance: ApprovalInstance,
  user: User,
  flowNodes?: ApprovalNode[]
): boolean {
  // 管理员可以看到所有审批
  const userRoleCodes = user.roles.map(r => r.role.code)
  if (userRoleCodes.includes('admin')) {
    return true
  }

  // 提交人可以看到自己提交的审批
  //（但在待审批列表中，应该只显示可以审批的）

  // 对于待审批的实例，必须检查是否是当前步骤的审批人
  if (instance.status === 'pending' && flowNodes) {
    const currentNode = flowNodes.find(n => n.step === instance.currentStep)
    if (!currentNode) {
      return false
    }

    return hasApprovalPermission(currentNode, user)
  }

  // 已完成/已驳回/已撤回的审批
  // 1. 提交人可以看到自己提交的审批
  if ((instance as any).submitterId === user.id) {
    return true
  }

  // 2. 审批流中任一节点的角色匹配当前用户，说明用户是潜在审批人
  if (flowNodes && flowNodes.length > 0) {
    const isApprover = flowNodes.some(node => hasApprovalPermission(node, user))
    if (isApprover) {
      return true
    }
  }

  return false
}

/**
 * 检查用户是否有某个审批节点的审批权限
 *
 * @param node 审批节点
 * @param user 用户
 * @returns 是否有审批权限
 */
export function hasApprovalPermission(node: ApprovalNode, user: User): boolean {
  const userRoleCodes = user.roles.map(r => r.role.code)

  // 管理员角色豁免（基于角色而非用户名，并记录审计日志）
  if (userRoleCodes.includes('admin')) {
    logger.info('审批权限: 管理员角色覆盖', {
      userId: user.id,
      data: { step: node.step, nodeType: node.type, targetId: node.targetId }
    })
    return true
  }

  // 根据节点类型检查权限
  switch (node.type) {
    case 'role':
      // 角色审批：用户必须拥有指定角色
      return userRoleCodes.includes(node.targetId)

    case 'user':
      // 指定用户审批：用户必须是指定用户
      return user.id === node.targetId

    case 'department':
      // 部门负责人审批：用户必须在指定部门且有管理角色
      if (user.deptId !== node.targetId) {
        return false
      }
      const managerRoles = ['admin', 'manager', 'dept_manager', 'sales_manager', 'lab_director']
      return userRoleCodes.some(code => managerRoles.includes(code))

    default:
      return false
  }
}

/**
 * 后端：过滤用户可以查看的审批实例列表
 *
 * @param instances 所有审批实例
 * @param user 当前用户
 * @param flowNodesMap 审批流程节点映射
 * @returns 过滤后的审批实例
 */
export async function filterViewableApprovals(
  instances: ApprovalInstance[],
  user: User,
  flowNodesMap?: Record<string, ApprovalNode[]>
): Promise<ApprovalInstance[]> {
  // 如果没有提供流程节点映射，查询所有相关的流程
  if (!flowNodesMap) {
    const flowCodes = [...new Set(instances.map(i => i.flowCode))]

    const flows = await prisma.approvalFlow.findMany({
      where: { code: { in: flowCodes } },
      select: { code: true, nodes: true }
    })

    const map: Record<string, ApprovalNode[]> = {}
    flows.forEach(flow => {
      try {
        const nodes = JSON.parse(flow.nodes)
        map[flow.code] = nodes.map((n: any) => ({
          ...n,
          step: n.step || n.order || 0
        }))
      } catch (e) {
        logger.error('解析审批流节点失败', { data: { flowCode: flow.code, error: String(e) } })
        map[flow.code] = []
      }
    })
    flowNodesMap = map
  }

  // 过滤用户可以查看的审批
  return instances.filter(instance => {
    // 查找流程节点，支持大小写匹配
    let nodes = flowNodesMap![instance.flowCode];
    if (!nodes) {
      nodes = flowNodesMap![instance.flowCode.toUpperCase()];
    }
    if (!nodes) {
      nodes = flowNodesMap![instance.flowCode.toLowerCase()];
    }

    return canViewApproval(instance, user, nodes);
  })
}

/**
 * 前端：从用户角色中提取角色代码列表
 */
export function extractUserRoleCodes(user: { roles?: Array<{ role: { code: string } }> }): string[] {
  if (!user?.roles) return []
  return user.roles.map(r => r.role.code)
}
