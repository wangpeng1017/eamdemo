/**
 * @file engine.ts
 * @desc 统一审批流引擎 - 核心审批逻辑
 * @input: 审批参数（业务类型、业务ID、操作人等）
 * @output: 审批实例、审批记录
 * @pos: 审批流系统的核心引擎
 */

import { prisma } from '@/lib/prisma'
import type {
  ApprovalInstance,
  ApprovalNode,
  SubmitApprovalParams,
  ApproveParams,
  CancelApprovalParams,
} from './types'

/**
 * 审批引擎类
 */
export class ApprovalEngine {
  /**
   * 提交审批
   */
  async submit(params: SubmitApprovalParams): Promise<ApprovalInstance> {
    const { bizType, bizId, flowCode, submitterId, submitterName } = params

    // 1. 获取审批流程配置
    const flow = await this.getFlowConfig(flowCode)
    if (!flow) {
      throw new Error(`审批流程不存在: ${flowCode}`)
    }

    if (!flow.status) {
      throw new Error(`审批流程未启用: ${flowCode}`)
    }

    // 2. 解析审批节点
    const nodes = this.parseNodes(flow)
    if (nodes.length === 0) {
      throw new Error(`审批流程没有配置节点: ${flowCode}`)
    }

    // 3. 检查是否已有审批实例
    const existing = await prisma.approvalInstance.findUnique({
      where: { bizType_bizId: { bizType, bizId } },
    })

    if (existing) {
      // 如果已存在且状态为 pending，允许重新提交（先删除旧的）
      if (existing.status === 'pending') {
        // 删除旧的审批实例及相关记录
        await prisma.approvalRecord.deleteMany({ where: { instanceId: existing.id } })
        await prisma.approvalInstance.delete({ where: { id: existing.id } })
      } else {
        throw new Error(`该业务审批已结束,状态: ${existing.status}`)
      }
    }

    // 4. 创建审批实例
    const instance = await prisma.approvalInstance.create({
      data: {
        bizType,
        bizId,
        flowCode,
        currentStep: 1,
        status: 'pending',
        submitterId,
        submitterName,
        submittedAt: new Date(),
      },
    })

    // 5. 异步记录提交日志 (Fire-and-forget)
    // 不阻塞主流程，即使日志记录失败也可以继续
    Promise.resolve().then(async () => {
      try {
        // 尝试验证 operatorId
        let validOperatorId: string | undefined = undefined
        if (submitterId) {
          const user = await prisma.user.findUnique({ where: { id: submitterId } })
          if (user) validOperatorId = submitterId
        }

        if (validOperatorId) {
          await prisma.approvalLog.create({
            data: {
              bizType,
              bizId,
              action: 'submit',
              operatorId: validOperatorId,
            },
          })
        } else {
          console.warn(`[ApprovalEngine] Skipping log: Invalid operatorId '${submitterId}' for biz ${bizType}:${bizId}`)
        }
      } catch (logError) {
        console.error('[ApprovalEngine] Failed to create approval log asynchronously:', logError)
        // 这里可以接入 Sentry 或其他监控系统
      }
    })

    // 6. 更新业务表状态(冗余字段)
    await this.updateBizStatus({
      bizType,
      bizId,
      approvalStatus: 'pending',
      approvalStep: 1,
      instanceId: instance.id,
    })

    return instance as ApprovalInstance
  }

  /**
   * 审批操作（通过/驳回）
   */
  async approve(params: ApproveParams): Promise<void> {
    const { instanceId, action, approverId, approverName, comment } = params

    // 1. 获取审批实例
    const instance = await prisma.approvalInstance.findUnique({
      where: { id: instanceId },
      include: { records: true },
    })

    if (!instance) {
      throw new Error('审批实例不存在')
    }

    if (instance.status !== 'pending') {
      throw new Error(`当前状态不允许审批: ${instance.status}`)
    }

    // 2. 获取审批流程配置
    const flow = await this.getFlowConfig(instance.flowCode)
    if (!flow) {
      throw new Error(`审批流程不存在: ${instance.flowCode}`)
    }

    const nodes = this.parseNodes(flow)
    const currentNode = nodes.find(n => n.step === instance.currentStep)

    if (!currentNode) {
      throw new Error('当前审批节点配置错误')
    }

    // 3. 检查审批权限
    const canApprove = await this.checkApprovalPermission(currentNode, approverId)
    if (!canApprove) {
      throw new Error('您没有审批权限')
    }

    // 4. 创建审批记录
    await prisma.approvalRecord.create({
      data: {
        instanceId,
        step: instance.currentStep,
        nodeType: currentNode.type,
        targetType: currentNode.targetId,
        targetName: currentNode.targetName,
        approverId,
        approverName,
        action,
        comment,
        actedAt: new Date(),
      },
    })

    // 5. 更新审批实例状态
    let newStatus = instance.status
    let newStep = instance.currentStep

    if (action === 'reject') {
      // 驳回: 直接结束
      newStatus = 'rejected'
    } else {
      // 通过: 检查是否还有下一步
      const nextNode = nodes.find(n => n.step === instance.currentStep + 1)
      if (nextNode) {
        // 还有下一步
        newStep = instance.currentStep + 1
      } else {
        // 最后一步,审批完成
        newStatus = 'approved'
      }
    }

    await prisma.approvalInstance.update({
      where: { id: instanceId },
      data: {
        status: newStatus,
        currentStep: newStep,
        completedAt: newStatus !== 'pending' ? new Date() : null,
      },
    })

    // 6. 异步记录审批日志 (Fire-and-forget)
    Promise.resolve().then(async () => {
      try {
        if (approverId) {
          const user = await prisma.user.findUnique({ where: { id: approverId } })
          if (user) {
            await prisma.approvalLog.create({
              data: {
                bizType: instance.bizType,
                bizId: instance.bizId,
                action,
                comment,
                operatorId: approverId,
              },
            })
          } else {
            console.warn(`[ApprovalEngine] Skipping log: Invalid approverId '${approverId}'`)
          }
        }
      } catch (logError) {
        console.error('[ApprovalEngine] Failed to create approval log asynchronously:', logError)
      }
    })

    // 7. 更新业务表状态
    await this.updateBizStatus({
      bizType: instance.bizType,
      bizId: instance.bizId,
      approvalStatus: newStatus,
      approvalStep: newStep,
    })
  }

  /**
   * 撤回审批
   */
  async cancel(params: CancelApprovalParams): Promise<void> {
    const { instanceId, operatorId } = params

    const instance = await prisma.approvalInstance.findUnique({
      where: { id: instanceId },
    })

    if (!instance) {
      throw new Error('审批实例不存在')
    }

    if (instance.status !== 'pending') {
      throw new Error('只有审批中才能撤回')
    }

    if (instance.submitterId !== operatorId) {
      throw new Error('只有提交人才能撤回')
    }

    await prisma.approvalInstance.update({
      where: { id: instanceId },
      data: { status: 'cancelled' },
    })

    // 异步记录日志
    Promise.resolve().then(async () => {
      try {
        if (operatorId) {
          const user = await prisma.user.findUnique({ where: { id: operatorId } })
          if (user) {
            await prisma.approvalLog.create({
              data: {
                bizType: instance.bizType,
                bizId: instance.bizId,
                action: 'cancel',
                operatorId: operatorId,
              },
            })
          }
        }
      } catch (logError) {
        console.error('[ApprovalEngine] Failed to create cancel log asynchronously:', logError)
      }
    })

    // 更新业务表
    await this.updateBizStatus({
      bizType: instance.bizType,
      bizId: instance.bizId,
      approvalStatus: 'cancelled',
      approvalStep: instance.currentStep,
    })
  }

  /**
   * 获取审批流程配置
   */
  async getFlowConfig(flowCode: string) {
    return prisma.approvalFlow.findUnique({
      where: { code: flowCode },
    })
  }

  /**
   * 解析审批节点
   */
  parseNodes(flow: { nodes: string | object }): ApprovalNode[] {
    try {
      // Handle both string (needs parsing) and already-parsed array
      if (typeof flow.nodes === 'string') {
        return JSON.parse(flow.nodes)
      }
      if (Array.isArray(flow.nodes)) {
        return flow.nodes
      }
      return []
    } catch {
      return []
    }
  }

  /**
   * 更新业务表状态
   */
  async updateBizStatus(params: {
    bizType: string
    bizId: string
    approvalStatus: string
    approvalStep: number
    instanceId?: string
  }): Promise<void> {
    const { bizType, bizId, approvalStatus, approvalStep, instanceId } = params

    // 根据业务类型更新对应表
    const updateData: any = {
      approvalStatus,
      approvalStep,
    }

    if (instanceId) {
      updateData.approvalInstanceId = instanceId
    }

    switch (bizType) {
      case 'quotation':
        // 同步更新旧的 status 字段,确保前端显示正确
        if (approvalStatus === 'pending') {
          // 根据当前步骤设置对应的待审批状态
          if (approvalStep === 1) {
            updateData.status = 'pending_sales'
          } else if (approvalStep === 2) {
            updateData.status = 'pending_finance'
          } else if (approvalStep === 3) {
            updateData.status = 'pending_lab'
          }
        } else if (approvalStatus === 'approved') {
          updateData.status = 'approved'
        } else if (approvalStatus === 'rejected') {
          updateData.status = 'rejected'
        } else if (approvalStatus === 'cancelled') {
          updateData.status = 'draft'
        }

        await prisma.quotation.update({
          where: { id: bizId },
          data: updateData,
        })
        break
      case 'contract':
        await prisma.contract.update({
          where: { id: bizId },
          data: updateData,
        })
        break
      case 'client':
        await prisma.client.update({
          where: { id: bizId },
          data: updateData,
        })
        break
      default:
        throw new Error(`不支持的业务类型: ${bizType}`)
    }
  }

  /**
   * 检查审批权限
   * 根据当前审批节点配置和用户角色判断是否有权限审批
   */
  async checkApprovalPermission(
    currentNode: ApprovalNode,
    userId: string
  ): Promise<boolean> {
    // 获取用户及其角色信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    })

    if (!user) {
      return false
    }

    // 获取用户的角色代码列表
    const userRoleCodes = user.roles.map((ur: { role: { code: string } }) => ur.role.code)

    // 根据节点类型检查权限
    switch (currentNode.type) {
      case 'role':
        // 角色审批：检查用户是否拥有指定角色
        return userRoleCodes.includes(currentNode.targetId)

      case 'user':
        // 指定用户审批：检查是否是指定用户
        return userId === currentNode.targetId

      case 'department':
        // 部门负责人审批：检查用户是否是指定部门的负责人
        // 简化实现：检查用户是否属于该部门且有管理角色
        if (user.deptId === currentNode.targetId) {
          // 检查是否有管理角色（如 admin, manager 等）
          const managerRoles = ['admin', 'manager', 'dept_manager', 'sales_manager', 'lab_director']
          return userRoleCodes.some(code => managerRoles.includes(code))
        }
        return false

      default:
        // 未知类型，默认拒绝
        return false
    }
  }
}

// 导出单例
export const approvalEngine = new ApprovalEngine()
