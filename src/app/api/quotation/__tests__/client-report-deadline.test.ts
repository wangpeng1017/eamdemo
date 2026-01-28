/**
 * @file client-report-deadline.test.ts
 * @desc 客户报告截止日期功能测试 - TDD功能1：报告时间字段
 */

import { POST } from '@/app/api/quotation/route'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(() => Promise.resolve({
    user: {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
    }
  }))
}))

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    consultation: {
      findUnique: jest.fn(),
    },
    quotation: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  }
}))

describe('客户报告截止日期 - 报价单API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/quotation - 创建报价单', () => {
    it('应该接收并保存clientReportDeadline字段', async () => {
      const mockQuotation = {
        id: 'quotation-1',
        quotationNo: 'QT2025001',
        clientReportDeadline: new Date('2025-03-15T00:00:00.000Z'),
        expectedDeadline: new Date('2025-03-20T00:00:00.000Z'),
      }

      ;(prisma.$transaction as jest.Mock).mockResolvedValue(mockQuotation)

      const requestData = {
        clientId: 'client-1',
        quotationNo: 'QT2025001',
        expectedDeadline: '2025-03-20T00:00:00.000Z',
        clientReportDeadline: '2025-03-15T00:00:00.000Z',
      }

      const request = new NextRequest('http://localhost/api/quotation', {
        method: 'POST',
        body: JSON.stringify(requestData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toHaveProperty('clientReportDeadline')
      expect(data.data.clientReportDeadline).toBe('2025-03-15T00:00:00.000Z')

      // 验证 Prisma create 调用包含了 clientReportDeadline
      expect(prisma.quotation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clientReportDeadline: new Date('2025-03-15T00:00:00.000Z'),
          })
        })
      )
    })

    it('从咨询单创建时应该继承clientReportDeadline', async () => {
      const mockConsultation = {
        id: 'consultation-1',
        consultationNo: 'C2025001',
        clientReportDeadline: new Date('2025-03-15T00:00:00.000Z'),
        expectedDeadline: new Date('2025-03-20T00:00:00.000Z'),
      }

      const mockQuotation = {
        id: 'quotation-1',
        quotationNo: 'QT2025001',
        clientReportDeadline: mockConsultation.clientReportDeadline,
      }

      ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue(mockConsultation)
      ;(prisma.$transaction as jest.Mock).mockResolvedValue(mockQuotation)

      const requestData = {
        consultationId: 'consultation-1',
        clientId: 'client-1',
      }

      const request = new NextRequest('http://localhost/api/quotation', {
        method: 'POST',
        body: JSON.stringify(requestData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.data.clientReportDeadline).toBe('2025-03-15T00:00:00.000Z')

      // 验证查询了咨询单
      expect(prisma.consultation.findUnique).toHaveBeenCalledWith({
        where: { id: 'consultation-1' },
        select: expect.objectContaining({
          clientReportDeadline: true,
        }),
      })
    })

    it('clientReportDeadline可以手动编辑（覆盖继承值）', async () => {
      const mockConsultation = {
        id: 'consultation-1',
        clientReportDeadline: new Date('2025-03-15T00:00:00.000Z'),
      }

      const mockQuotation = {
        id: 'quotation-1',
        quotationNo: 'QT2025001',
        clientReportDeadline: new Date('2025-03-25T00:00:00.000Z'), // 覆盖后的值
      }

      ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue(mockConsultation)
      ;(prisma.$transaction as jest.Mock).mockResolvedValue(mockQuotation)

      const requestData = {
        consultationId: 'consultation-1',
        clientId: 'client-1',
        clientReportDeadline: '2025-03-25T00:00:00.000Z', // 手动覆盖
      }

      const request = new NextRequest('http://localhost/api/quotation', {
        method: 'POST',
        body: JSON.stringify(requestData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.data.clientReportDeadline).toBe('2025-03-25T00:00:00.000Z')
    })

    it('clientReportDeadline为null时不报错', async () => {
      const mockQuotation = {
        id: 'quotation-1',
        quotationNo: 'QT2025001',
        clientReportDeadline: null,
      }

      ;(prisma.$transaction as jest.Mock).mockResolvedValue(mockQuotation)

      const requestData = {
        clientId: 'client-1',
        clientReportDeadline: null,
      }

      const request = new NextRequest('http://localhost/api/quotation', {
        method: 'POST',
        body: JSON.stringify(requestData),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })
})
