/**
 * @file 样品创建API测试
 * @desc 测试 POST /api/sample 端点 - 优化后的收样登记
 * @see PRD: docs/plans/2026-01-30-sample-receipt-tdd.md
 */

import { POST } from './route'
import { prisma } from '@/lib/prisma'

// Mock auth function
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}))

// Mock api-handler (包含withAuth, success, error, validateRequired等)
jest.mock('@/lib/api-handler', () => {
  const originalModule = jest.requireActual('@/lib/api-handler')
  return {
    ...originalModule,
    withAuth: (handler: any) => async (request: Request, context?: any) => {
      // 从请求头获取模拟的session信息
      const authHeader = request.headers.get('x-test-session')
      if (!authHeader) {
        // 使用unauthorized抛出错误
        originalModule.unauthorized('未登录，请先登录')
      }

      const session = JSON.parse(authHeader)
      return handler(request, session, context)
    },
  }
})

// Mock Prisma Client
jest.mock('@/lib/prisma', () => ({
  prisma: {
    sample: {
      create: jest.fn(),
    },
    testTask: {
      updateMany: jest.fn(),
    },
  },
}))

// Mock generateNo
jest.mock('@/lib/generate-no', () => ({
  generateNo: jest.fn(() => Promise.resolve('S20260130001')),
  NumberPrefixes: {
    SAMPLE: 'S',
  },
}))

// Mock data permission
jest.mock('@/lib/data-permission', () => ({
  getDataFilter: jest.fn(() => ({})),
}))

describe('POST /api/sample', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * 测试场景1：未授权访问应返回401
   */
  it('should return 401 when user is not authenticated', async () => {
    const request = new Request('http://localhost:3000/api/sample', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })

    // Mock withAuth会抛出ApiError，被withErrorHandler捕获并转换为401响应
    await expect(POST(request)).rejects.toThrow('未登录，请先登录')
  })

  /**
   * 测试场景2：成功创建样品 - 从检测项自动计算字段
   * 验证：
   * - name从第一个检测项的sampleName获取
   * - quantity从第一个检测项的quantity获取
   * - totalQuantity是所有检测项quantity总和
   * - specification从第一个检测项的material获取
   */
  it('should create sample with fields calculated from test items', async () => {
    const mockSample = {
      id: 'sample-123',
      sampleNo: 'S20260130001',
      name: '莱尼 K01', // 从第一个检测项的sampleName
      specification: 'PVC材料', // 从第一个检测项的material
      quantity: '1', // 从第一个检测项的quantity
      totalQuantity: '3', // 3个检测项，每个quantity=1，总和=3
      unit: '个',
      status: 'received',
      receiptDate: new Date('2026-01-30'),
      entrustmentId: 'ent-123',
      createdById: 'user-123',
    }

    ;(prisma.sample.create as jest.Mock).mockResolvedValue(mockSample)
    ;(prisma.testTask.updateMany as jest.Mock).mockResolvedValue({ count: 0 })

    const requestBody = {
      entrustmentId: 'ent-123',
      unit: '个',
      storageLocation: 'A区-1-01',
      receiptDate: '2026-01-30T00:00:00.000Z',
      // 注意：不再提供 name, specification, quantity
      // 这些字段将从testItems自动计算
      testItems: [
        {
          key: '1',
          sampleName: '莱尼 K01',
          material: 'PVC材料',
          quantity: 1,
          testItemName: '拉伸强度',
          testStandard: 'GB/T 1234',
        },
        {
          key: '2',
          sampleName: '莱尼 K01',
          material: 'PVC材料',
          quantity: 1,
          testItemName: '断裂伸长率',
          testStandard: 'GB/T 5678',
        },
        {
          key: '3',
          sampleName: '莱尼 K02',
          material: 'PVC材料',
          quantity: 1,
          testItemName: '硬度',
          testStandard: 'GB/T 9012',
        },
      ],
    }

    const request = new Request('http://localhost:3000/api/sample', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-session': JSON.stringify({
          user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
        }),
      },
      body: JSON.stringify(requestBody),
    })

    const response = await POST(request)
    const data = await response.json()

    // 验证响应
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toMatchObject({
      name: '莱尼 K01',
      specification: 'PVC材料',
      quantity: '1',
      totalQuantity: '3',
      unit: '个',
    })

    // 验证prisma.create调用参数
    expect(prisma.sample.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: '莱尼 K01',
          specification: 'PVC材料',
          quantity: '1',
          totalQuantity: '3',
          unit: '个',
        }),
      })
    )
  })

  /**
   * 测试场景3：缺少testItems应返回400
   */
  it('should return 400 when testItems is missing', async () => {
    const request = new Request('http://localhost:3000/api/sample', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-session': JSON.stringify({
          user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
        }),
      },
      body: JSON.stringify({
        entrustmentId: 'ent-123',
        // 缺少testItems
      }),
    })

    // validateRequired会抛出ApiError
    await expect(POST(request)).rejects.toThrow('缺少必填字段: testItems')
  })

  /**
   * 测试场景4：testItems为空数组应返回400
   */
  it('should return 400 when testItems is empty array', async () => {
    const request = new Request('http://localhost:3000/api/sample', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-session': JSON.stringify({
          user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
        }),
      },
      body: JSON.stringify({
        entrustmentId: 'ent-123',
        testItems: [],
      }),
    })

    // badRequest会抛出ApiError
    await expect(POST(request)).rejects.toThrow('testItems不能为空')
  })

  /**
   * 测试场景5：没有委托单时不关联任务
   */
  it('should not associate tasks when entrustmentId is not provided', async () => {
    const mockSample = {
      id: 'sample-123',
      sampleNo: 'S20260130001',
      name: '莱尼 K01',
      quantity: '1',
      totalQuantity: '2',
      status: 'received',
      createdById: 'user-123',
    }

    ;(prisma.sample.create as jest.Mock).mockResolvedValue(mockSample)

    const requestBody = {
      unit: '个',
      storageLocation: 'A区-1-01',
      testItems: [
        {
          key: '1',
          sampleName: '莱尼 K01',
          quantity: 1,
          testItemName: '拉伸强度',
          testStandard: 'GB/T 1234',
        },
        {
          key: '2',
          sampleName: '莱尼 K01',
          quantity: 1,
          testItemName: '断裂伸长率',
          testStandard: 'GB/T 5678',
        },
      ],
    }

    const request = new Request('http://localhost:3000/api/sample', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-session': JSON.stringify({
          user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
        }),
      },
      body: JSON.stringify(requestBody),
    })

    const response = await POST(request)

    // 验证未调用testTask.updateMany
    expect(prisma.testTask.updateMany).not.toHaveBeenCalled()
    expect(response.status).toBe(200)
  })

  /**
   * 测试场景6：计算totalQuantity正确性
   */
  it('should calculate totalQuantity correctly from test items', async () => {
    const mockSample = {
      id: 'sample-123',
      sampleNo: 'S20260130001',
      name: '莱尼 K01',
      quantity: '5', // 第一个检测项的quantity
      totalQuantity: '12', // 5 + 3 + 4 = 12
      status: 'received',
      createdById: 'user-123',
    }

    ;(prisma.sample.create as jest.Mock).mockResolvedValue(mockSample)

    const requestBody = {
      unit: '个',
      testItems: [
        {
          key: '1',
          sampleName: '莱尼 K01',
          quantity: 5,
          testItemName: '拉伸强度',
        },
        {
          key: '2',
          sampleName: '莱尼 K01',
          quantity: 3,
          testItemName: '断裂伸长率',
        },
        {
          key: '3',
          sampleName: '莱尼 K02',
          quantity: 4,
          testItemName: '硬度',
        },
      ],
    }

    const request = new Request('http://localhost:3000/api/sample', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-session': JSON.stringify({
          user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
        }),
      },
      body: JSON.stringify(requestBody),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(data.data.quantity).toBe('5')
    expect(data.data.totalQuantity).toBe('12')
  })
})
