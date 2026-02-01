/**
 * @file 创建咨询单 v2 测试 - 状态自动判定
 * @desc 测试 POST /api/consultation 根据样品检测项评估人自动设置 status
 *       有评估人 -> status='assessing'
 *       无评估人 -> status='following'
 */

import { POST } from '@/app/api/consultation/route'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(() =>
    Promise.resolve({
      user: {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        roles: ['admin'],
        permissions: [],
      },
    })
  ),
}))

// Mock fs-extra to avoid filesystem issues in tests
jest.mock('fs-extra', () => ({
  ensureDir: jest.fn(),
  pathExists: jest.fn(() => false),
  move: jest.fn(),
}))

// Mock prisma
jest.mock('@/lib/prisma', () => {
  const mockTx = {
    consultation: {
      create: jest.fn(),
    },
    sampleTestItem: {
      create: jest.fn(),
    },
  }
  return {
    prisma: {
      consultation: {
        count: jest.fn(() => Promise.resolve(0)),
        create: jest.fn(),
        update: jest.fn(),
      },
      sampleTestItem: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback: (tx: typeof mockTx) => Promise<unknown>) => {
        return callback(mockTx)
      }),
      _mockTx: mockTx,
    },
  }
})

// Helper: get mock transaction context
function getMockTx() {
  return (prisma as any)._mockTx
}

describe('POST /api/consultation - v2 状态自动判定', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Default: count returns 0 for consultationNo generation
    ;(prisma.consultation.count as jest.Mock).mockResolvedValue(0)
    // Default: transaction create returns a consultation
    const mockTx = getMockTx()
    mockTx.consultation.create.mockResolvedValue({
      id: 'new-consultation-id',
      consultationNo: 'ZX202602010001',
      status: 'following',
      testItems: '[]',
    })
    mockTx.sampleTestItem.create.mockResolvedValue({})
  })

  it('无评估人时, status 应为 following', async () => {
    const mockTx = getMockTx()
    // Capture what data is passed to create
    let capturedCreateData: any = null
    mockTx.consultation.create.mockImplementation(async (args: any) => {
      capturedCreateData = args.data
      return {
        id: 'new-id',
        consultationNo: 'ZX202602010001',
        status: capturedCreateData.status,
        testItems: '[]',
      }
    })

    const body = {
      clientId: 'client-1',
      clientContactPerson: 'John',
      sampleTestItems: [
        {
          sampleName: '样品A',
          testItemName: '拉伸试验',
          // 无 assessorId
        },
        {
          sampleName: '样品B',
          testItemName: '弯曲试验',
          // 无 assessorId
        },
      ],
    }

    const request = new NextRequest('http://localhost:3001/api/consultation', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    // 核心断言：无评估人时 status = 'following'
    expect(capturedCreateData.status).toBe('following')
  })

  it('有评估人时, status 应为 assessing', async () => {
    const mockTx = getMockTx()
    let capturedCreateData: any = null
    mockTx.consultation.create.mockImplementation(async (args: any) => {
      capturedCreateData = args.data
      return {
        id: 'new-id',
        consultationNo: 'ZX202602010001',
        status: capturedCreateData.status,
        testItems: '[]',
      }
    })

    const body = {
      clientId: 'client-1',
      clientContactPerson: 'John',
      sampleTestItems: [
        {
          sampleName: '样品A',
          testItemName: '拉伸试验',
          assessorId: 'assessor-user-1',
          assessorName: '评估人张三',
        },
        {
          sampleName: '样品B',
          testItemName: '弯曲试验',
          // 无 assessorId
        },
      ],
    }

    const request = new NextRequest('http://localhost:3001/api/consultation', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    // 核心断言：只要有一个评估人, status = 'assessing'
    expect(capturedCreateData.status).toBe('assessing')
  })

  it('空 sampleTestItems 时, status 应为 following', async () => {
    const mockTx = getMockTx()
    let capturedCreateData: any = null
    mockTx.consultation.create.mockImplementation(async (args: any) => {
      capturedCreateData = args.data
      return {
        id: 'new-id',
        consultationNo: 'ZX202602010001',
        status: capturedCreateData.status,
        testItems: '[]',
      }
    })

    const body = {
      clientId: 'client-1',
      clientContactPerson: 'John',
      sampleTestItems: [],
    }

    const request = new NextRequest('http://localhost:3001/api/consultation', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(capturedCreateData.status).toBe('following')
  })

  it('不传 sampleTestItems 时, status 应为 following', async () => {
    const mockTx = getMockTx()
    let capturedCreateData: any = null
    mockTx.consultation.create.mockImplementation(async (args: any) => {
      capturedCreateData = args.data
      return {
        id: 'new-id',
        consultationNo: 'ZX202602010001',
        status: capturedCreateData.status,
        testItems: '[]',
      }
    })

    const body = {
      clientId: 'client-1',
      clientContactPerson: 'John',
      // 不传 sampleTestItems
    }

    const request = new NextRequest('http://localhost:3001/api/consultation', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(capturedCreateData.status).toBe('following')
  })

  it('所有 sampleTestItems 都有评估人时, assessmentTotalCount 应正确设置', async () => {
    const mockTx = getMockTx()
    let capturedCreateData: any = null
    mockTx.consultation.create.mockImplementation(async (args: any) => {
      capturedCreateData = args.data
      return {
        id: 'new-id',
        consultationNo: 'ZX202602010001',
        status: capturedCreateData.status,
        testItems: '[]',
      }
    })

    const body = {
      clientId: 'client-1',
      clientContactPerson: 'John',
      sampleTestItems: [
        {
          sampleName: '样品A',
          testItemName: '拉伸试验',
          assessorId: 'assessor-1',
          assessorName: '张三',
        },
        {
          sampleName: '样品B',
          testItemName: '弯曲试验',
          assessorId: 'assessor-2',
          assessorName: '李四',
        },
      ],
    }

    const request = new NextRequest('http://localhost:3001/api/consultation', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(capturedCreateData.status).toBe('assessing')
    // 评估计数应该自动设置
    expect(capturedCreateData.assessmentTotalCount).toBe(2)
    expect(capturedCreateData.assessmentPendingCount).toBe(2)
  })
})
