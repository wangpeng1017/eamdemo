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
      throw new Error(`该业务已在审批中,状态: ${existing.status}`)
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

    // 5. 记录提交日志
    await prisma.approvalLog.create({
      data: {
        bizType,
        bizId,
        action: 'submit',
        operatorId: submitterId,
      },
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

    // 3. 检查审批权限（简化版，实际需结合用户角色系统）
    // const canApprove = await this.checkApprovalPermission(instance, approverId)
    // if (!canApprove) {
    //   throw new Error('您没有审批权限')
    // }

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

    // 6. 记录审批日志
    await prisma.approvalLog.create({
      data: {
        bizType: instance.bizType,
        bizId: instance.bizId,
        action,
        comment,
        operatorId: approverId,
      },
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

    // 更新业务表
    await this.updateBizStatus({
      bizType: instance.bizType,
      bizId: instance.bizId,
      approvalStatus: 'cancelled',
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
  parseNodes(flow: { nodes: string }): ApprovalNode[] {
    try {
      return JSON.parse(flow.nodes)
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
   * 检查审批权限（简化版，实际需结合用户角色系统）
   */
  async checkApprovalPermission(
    instance: ApprovalInstance,
    userId: string
  ): Promise<boolean> {
    // TODO: 根据用户角色/部门判断权限
    // 1. 获取当前审批节点
    // 2. 获取用户角色
    // 3. 判断是否匹配
    return true
  }
}

// 导出单例
export const approvalEngine = new ApprovalEngine()
