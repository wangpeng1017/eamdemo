/**
 * @file 审批驳回功能测试
 * @desc TDD测试：验证审批驳回功能
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { prisma } from '@/lib/prisma'
import { rejectDocument, APPROVAL_STATUS_CONFIG } from '../approval-rejection'

describe('rejectDocument', () => {
  let testQuotationId: string
  let testUserId = 'test-user-001'

  beforeAll(async () => {
    // 创建测试用的报价单（pending状态，可以被驳回）
    const quotation = await prisma.quotation.create({
      data: {
        quotationNo: 'TEST-REJECT-001',
        clientId: null,
        status: 'pending',
        rejectedCount: 0
      }
    })
    testQuotationId = quotation.id
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.quotation.deleteMany({
      where: {
        quotationNo: {
          startsWith: 'TEST-REJECT'
        }
      }
    })
  })

  describe('状态配置验证', () => {
    it('每种状态都有对应的配置', () => {
      const statuses: Array<keyof typeof APPROVAL_STATUS_CONFIG> = [
        'draft', 'pending', 'approved', 'rejected', 'archived'
      ]

      statuses.forEach(status => {
        expect(APPROVAL_STATUS_CONFIG[status]).toBeDefined()
        expect(APPROVAL_STATUS_CONFIG[status]).toHaveProperty('canReject')
        expect(APPROVAL_STATUS_CONFIG[status]).toHaveProperty('message')
      })
    })

    it('只有 pending 状态可以驳回', () => {
      const statuses: Array<keyof typeof APPROVAL_STATUS_CONFIG> = [
        'draft', 'pending', 'approved', 'rejected', 'archived'
      ]

      statuses.forEach(status => {
        const config = APPROVAL_STATUS_CONFIG[status]
        if (status === 'pending') {
          expect(config.canReject).toBe(true)
        } else {
          expect(config.canReject).toBe(false)
        }
      })
    })
  })

  describe('驳回功能', () => {
    it('驳回 pending 状态的报价单 - 成功', async () => {
      const result = await rejectDocument('quotation', testQuotationId, {
        rejectReason: '单价过低，请重新核算'
      }, testUserId)

      expect(result.success).toBe(true)
      expect(result.rejectedCount).toBe(1)
      expect(result.lastRejectReason).toBe('单价过低，请重新核算')
      expect(result.lastRejectBy).toBe(testUserId)
      expect(result.lastRejectAt).toBeInstanceOf(Date)
    })

    it('驳回原因不能为空', async () => {
      await expect(
        rejectDocument('quotation', testQuotationId, {
          rejectReason: ''
        }, testUserId)
      ).rejects.toThrow('驳回原因不能为空')
    })

    it('驳回原因不能只有空格', async () => {
      await expect(
        rejectDocument('quotation', testQuotationId, {
          rejectReason: '   '
        }, testUserId)
      ).rejects.toThrow('驳回原因不能为空')
    })

    it('驳回已通过的单据应该失败', async () => {
      // 先更新为 approved 状态
      await prisma.quotation.update({
        where: { id: testQuotationId },
        data: { status: 'approved' }
      })

      // 尝试驳回
      await expect(
        rejectDocument('quotation', testQuotationId, {
          rejectReason: '需要重新审核'
        }, testUserId)
      ).rejects.toThrow('已通过的单据无法驳回')
    })

    it('驳回草稿状态的单据应该失败', async () => {
      // 创建新的 draft 状态报价单
      const draftQuotation = await prisma.quotation.create({
        data: {
          quotationNo: 'TEST-REJECT-DRAFT-001',
          status: 'draft',
          rejectedCount: 0
        }
      })

      await expect(
        rejectDocument('quotation', draftQuotation.id, {
          rejectReason: '测试驳回'
        }, testUserId)
      ).rejects.toThrow('草稿状态的单据无法驳回')

      // 清理
      await prisma.quotation.delete({
        where: { id: draftQuotation.id }
      })
    })

    it('驳回不存在的单据应该失败', async () => {
      await expect(
        rejectDocument('quotation', 'non-existent-id', {
          rejectReason: '测试'
        }, testUserId)
      ).rejects.toThrow('单据不存在')
    })

    it('多次驳回应该累加计数', async () => {
      // 第一次驳回
      await rejectDocument('quotation', testQuotationId, {
        rejectReason: '第一次驳回'
      }, testUserId)

      // 重新提交（改为 pending）
      await prisma.quotation.update({
        where: { id: testQuotationId },
        data: { status: 'pending' }
      })

      // 第二次驳回
      const result = await rejectDocument('quotation', testQuotationId, {
        rejectReason: '第二次驳回'
      }, testUserId)

      expect(result.rejectedCount).toBe(2)
      expect(result.lastRejectReason).toBe('第二次驳回')
    })
  })

  describe('不同业务类型', () => {
    it('支持合同驳回', async () => {
      // 创建测试合同
      const contract = await prisma.contract.create({
        data: {
          contractNo: 'TEST-REJECT-CONTRACT-001',
          status: 'pending',
          rejectedCount: 0
        }
      })

      const result = await rejectDocument('contract', contract.id, {
        rejectReason: '合同条款需要修改'
      }, testUserId)

      expect(result.success).toBe(true)

      // 清理
      await prisma.contract.delete({
        where: { id: contract.id }
      })
    })

    it('支持委托单驳回', async () => {
      // 创建测试委托单
      const entrustment = await prisma.entrustment.create({
        data: {
          entrustmentNo: 'TEST-REJECT-ENT-001',
          status: 'pending',
          rejectedCount: 0
        }
      })

      const result = await rejectDocument('entrustment', entrustment.id, {
        rejectReason: '样品信息不全'
      }, testUserId)

      expect(result.success).toBe(true)

      // 清理
      await prisma.entrustment.delete({
        where: { id: entrustment.id }
      })
    })

    it('支持业务单位驳回', async () => {
      // 创建测试业务单位
      const client = await prisma.client.create({
        data: {
          name: '测试客户-驳回',
          status: 'pending',
          rejectedCount: 0
        }
      })

      const result = await rejectDocument('client', client.id, {
        rejectReason: '企业信息需要补充'
      }, testUserId)

      expect(result.success).toBe(true)

      // 清理
      await prisma.client.delete({
        where: { id: client.id }
      })
    })
  })
})
