/**
 * @file 业务单位审批功能测试
 * @desc TDD测试：验证业务单位审批流程
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { prisma } from '@/lib/prisma'
import {
  submitClientForApproval,
  approveClient,
  CLIENT_STATUS_CONFIG
} from '../client-approval'

describe('业务单位审批流程', () => {
  let testClientId: string
  let testUserId = 'test-user-001'
  let testAdminId = 'test-admin-001'

  beforeAll(async () => {
    // 创建测试用的业务单位（draft状态）
    const client = await prisma.client.create({
      data: {
        name: '测试客户-审批流程',
        status: 'draft',
        rejectedCount: 0
      }
    })
    testClientId = client.id
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.client.deleteMany({
      where: {
        name: {
          startsWith: '测试客户-审批流程'
        }
      }
    })
  })

  describe('状态配置验证', () => {
    it('每种状态都有对应的配置', () => {
      const statuses: Array<keyof typeof CLIENT_STATUS_CONFIG> = [
        'draft', 'pending', 'approved', 'rejected'
      ]

      statuses.forEach(status => {
        expect(CLIENT_STATUS_CONFIG[status]).toBeDefined()
        expect(CLIENT_STATUS_CONFIG[status]).toHaveProperty('text')
        expect(CLIENT_STATUS_CONFIG[status]).toHaveProperty('color')
        expect(CLIENT_STATUS_CONFIG[status]).toHaveProperty('canSubmit')
        expect(CLIENT_STATUS_CONFIG[status]).toHaveProperty('canApprove')
      })
    })

    it('只有 draft 和 rejected 状态可以提交审批', () => {
      const statuses: Array<keyof typeof CLIENT_STATUS_CONFIG> = [
        'draft', 'pending', 'approved', 'rejected'
      ]

      statuses.forEach(status => {
        const config = CLIENT_STATUS_CONFIG[status]
        if (status === 'draft' || status === 'rejected') {
          expect(config.canSubmit).toBe(true)
        } else {
          expect(config.canSubmit).toBe(false)
        }
      })
    })

    it('只有 pending 状态可以审批通过', () => {
      const statuses: Array<keyof typeof CLIENT_STATUS_CONFIG> = [
        'draft', 'pending', 'approved', 'rejected'
      ]

      statuses.forEach(status => {
        const config = CLIENT_STATUS_CONFIG[status]
        if (status === 'pending') {
          expect(config.canApprove).toBe(true)
        } else {
          expect(config.canApprove).toBe(false)
        }
      })
    })
  })

  describe('提交审批功能', () => {
    it('draft 状态的业务单位可以提交审批', async () => {
      const result = await submitClientForApproval(testClientId, {
        comment: '请审批'
      }, testUserId)

      expect(result.success).toBe(true)
      expect(result.status).toBe('pending')
      expect(result.message).toContain('提交成功')
    })

    it('重复提交应该失败', async () => {
      // 已经是 pending 状态，再次提交应该失败
      await expect(
        submitClientForApproval(testClientId, {
          comment: '再次提交'
        }, testUserId)
      ).rejects.toThrow('当前状态无法提交审批')
    })

    it('approved 状态不能重新提交', async () => {
      // 先更新为 approved
      await prisma.client.update({
        where: { id: testClientId },
        data: { status: 'approved' }
      })

      await expect(
        submitClientForApproval(testClientId, {
          comment: '重新提交'
        }, testUserId)
      ).rejects.toThrow('当前状态无法提交审批')
    })

    it('提交不存在的业务单位应该失败', async () => {
      await expect(
        submitClientForApproval('non-existent-id', {
          comment: '测试'
        }, testUserId)
      ).rejects.toThrow('业务单位不存在')
    })
  })

  describe('审批通过功能', () => {
    it('pending 状态的业务单位可以审批通过', async () => {
      // 先重置为 pending 状态
      await prisma.client.update({
        where: { id: testClientId },
        data: { status: 'pending' }
      })

      const result = await approveClient(testClientId, {
        comment: '审批通过'
      }, testAdminId)

      expect(result.success).toBe(true)
      expect(result.status).toBe('approved')
      expect(result.message).toContain('审批通过')
    })

    it('draft 状态不能直接审批通过', async () => {
      // 更新为 draft 状态
      await prisma.client.update({
        where: { id: testClientId },
        data: { status: 'draft' }
      })

      await expect(
        approveClient(testClientId, {
          comment: '直接审批'
        }, testAdminId)
      ).rejects.toThrow('当前状态无法审批通过')
    })

    it('approved 状态不能重复审批', async () => {
      // 已经是 approved 状态
      await expect(
        approveClient(testClientId, {
          comment: '再次审批'
        }, testAdminId)
      ).rejects.toThrow('当前状态无法审批通过')
    })

    it('rejected 状态不能审批通过（需要先重新提交）', async () => {
      // 更新为 rejected 状态
      await prisma.client.update({
        where: { id: testClientId },
        data: { status: 'rejected' }
      })

      await expect(
        approveClient(testClientId, {
          comment: '审批通过'
        }, testAdminId)
      ).rejects.toThrow('当前状态无法审批通过')
    })

    it('审批不存在的业务单位应该失败', async () => {
      await expect(
        approveClient('non-existent-id', {
          comment: '测试'
        }, testAdminId)
      ).rejects.toThrow('业务单位不存在')
    })
  })

  describe('完整审批流程', () => {
    it('draft → pending → approved 完整流程', async () => {
      // 创建新的测试业务单位
      const client = await prisma.client.create({
        data: {
          name: '测试客户-完整流程',
          status: 'draft',
          rejectedCount: 0
        }
      })

      // 1. 提交审批
      const submitResult = await submitClientForApproval(client.id, {
        comment: '提交审批'
      }, testUserId)
      expect(submitResult.success).toBe(true)
      expect(submitResult.status).toBe('pending')

      // 2. 审批通过
      const approveResult = await approveClient(client.id, {
        comment: '审批通过'
      }, testAdminId)
      expect(approveResult.success).toBe(true)
      expect(approveResult.status).toBe('approved')

      // 验证数据库状态
      const finalClient = await prisma.client.findUnique({
        where: { id: client.id }
      })
      expect(finalClient?.status).toBe('approved')

      // 清理
      await prisma.client.delete({
        where: { id: client.id }
      })
    })
  })

  describe('驳回后重新提交流程', () => {
    it('draft → pending → rejected → pending → approved', async () => {
      // 创建新的测试业务单位
      const client = await prisma.client.create({
        data: {
          name: '测试客户-驳回流程',
          status: 'draft',
          rejectedCount: 0
        }
      })

      // 1. 提交审批
      await submitClientForApproval(client.id, {
        comment: '提交审批'
      }, testUserId)

      // 2. 驳回（使用模块2的功能）
      const { rejectDocument } = await import('../approval-rejection')
      await rejectDocument('client', client.id, {
        rejectReason: '信息不完整'
      }, testAdminId)

      // 验证状态变为 rejected
      let currentClient = await prisma.client.findUnique({
        where: { id: client.id }
      })
      expect(currentClient?.status).toBe('rejected')

      // 3. 重新提交
      const resubmitResult = await submitClientForApproval(client.id, {
        comment: '已修改，重新提交'
      }, testUserId)
      expect(resubmitResult.success).toBe(true)
      expect(resubmitResult.status).toBe('pending')

      // 4. 审批通过
      const approveResult = await approveClient(client.id, {
        comment: '审批通过'
      }, testAdminId)
      expect(approveResult.success).toBe(true)
      expect(approveResult.status).toBe('approved')

      // 清理
      await prisma.client.delete({
        where: { id: client.id }
      })
    })
  })
})
