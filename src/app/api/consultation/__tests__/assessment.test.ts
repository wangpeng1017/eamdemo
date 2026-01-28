/**
 * @file 咨询评估API测试 - 发起评估
 * @desc 测试 POST /api/consultation/[id]/assessment 接口
 */

import { POST, GET } from '@/app/api/consultation/[id]/assessment/route'
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
      update: jest.fn(),
    },
    consultationAssessment: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  }
}))

describe('POST /api/consultation/[id]/assessment - 发起评估', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('应该成功发起评估', async () => {
    const consultationId = 'test-consultation-id'
    const assessors = [
      { id: 'assessor-1', name: '评估人1' },
      { id: 'assessor-2', name: '评估人2' },
    ]

    // Mock consultation exists and in correct status
    ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue({
      id: consultationId,
      status: 'following',
      assessments: [], // No pending assessments
    })

    // Mock no previous assessments (first round)
    ;(prisma.consultationAssessment.findFirst as jest.Mock).mockResolvedValue(null)

    // Mock transaction
    ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        consultationAssessment: {
          createMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
        consultation: {
          update: jest.fn().mockResolvedValue({}),
        },
      })
    })

    const request = new NextRequest('http://localhost:3001/api/consultation/' + consultationId + '/assessment', {
      method: 'POST',
      body: JSON.stringify({ assessors }),
    })

    const context = {
      params: Promise.resolve({ id: consultationId })
    }

    const response = await POST(request, context)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.round).toBe(1)
    expect(data.data.assessorCount).toBe(2)
    expect(data.data.message).toContain('评估已发起')
  })

  it('应该拒绝没有assessors参数的请求', async () => {
    const consultationId = 'test-consultation-id'

    const request = new NextRequest('http://localhost:3001/api/consultation/' + consultationId + '/assessment', {
      method: 'POST',
      body: JSON.stringify({}), // Missing assessors
    })

    const context = {
      params: Promise.resolve({ id: consultationId })
    }

    const response = await POST(request, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.message).toContain('请选择至少一个评估人')
  })

  it('应该拒绝空assessors数组', async () => {
    const consultationId = 'test-consultation-id'

    const request = new NextRequest('http://localhost:3001/api/consultation/' + consultationId + '/assessment', {
      method: 'POST',
      body: JSON.stringify({ assessors: [] }),
    })

    const context = {
      params: Promise.resolve({ id: consultationId })
    }

    const response = await POST(request, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.message).toContain('请选择至少一个评估人')
  })

  it('应该返回404当咨询单不存在', async () => {
    const consultationId = 'non-existent-id'
    const assessors = [{ id: 'assessor-1', name: '评估人1' }]

    ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3001/api/consultation/' + consultationId + '/assessment', {
      method: 'POST',
      body: JSON.stringify({ assessors }),
    })

    const context = {
      params: Promise.resolve({ id: consultationId })
    }

    const response = await POST(request, context)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error.message).toContain('咨询单不存在')
  })

  it('应该拒绝非following状态的咨询单', async () => {
    const consultationId = 'test-consultation-id'
    const assessors = [{ id: 'assessor-1', name: '评估人1' }]

    ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue({
      id: consultationId,
      status: 'assessing', // Wrong status
      assessments: [],
    })

    const request = new NextRequest('http://localhost:3001/api/consultation/' + consultationId + '/assessment', {
      method: 'POST',
      body: JSON.stringify({ assessors }),
    })

    const context = {
      params: Promise.resolve({ id: consultationId })
    }

    const response = await POST(request, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.message).toContain('当前状态')
    expect(data.error.message).toContain('不能发起评估')
  })

  it('应该拒绝已有进行中评估的咨询单', async () => {
    const consultationId = 'test-consultation-id'
    const assessors = [{ id: 'assessor-1', name: '评估人1' }]

    ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue({
      id: consultationId,
      status: 'following',
      assessments: [
        { id: 'existing-assessment', status: 'pending' }
      ],
    })

    const request = new NextRequest('http://localhost:3001/api/consultation/' + consultationId + '/assessment', {
      method: 'POST',
      body: JSON.stringify({ assessors }),
    })

    const context = {
      params: Promise.resolve({ id: consultationId })
    }

    const response = await POST(request, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.message).toContain('已有进行中的评估')
  })

  it('应该正确计算第2轮评估', async () => {
    const consultationId = 'test-consultation-id'
    const assessors = [{ id: 'assessor-1', name: '评估人1' }]

    ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue({
      id: consultationId,
      status: 'following',
      assessments: [],
    })

    // Mock previous assessment in round 1
    ;(prisma.consultationAssessment.findFirst as jest.Mock).mockResolvedValue({
      round: 1
    })

    ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        consultationAssessment: {
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        consultation: {
          update: jest.fn().mockResolvedValue({}),
        },
      })
    })

    const request = new NextRequest('http://localhost:3001/api/consultation/' + consultationId + '/assessment', {
      method: 'POST',
      body: JSON.stringify({ assessors }),
    })

    const context = {
      params: Promise.resolve({ id: consultationId })
    }

    const response = await POST(request, context)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.round).toBe(2)
  })
})

describe('GET /api/consultation/[id]/assessment - 查询评估详情', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('应该成功查询评估详情', async () => {
    const consultationId = 'test-consultation-id'

    ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue({
      id: consultationId,
      status: 'assessing',
      assessments: [
        { id: '1', round: 1, requestedAt: new Date('2024-01-01') },
        { id: '2', round: 2, requestedAt: new Date('2024-01-02') },
        { id: '3', round: 2, requestedAt: new Date('2024-01-03') },
      ],
    })

    const request = new NextRequest('http://localhost:3001/api/consultation/' + consultationId + '/assessment', {
      method: 'GET',
    })

    const context = {
      params: Promise.resolve({ id: consultationId })
    }

    const response = await GET(request, context)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.consultationId).toBe(consultationId)
    expect(data.data.status).toBe('assessing')
    expect(data.data.maxRound).toBe(2)
    expect(data.data.assessments).toHaveLength(3)
  })

  it('应该处理没有评估记录的情况', async () => {
    const consultationId = 'test-consultation-id'

    ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue({
      id: consultationId,
      status: 'following',
      assessments: [],
    })

    const request = new NextRequest('http://localhost:3001/api/consultation/' + consultationId + '/assessment', {
      method: 'GET',
    })

    const context = {
      params: Promise.resolve({ id: consultationId })
    }

    const response = await GET(request, context)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.maxRound).toBe(0)
    expect(data.data.assessments).toHaveLength(0)
  })

  it('应该返回404当咨询单不存在', async () => {
    const consultationId = 'non-existent-id'

    ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3001/api/consultation/' + consultationId + '/assessment', {
      method: 'GET',
    })

    const context = {
      params: Promise.resolve({ id: consultationId })
    }

    const response = await GET(request, context)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
  })
})
