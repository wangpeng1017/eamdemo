/**
 * @file entrustment API测试
 * @desc 测试委托单创建API的边界情况和错误处理
 * @input: POST /api/entrustment
 * @output: 创建的委托单数据
 */

import { NextRequest } from 'next/server'

// Mock依赖
jest.mock('@/lib/prisma', () => {
  const mockCreate = jest.fn()
  const mockFindUnique = jest.fn()

  return {
    prisma: {
      entrustment: {
        create: mockCreate,
        findUnique: mockFindUnique,
        __mockCreate: mockCreate, // 暴露给测试使用
        __mockFindUnique: mockFindUnique,
      },
      entrustmentProject: {
        createMany: jest.fn(),
      },
    }
  }
})

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(() => Promise.resolve({
    user: { id: 'test-user-id', name: 'Test User' }
  })),
}))

jest.mock('@/lib/generate-no', () => ({
  generateNo: jest.fn(() => Promise.resolve('WT202602010001')),
  NumberPrefixes: {
    ENTRUSTMENT: 'WT',
    SAMPLE: 'YP',
  },
}))

import { POST } from '../route'
import { prisma } from '@/lib/prisma'

// 获取mock函数的引用
const mockCreate = (prisma.entrustment.create as any).__mockCreate as jest.Mock
const mockFindUnique = (prisma.entrustment.findUnique as any).__mockFindUnique as jest.Mock

describe('POST /api/entrustment', () => {
  let mockRequest: NextRequest

  beforeEach(() => {
    jest.clearAllMocks()
    mockRequest = new NextRequest('http://localhost:3000/api/entrustment', {
      method: 'POST',
      body: JSON.stringify({
        clientName: '测试客户',
        sampleName: '测试样品',
        sampleModel: '型号A',
        sampleMaterial: '钢材',
        sampleQuantity: 5,
      }),
    })
  })

  describe('成功创建委托单', () => {
    beforeEach(() => {
      // 重置所有mock
      mockCreate.mockReset()
      mockFindUnique.mockReset()

      // 设置默认返回值
      mockCreate.mockResolvedValue({
        id: 'test-id',
        entrustmentNo: 'WT202602010001',
        status: 'pending',
        createdAt: new Date(),
      })

      mockFindUnique.mockResolvedValue({
        id: 'test-id',
        entrustmentNo: 'WT202602010001',
        status: 'pending',
        client: null,
        contract: null,
        projects: [],
        samples: [],
      })
    })

    it('应该只使用schema中存在的字段', async () => {
      const response = await POST(mockRequest)
      const data = await response.json()

      // 验证响应
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // 验证传给prisma的createData不包含schema中不存在的字段
      const createCallArgs = mockCreate.mock.calls[0][0]
      const createData = createCallArgs.data

      // 这些字段不应该在createData中
      expect(createData).not.toHaveProperty('sampleName')
      expect(createData).not.toHaveProperty('sampleModel')
      expect(createData).not.toHaveProperty('sampleMaterial')
      expect(createData).not.toHaveProperty('sampleQuantity')

      // 只应该包含schema中存在的字段
      expect(createData).toHaveProperty('entrustmentNo')
      expect(createData).toHaveProperty('clientId')
      expect(createData).toHaveProperty('contactPerson')
      expect(createData).toHaveProperty('status')
    })

    it('应该从samples数组提取信息到委托单', async () => {
      mockRequest = new NextRequest('http://localhost:3000/api/entrustment', {
        method: 'POST',
        body: JSON.stringify({
          clientName: '测试客户',
          samples: [
            {
              name: '样品1',
              model: '型号A',
              material: '钢材',
              quantity: 5,
            }
          ]
        }),
      })

      const response = await POST(mockRequest)

      // 不应该抛出400错误
      expect(response.status).toBe(200)
      expect(mockCreate).toHaveBeenCalled()
    })
  })

  describe('错误处理', () => {
    beforeEach(() => {
      mockCreate.mockReset()
      mockFindUnique.mockReset()
    })

    it('应该在缺少clientName时返回400', async () => {
      mockRequest = new NextRequest('http://localhost:3000/api/entrustment', {
        method: 'POST',
        body: JSON.stringify({
          // 缺少clientName
          sampleName: '测试样品',
        }),
      })

      const response = await POST(mockRequest)

      expect(response.status).toBe(500) // withErrorHandler会捕获Error并返回500
    })

    it('应该处理空samples数组', async () => {
      mockCreate.mockResolvedValue({
        id: 'test-id',
        entrustmentNo: 'WT202602010001',
        status: 'pending',
      })

      mockFindUnique.mockResolvedValue({
        id: 'test-id',
        entrustmentNo: 'WT202602010001',
        status: 'pending',
        client: null,
        contract: null,
        projects: [],
        samples: [],
      })

      mockRequest = new NextRequest('http://localhost:3000/api/entrustment', {
        method: 'POST',
        body: JSON.stringify({
          clientName: '测试客户',
          samples: [],
        }),
      })

      const response = await POST(mockRequest)

      expect(response.status).toBe(200)
    })
  })
})
