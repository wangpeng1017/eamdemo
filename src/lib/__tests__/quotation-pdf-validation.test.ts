/**
 * @file 报价单PDF生成验证测试
 * @desc TDD测试：验证只有审批通过的报价单才能生成PDF
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { prisma } from '@/lib/prisma'
import { validateQuotationForPDF, QUOTATION_STATUS_CONFIG } from '../quotation-pdf-validation'

describe('validateQuotationForPDF', () => {
  let testQuotationIds: Record<string, string> = {}

  beforeAll(async () => {
    // 创建测试用的报价单（各种状态）
    const quotations = await Promise.all([
      // draft 状态
      prisma.quotation.create({
        data: {
          quotationNo: 'TEST-DRAFT-001',
          clientId: null,
          status: 'draft'
        }
      }),
      // pending 状态
      prisma.quotation.create({
        data: {
          quotationNo: 'TEST-PENDING-001',
          clientId: null,
          status: 'pending'
        }
      }),
      // approved 状态
      prisma.quotation.create({
        data: {
          quotationNo: 'TEST-APPROVED-001',
          clientId: null,
          status: 'approved'
        }
      }),
      // rejected 状态
      prisma.quotation.create({
        data: {
          quotationNo: 'TEST-REJECTED-001',
          clientId: null,
          status: 'rejected'
        }
      }),
      // archived 状态
      prisma.quotation.create({
        data: {
          quotationNo: 'TEST-ARCHIVED-001',
          clientId: null,
          status: 'archived'
        }
      })
    ])

    // 保存测试ID
    testQuotationIds = {
      draft: quotations[0].id,
      pending: quotations[1].id,
      approved: quotations[2].id,
      rejected: quotations[3].id,
      archived: quotations[4].id
    }
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.quotation.deleteMany({
      where: {
        quotationNo: {
          startsWith: 'TEST-'
        }
      }
    })
  })

  describe('状态配置验证', () => {
    it('每种状态都有对应的配置', () => {
      const statuses: Array<keyof typeof QUOTATION_STATUS_CONFIG> = [
        'draft', 'pending', 'approved', 'rejected', 'archived'
      ]

      statuses.forEach(status => {
        expect(QUOTATION_STATUS_CONFIG[status]).toBeDefined()
        expect(QUOTATION_STATUS_CONFIG[status]).toHaveProperty('text')
        expect(QUOTATION_STATUS_CONFIG[status]).toHaveProperty('color')
        expect(QUOTATION_STATUS_CONFIG[status]).toHaveProperty('canGeneratePDF')
        expect(QUOTATION_STATUS_CONFIG[status]).toHaveProperty('message')
      })
    })

    it('只有 approved 状态可以生成PDF', () => {
      const statuses: Array<keyof typeof QUOTATION_STATUS_CONFIG> = [
        'draft', 'pending', 'approved', 'rejected', 'archived'
      ]

      statuses.forEach(status => {
        const config = QUOTATION_STATUS_CONFIG[status]
        if (status === 'approved') {
          expect(config.canGeneratePDF).toBe(true)
        } else {
          expect(config.canGeneratePDF).toBe(false)
        }
      })
    })
  })

  describe('draft 状态报价单', () => {
    it('不能生成PDF', async () => {
      const result = await validateQuotationForPDF(testQuotationIds.draft)

      expect(result.canGenerate).toBe(false)
      expect(result.currentStatus).toBe('draft')
      expect(result.error).toBe('报价单尚未提交审批，请先提交审批后再生成PDF')
    })
  })

  describe('pending 状态报价单', () => {
    it('不能生成PDF', async () => {
      const result = await validateQuotationForPDF(testQuotationIds.pending)

      expect(result.canGenerate).toBe(false)
      expect(result.currentStatus).toBe('pending')
      expect(result.error).toBe('报价单正在审批中，请耐心等待审批完成后再生成PDF')
    })
  })

  describe('approved 状态报价单', () => {
    it('可以生成PDF', async () => {
      const result = await validateQuotationForPDF(testQuotationIds.approved)

      expect(result.canGenerate).toBe(true)
      expect(result.currentStatus).toBe('approved')
      expect(result.error).toBeUndefined()
    })
  })

  describe('rejected 状态报价单', () => {
    it('不能生成PDF', async () => {
      const result = await validateQuotationForPDF(testQuotationIds.rejected)

      expect(result.canGenerate).toBe(false)
      expect(result.currentStatus).toBe('rejected')
      expect(result.error).toBe('报价单已被驳回，请修改内容后重新提交审批')
    })
  })

  describe('archived 状态报价单', () => {
    it('不能生成PDF', async () => {
      const result = await validateQuotationForPDF(testQuotationIds.archived)

      expect(result.canGenerate).toBe(false)
      expect(result.currentStatus).toBe('archived')
      expect(result.error).toBe('报价单已归档，无法生成PDF')
    })
  })

  describe('报价单不存在', () => {
    it('返回错误', async () => {
      const result = await validateQuotationForPDF('non-existent-id')

      expect(result.canGenerate).toBe(false)
      expect(result.error).toBe('报价单不存在')
    })
  })
})
