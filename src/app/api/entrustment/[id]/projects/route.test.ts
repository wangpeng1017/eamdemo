/**
 * @file 委托单项目API测试
 * @desc 测试 GET /api/entrustment/[id]/projects 端点
 * @see PRD: docs/plans/2026-01-30-sample-receipt-tdd.md
 */

import { GET } from './route'
import { prisma } from '@/lib/prisma'

// Mock auth function
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}))

// Mock withAuth from api-auth
jest.mock('@/lib/api-auth', () => {
  const originalModule = jest.requireActual('@/lib/api-handler')
  return {
    withAuth: (handler: any) => async (request: Request, context?: any) => {
      // 从请求头获取模拟的session信息
      const authHeader = request.headers.get('x-test-session')
      if (!authHeader) {
        return originalModule.error('UNAUTHORIZED', '未登录，请先登录', 401)
      }

      const session = JSON.parse(authHeader)
      return handler(request, session, context)
    },
  }
})

// Mock Prisma Client
jest.mock('@/lib/prisma', () => ({
  prisma: {
    entrustment: {
      findUnique: jest.fn(),
    },
  },
}))

describe('GET /api/entrustment/[id]/projects', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * 测试场景1：未授权访问应返回401
   */
  it('should return 401 when user is not authenticated', async () => {
    const request = new Request('http://localhost:3000/api/entrustment/test-id/projects')

    const response = await GET(request, { params: Promise.resolve({ id: 'test-id' }) })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error.message).toBe('未登录，请先登录')
  })

  /**
   * 测试场景2：成功获取委托单项目列表
   * 验证：
   * - 返回200状态码
   * - 正确转换EntrustmentProject到SampleTestItemData格式
   * - 正确解析testItems JSON字段
   */
  it('should return array of test items when authenticated', async () => {
    // Mock 数据
    const mockEntrustment = {
      id: 'ent-123',
      entrustmentNo: 'WT20260130001',
      projects: [
        {
          id: 'proj-1',
          name: '莱尼 K01',
          testItems: JSON.stringify([
            { name: '拉伸强度', standard: 'GB/T 1234' },
            { name: '断裂伸长率', standard: 'GB/T 5678' },
          ]),
          method: 'ASTM D1234',
          testTemplateId: 'TPL-001',
        },
        {
          id: 'proj-2',
          name: '莱尼 K02',
          testItems: JSON.stringify([
            { name: '硬度', standard: 'GB/T 9012' },
          ]),
          method: 'ISO 868',
          testTemplateId: 'TPL-002',
        },
      ],
    }

    ;(prisma.entrustment.findUnique as jest.Mock).mockResolvedValue(mockEntrustment)

    // 创建带认证的请求
    const request = new Request('http://localhost:3000/api/entrustment/ent-123/projects', {
      headers: {
        'x-test-session': JSON.stringify({
          user: {
            id: 'user-123',
            name: 'Test User',
            email: 'test@example.com',
          },
        }),
      },
    })

    const response = await GET(request, { params: Promise.resolve({ id: 'ent-123' }) })
    const data = await response.json()

    // 验证响应
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(3) // 2个项目，第一个有2个检测项，第二个有1个

    // 验证第一个检测项
    expect(data.data[0]).toMatchObject({
      sampleName: '莱尼 K01',
      testItemName: '拉伸强度',
      testStandard: 'GB/T 1234',
      testTemplateId: 'TPL-001',
      quantity: 1,
    })

    // 验证第二个检测项
    expect(data.data[1]).toMatchObject({
      sampleName: '莱尼 K01',
      testItemName: '断裂伸长率',
      testStandard: 'GB/T 5678',
      testTemplateId: 'TPL-001',
      quantity: 1,
    })

    // 验证第三个检测项
    expect(data.data[2]).toMatchObject({
      sampleName: '莱尼 K02',
      testItemName: '硬度',
      testStandard: 'GB/T 9012',
      testTemplateId: 'TPL-002',
      quantity: 1,
    })

    // 验证prisma调用
    expect(prisma.entrustment.findUnique).toHaveBeenCalledWith({
      where: { id: 'ent-123' },
      include: {
        projects: true,
      },
    })
  })

  /**
   * 测试场景3：委托单不存在
   */
  it('should return 404 when entrustment not found', async () => {
    ;(prisma.entrustment.findUnique as jest.Mock).mockResolvedValue(null)

    const request = new Request('http://localhost:3000/api/entrustment/nonexistent/projects', {
      headers: {
        'x-test-session': JSON.stringify({
          user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
        }),
      },
    })

    const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.message).toBe('委托单不存在')
  })

  /**
   * 测试场景4：委托单没有项目
   */
  it('should return empty array when entrustment has no projects', async () => {
    ;(prisma.entrustment.findUnique as jest.Mock).mockResolvedValue({
      id: 'ent-123',
      entrustmentNo: 'WT20260130001',
      projects: [],
    })

    const request = new Request('http://localhost:3000/api/entrustment/ent-123/projects', {
      headers: {
        'x-test-session': JSON.stringify({
          user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
        }),
      },
    })

    const response = await GET(request, { params: Promise.resolve({ id: 'ent-123' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toEqual([])
  })

  /**
   * 测试场景5：testItems JSON格式错误
   */
  it('should return 400 when testItems JSON is invalid', async () => {
    ;(prisma.entrustment.findUnique as jest.Mock).mockResolvedValue({
      id: 'ent-123',
      entrustmentNo: 'WT20260130001',
      projects: [
        {
          id: 'proj-1',
          name: '莱尼 K01',
          testItems: 'invalid json{{{',
          method: 'ASTM D1234',
          testTemplateId: 'TPL-001',
        },
      ],
    })

    const request = new Request('http://localhost:3000/api/entrustment/ent-123/projects', {
      headers: {
        'x-test-session': JSON.stringify({
          user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
        }),
      },
    })

    const response = await GET(request, { params: Promise.resolve({ id: 'ent-123' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('JSON解析失败')
  })

  /**
   * 测试场景6：testItems为空数组
   */
  it('should skip project when testItems is empty array', async () => {
    ;(prisma.entrustment.findUnique as jest.Mock).mockResolvedValue({
      id: 'ent-123',
      entrustmentNo: 'WT20260130001',
      projects: [
        {
          id: 'proj-1',
          name: '莱尼 K01',
          testItems: JSON.stringify([]),
          method: 'ASTM D1234',
          testTemplateId: 'TPL-001',
        },
      ],
    })

    const request = new Request('http://localhost:3000/api/entrustment/ent-123/projects', {
      headers: {
        'x-test-session': JSON.stringify({
          user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
        }),
      },
    })

    const response = await GET(request, { params: Promise.resolve({ id: 'ent-123' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toEqual([])
  })
})
