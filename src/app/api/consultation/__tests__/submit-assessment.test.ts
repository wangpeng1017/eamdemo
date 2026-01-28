/**
 * @file 咨询评估API测试 - 提交评估反馈
 * @desc 测试 POST /api/consultation/assessment/[id]/submit 接口
 */

import { POST } from '@/app/api/consultation/assessment/[id]/submit/route'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(() => Promise.resolve({
    user: {
      id: 'assessor-1',
      name: 'Assessor User',
      email: 'assessor@example.com',
    }
  }))
}))

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    consultationAssessment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    consultation: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  }
}))

describe('POST /api/consultation/assessment/[id]/submit - 提交评估反馈', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('应该成功提交评估反馈（feasible）', async () => {
    const assessmentId = 'test-assessment-id'
    const feedbackData = {
      conclusion: 'feasible',
      feedback: '完全可行，建议尽快实施',
    }

    ;(prisma.consultationAssessment.findUnique as jest.Mock).mockResolvedValue({
      id: assessmentId,
      assessorId: 'assessor-1',
      consultationId: 'consultation-1',
      round: 1,
      status: 'pending',
      consultation: {},
    })

    ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      const mockTx = {
        consultationAssessment: {
          update: jest.fn().mockResolvedValue({}),
          findMany: jest.fn().mockResolvedValue([
            { id: assessmentId, status: 'completed', conclusion: 'feasible' },
            { id: 'other-assessment', status: 'completed', conclusion: 'difficult' },
          ]),
        },
        consultation: {
          update: jest.fn().mockResolvedValue({}),
        },
      }
      return callback(mockTx)
    })

    const request = new NextRequest('http://localhost:3001/api/consultation/assessment/' + assessmentId + '/submit', {
      method: 'POST',
      body: JSON.stringify(feedbackData),
    })

    const context = {
      params: Promise.resolve({ id: assessmentId })
    }

    const response = await POST(request, context)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.message).toContain('评估反馈已提交')
  })

  it('应该在有人给出infeasible时将咨询单状态设为assessment_failed', async () => {
    const assessmentId = 'test-assessment-id'
    const feedbackData = {
      conclusion: 'infeasible',
      feedback: '技术难度太大，不建议实施',
    }

    ;(prisma.consultationAssessment.findUnique as jest.Mock).mockResolvedValue({
      id: assessmentId,
      assessorId: 'assessor-1',
      consultationId: 'consultation-1',
      round: 1,
      status: 'pending',
      consultation: {},
    })

    let consultationStatus = ''
    ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      const mockTx = {
        consultationAssessment: {
          update: jest.fn().mockResolvedValue({}),
          findMany: jest.fn().mockResolvedValue([
            { id: assessmentId, status: 'completed', conclusion: 'infeasible' },
            { id: 'other-assessment', status: 'completed', conclusion: 'feasible' },
          ]),
        },
        consultation: {
          update: jest.fn().mockImplementation((args) => {
            consultationStatus = args.data.status
            return Promise.resolve({})
          }),
        },
      }
      return callback(mockTx)
    })

    const request = new NextRequest('http://localhost:3001/api/consultation/assessment/' + assessmentId + '/submit', {
      method: 'POST',
      body: JSON.stringify(feedbackData),
    })

    const context = {
      params: Promise.resolve({ id: assessmentId })
    }

    await POST(request, context)

    expect(consultationStatus).toBe('assessment_failed')
  })

  it('应该在所有人都给出feasible/difficult时将咨询单状态设为following', async () => {
    const assessmentId = 'test-assessment-id'
    const feedbackData = {
      conclusion: 'feasible',
      feedback: '可行',
    }

    ;(prisma.consultationAssessment.findUnique as jest.Mock).mockResolvedValue({
      id: assessmentId,
      assessorId: 'assessor-1',
      consultationId: 'consultation-1',
      round: 1,
      status: 'pending',
      consultation: {},
    })

    let consultationStatus = ''
    ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      const mockTx = {
        consultationAssessment: {
          update: jest.fn().mockResolvedValue({}),
          findMany: jest.fn().mockResolvedValue([
            { id: assessmentId, status: 'completed', conclusion: 'feasible' },
            { id: 'other-assessment', status: 'completed', conclusion: 'difficult' },
          ]),
        },
        consultation: {
          update: jest.fn().mockImplementation((args) => {
            consultationStatus = args.data.status
            return Promise.resolve({})
          }),
        },
      }
      return callback(mockTx)
    })

    const request = new NextRequest('http://localhost:3001/api/consultation/assessment/' + assessmentId + '/submit', {
      method: 'POST',
      body: JSON.stringify(feedbackData),
    })

    const context = {
      params: Promise.resolve({ id: assessmentId })
    }

    await POST(request, context)

    expect(consultationStatus).toBe('following')
  })

  it('应该拒绝缺少conclusion的请求', async () => {
    const assessmentId = 'test-assessment-id'

    const request = new NextRequest('http://localhost:3001/api/consultation/assessment/' + assessmentId + '/submit', {
      method: 'POST',
      body: JSON.stringify({ feedback: '测试反馈' }),
    })

    const context = {
      params: Promise.resolve({ id: assessmentId })
    }

    const response = await POST(request, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.message).toContain('请选择可行性结论')
  })

  it('应该拒绝缺少feedback的请求', async () => {
    const assessmentId = 'test-assessment-id'

    const request = new NextRequest('http://localhost:3001/api/consultation/assessment/' + assessmentId + '/submit', {
      method: 'POST',
      body: JSON.stringify({ conclusion: 'feasible' }),
    })

    const context = {
      params: Promise.resolve({ id: assessmentId })
    }

    const response = await POST(request, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.message).toContain('请输入评估意见')
  })

  it('应该拒绝无效的conclusion值', async () => {
    const assessmentId = 'test-assessment-id'

    const request = new NextRequest('http://localhost:3001/api/consultation/assessment/' + assessmentId + '/submit', {
      method: 'POST',
      body: JSON.stringify({ conclusion: 'invalid', feedback: '测试' }),
    })

    const context = {
      params: Promise.resolve({ id: assessmentId })
    }

    const response = await POST(request, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.message).toContain('可行性结论必须是')
  })

  it('应该返回404当评估记录不存在', async () => {
    const assessmentId = 'non-existent-id'

    ;(prisma.consultationAssessment.findUnique as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3001/api/consultation/assessment/' + assessmentId + '/submit', {
      method: 'POST',
      body: JSON.stringify({ conclusion: 'feasible', feedback: '测试' }),
    })

    const context = {
      params: Promise.resolve({ id: assessmentId })
    }

    const response = await POST(request, context)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error.message).toContain('评估记录不存在')
  })

  it('应该拒绝非评估人本人提交', async () => {
    const assessmentId = 'test-assessment-id'

    ;(prisma.consultationAssessment.findUnique as jest.Mock).mockResolvedValue({
      id: assessmentId,
      assessorId: 'other-assessor', // Different from current user
      consultationId: 'consultation-1',
      consultation: {},
    })

    const request = new NextRequest('http://localhost:3001/api/consultation/assessment/' + assessmentId + '/submit', {
      method: 'POST',
      body: JSON.stringify({ conclusion: 'feasible', feedback: '测试' }),
    })

    const context = {
      params: Promise.resolve({ id: assessmentId })
    }

    const response = await POST(request, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.message).toContain('只有评估人本人可以提交')
  })

  it('应该在部分评估完成时不更新咨询单状态', async () => {
    const assessmentId = 'test-assessment-id'
    const feedbackData = {
      conclusion: 'feasible',
      feedback: '可行',
    }

    ;(prisma.consultationAssessment.findUnique as jest.Mock).mockResolvedValue({
      id: assessmentId,
      assessorId: 'assessor-1',
      consultationId: 'consultation-1',
      round: 1,
      status: 'pending',
      consultation: {},
    })

    let consultationUpdated = false
    ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      const mockTx = {
        consultationAssessment: {
          update: jest.fn().mockResolvedValue({}),
          findMany: jest.fn().mockResolvedValue([
            { id: assessmentId, status: 'completed', conclusion: 'feasible' },
            { id: 'other-assessment', status: 'pending', conclusion: null }, // Still pending
          ]),
        },
        consultation: {
          update: jest.fn().mockImplementation(() => {
            consultationUpdated = true
            return Promise.resolve({})
          }),
        },
      }
      return callback(mockTx)
    })

    const request = new NextRequest('http://localhost:3001/api/consultation/assessment/' + assessmentId + '/submit', {
      method: 'POST',
      body: JSON.stringify(feedbackData),
    })

    const context = {
      params: Promise.resolve({ id: assessmentId })
    }

    await POST(request, context)

    expect(consultationUpdated).toBe(false)
  })
})
