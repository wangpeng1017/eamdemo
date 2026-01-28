/**
 * @file 报价单直接生成委托单功能测试
 * @desc TDD测试：验证从报价单直接创建委托单
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { prisma } from '@/lib/prisma'
import {
  createEntrustmentFromQuotation,
  generateEntrustmentNo,
  canCreateEntrustmentFromQuotation
} from '../quotation-to-entrustment'

describe('报价单直接生成委托单', () => {
  let testQuotationId: string
  let testUserId = 'test-user-001'

  beforeAll(async () => {
    // 创建测试用的报价单（approved状态，已审批通过）
    const quotation = await prisma.quotation.create({
      data: {
        quotationNo: 'TEST-TO-ENT-001',
        clientId: null,
        status: 'approved',
        clientContactPerson: '张三',
        follower: '李四'
      }
    })

    // 创建报价项目
    await prisma.quotationItem.create({
      data: {
        quotationId: quotation.id,
        serviceItem: '甲醛检测',
        methodStandard: 'GB/T 18883-2002',
        quantity: 10,
        unitPrice: 100,
        totalPrice: 1000
      }
    })

    testQuotationId = quotation.id
  })

  afterAll(async () => {
    // 清理测试数据
    const quotation = await prisma.quotation.findUnique({
      where: { id: testQuotationId }
    })

    // 删除相关的委托单
    if (quotation) {
      await prisma.entrustment.deleteMany({
        where: { quotationNo: quotation.quotationNo }
      })
    }

    // 删除报价项目
    await prisma.quotationItem.deleteMany({
      where: { quotationId: testQuotationId }
    })

    // 删除报价单
    await prisma.quotation.deleteMany({
      where: {
        quotationNo: {
          startsWith: 'TEST-TO-ENT'
        }
      }
    })
  })

  describe('委托单编号生成', () => {
    it('应该生成符合格式的委托单编号（WT+年月日+序号）', async () => {
      const entrustmentNo = await generateEntrustmentNo()

      expect(entrustmentNo).toMatch(/^WT-\d{8}-\d{3}$/)
    })

    it('同一批次生成的编号应该递增', async () => {
      const no1 = await generateEntrustmentNo()
      const no2 = await generateEntrustmentNo()

      const seq1 = parseInt(no1.split('-')[2])
      const seq2 = parseInt(no2.split('-')[2])

      expect(seq2).toBeGreaterThan(seq1)
    })
  })

  describe('创建前验证', () => {
    it('approved 状态的报价单可以创建委托单', async () => {
      const result = await canCreateEntrustmentFromQuotation(testQuotationId)

      expect(result.canCreate).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it('draft 状态的报价单不能创建委托单', async () => {
      // 创建 draft 状态的报价单
      const draftQuotation = await prisma.quotation.create({
        data: {
          quotationNo: 'TEST-TO-ENT-DRAFT-001',
          clientId: null,
          status: 'draft'
        }
      })

      const result = await canCreateEntrustmentFromQuotation(draftQuotation.id)

      expect(result.canCreate).toBe(false)
      expect(result.reason).toContain('未审批通过')

      // 清理
      await prisma.quotation.delete({
        where: { id: draftQuotation.id }
      })
    })

    it('不存在的报价单不能创建委托单', async () => {
      const result = await canCreateEntrustmentFromQuotation('non-existent-id')

      expect(result.canCreate).toBe(false)
      expect(result.reason).toContain('不存在')
    })
  })

  describe('创建委托单功能', () => {
    it('从报价单成功创建委托单', async () => {
      const result = await createEntrustmentFromQuotation({
        quotationId: testQuotationId,
        contactPerson: '王五',
        follower: '赵六'
      }, testUserId)

      expect(result.success).toBe(true)
      expect(result.entrustmentId).toBeDefined()
      expect(result.entrustmentNo).toMatch(/^WT-\d{8}-\d{3}$/)
      expect(result.quotationNo).toBeDefined()
      expect(result.message).toContain('创建成功')
    })

    it('委托单应该复制报价单的基础信息', async () => {
      const result = await createEntrustmentFromQuotation({
        quotationId: testQuotationId
      }, testUserId)

      // 查询创建的委托单
      const entrustment = await prisma.entrustment.findUnique({
        where: { id: result.entrustmentId },
        include: {
          quotation: true
        }
      })

      expect(entrustment).toBeDefined()
      expect(entrustment?.quotationId).toBe(testQuotationId)
      expect(entrustment?.sourceType).toBe('quotation')
    })

    it('委托单应该复制报价单的检测项目', async () => {
      const result = await createEntrustmentFromQuotation({
        quotationId: testQuotationId
      }, testUserId)

      // 查询委托单的检测项目
      const projects = await prisma.entrustmentProject.findMany({
        where: {
          entrustmentId: result.entrustmentNo
        }
      })

      expect(projects.length).toBeGreaterThan(0)
      expect(projects[0].serviceName).toContain('甲醛检测')
    })

    it('应该支持从有关联合同的报价单创建委托单', async () => {
      // 创建有关联合同的报价单
      const quotation = await prisma.quotation.create({
        data: {
          quotationNo: 'TEST-TO-ENT-CONTRACT-001',
          clientId: null,
          status: 'approved',
          contractNo: 'HT-20260128-001'
        }
      })

      // 创建报价项目
      await prisma.quotationItem.create({
        data: {
          quotationId: quotation.id,
          serviceItem: '微生物检测',
          methodStandard: 'GB 4789.3-2016',
          quantity: 5,
          unitPrice: 200,
          totalPrice: 1000
        }
      })

      const result = await createEntrustmentFromQuotation({
        quotationId: quotation.id
      }, testUserId)

      expect(result.success).toBe(true)
      expect(result.contractNo).toBe('HT-20260128-001')

      // 验证委托单同时记录了quotationId和contractNo
      const entrustment = await prisma.entrustment.findUnique({
        where: { id: result.entrustmentId }
      })

      expect(entrustment?.quotationId).toBe(quotation.id)
      expect(entrustment?.contractNo).toBe('HT-20260128-001')

      // 清理
      await prisma.entrustment.delete({
        where: { id: result.entrustmentId }
      })
      await prisma.quotationItem.deleteMany({
        where: { quotationId: quotation.id }
      })
      await prisma.quotation.delete({
        where: { id: quotation.id }
      })
    })

    it('从未审批的报价单创建委托单应该失败', async () => {
      const draftQuotation = await prisma.quotation.create({
        data: {
          quotationNo: 'TEST-TO-ENT-DRAFT-002',
          clientId: null,
          status: 'draft'
        }
      })

      await expect(
        createEntrustmentFromQuotation({
          quotationId: draftQuotation.id
        }, testUserId)
      ).rejects.toThrow('未审批通过')

      // 清理
      await prisma.quotation.delete({
        where: { id: draftQuotation.id }
      })
    })

    it('从不存在的报价单创建委托单应该失败', async () => {
      await expect(
        createEntrustmentFromQuotation({
          quotationId: 'non-existent-id'
        }, testUserId)
      ).rejects.toThrow('报价单不存在')
    })
  })

  describe('完整流程', () => {
    it('报价单 → 委托单（跳过合同）完整流程', async () => {
      // 1. 创建报价单（approved）
      const quotation = await prisma.quotation.create({
        data: {
          quotationNo: 'TEST-TO-ENT-FULL-001',
          clientId: null,
          status: 'approved',
          clientContactPerson: '测试客户',
          follower: '测试员'
        }
      })

      // 创建多个报价项目
      await Promise.all([
        prisma.quotationItem.create({
          data: {
            quotationId: quotation.id,
            serviceItem: '检测项目1',
            methodStandard: 'GB/T 1234-2020',
            quantity: 10,
            unitPrice: 100,
            totalPrice: 1000
          }
        }),
        prisma.quotationItem.create({
          data: {
            quotationId: quotation.id,
            serviceItem: '检测项目2',
            methodStandard: 'GB/T 5678-2020',
            quantity: 5,
            unitPrice: 200,
            totalPrice: 1000
          }
        })
      ])

      // 2. 从报价单直接创建委托单（跳过合同）
      const result = await createEntrustmentFromQuotation({
        quotationId: quotation.id,
        contactPerson: '收样人',
        follower: '检测员'
      }, testUserId)

      // 3. 验证委托单创建成功
      expect(result.success).toBe(true)
      expect(result.contractNo).toBeUndefined()  // 没有合同

      const entrustment = await prisma.entrustment.findUnique({
        where: { id: result.entrustmentId },
        include: {
          projects: true
        }
      })

      expect(entrustment?.sourceType).toBe('quotation')
      expect(entrustment?.projects.length).toBe(2)  // 复制了2个项目

      // 清理
      await prisma.entrustmentProject.deleteMany({
        where: { entrustmentId: result.entrustmentNo }
      })
      await prisma.entrustment.delete({
        where: { id: result.entrustmentId }
      })
      await prisma.quotationItem.deleteMany({
        where: { quotationId: quotation.id }
      })
      await prisma.quotation.delete({
        where: { id: quotation.id }
      })
    })
  })
})
