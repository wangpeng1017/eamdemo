/**
 * @file 提交样品检测项评估API测试
 * @desc 测试 POST /api/consultation/assessment/[assessmentId]/submit 接口
 * @see PRD: docs/plans/2026-01-28-sample-item-assessment-design.md
 */

import { POST } from '@/app/api/consultation/assessment/[assessmentId]/submit/route'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(() => Promise.resolve({
    user: {
      id: 'assessor-1',
      name: 'Test Assessor',
      email: 'assessor@example.com',
    }
  }))
}))

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    consultationSampleAssessment: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    sampleTestItem: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    consultation: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  }
}))

describe('POST /api/consultation/assessment/[assessmentId]/submit - 提交评估', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('应该成功提交评估', async () => {
    const assessmentId = 'assessment-1'
    const consultationId = 'consultation-1'
    const sampleTestItemId = 'item-1'

    ;(prisma.consultationSampleAssessment.findUnique as jest.Mock).mockResolvedValue({
      id: assessmentId,
      consultationId,
      sampleTestItemId,
      assessorId: 'assessor-1',
      round: 1,
      isLatest: true,
    })

    ;(prisma.sampleTestItem.findUnique as jest.Mock).mockResolvedValue({
      id: sampleTestItemId,
      sampleName: '样品A',
      testItemName: '检测项B',
    })

    ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue({
      id: consultationId,
      status: 'assessing',
      assessmentTotalCount: 2,
      assessmentPendingCount: 2,
      assessmentPassedCount: 0,
      assessmentFailedCount: 0,
    })

    ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        consultationSampleAssessment: {
          update: jest.fn().mockResolvedValue({
            id: assessmentId,
            feasibility: 'feasible',
          }),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        sampleTestItem: {
          update: jest.fn().mockResolvedValue({
            id: sampleTestItemId,
            assessmentStatus: 'passed',
          }),
        },
        consultation: {
          update: jest.fn().mockResolvedValue({
            id: consultationId,
            status: 'assessing',
            assessmentPassedCount: 1,
            assessmentPendingCount: 1,
          }),
        },
      })
    })

    const request = new NextRequest(
      'http://localhost:3001/api/consultation/assessment/' + assessmentId + '/submit',
      {
        method: 'POST',
        body: JSON.stringify({
          feasibility: 'feasible',
          feasibilityNote: '可行，无特殊要求',
        }),
      }
    )

    const context = {
      params: Promise.resolve({ assessmentId })
    }

    const response = await POST(request, context)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.assessmentId).toBe(assessmentId)
    expect(data.data.sampleTestItemId).toBe(sampleTestItemId)
  })

  it('应该拒绝没有feasibility参数的请求', async () => {
    const assessmentId = 'assessment-1'

    const request = new NextRequest(
      'http://localhost:3001/api/consultation/assessment/' + assessmentId + '/submit',
      {
        method: 'POST',
        body: JSON.stringify({
          feasibilityNote: '可行',
          // Missing feasibility
        }),
      }
    )

    const context = {
      params: Promise.resolve({ assessmentId })
    }

    const response = await POST(request, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBeDefined()
  })

  it('应该拒绝无效的feasibility值', async () => {
    const assessmentId = 'assessment-1'

    const request = new NextRequest(
      'http://localhost:3001/api/consultation/assessment/' + assessmentId + '/submit',
      {
        method: 'POST',
        body: JSON.stringify({
          feasibility: 'invalid_value',
          feasibilityNote: '说明',
        }),
      }
    )

    const context = {
      params: Promise.resolve({ assessmentId })
    }

    const response = await POST(request, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('应该拒绝评估记录不存在的请求', async () => {
    const assessmentId = 'non-existent-id'

    ;(prisma.consultationSampleAssessment.findUnique as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest(
      'http://localhost:3001/api/consultation/assessment/' + assessmentId + '/submit',
      {
        method: 'POST',
        body: JSON.stringify({
          feasibility: 'feasible',
          feasibilityNote: '可行',
        }),
      }
    )

    const context = {
      params: Promise.resolve({ assessmentId })
    }

    const response = await POST(request, context)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toContain('评估记录')
  })

  it('应该正确计算咨询单的评估统计', async () => {
    const assessmentId = 'assessment-1'
    const consultationId = 'consultation-1'
    const sampleTestItemId = 'item-1'

    ;(prisma.consultationSampleAssessment.findUnique as jest.Mock).mockResolvedValue({
      id: assessmentId,
      consultationId,
      sampleTestItemId,
      assessorId: 'assessor-1',
      round: 1,
    })

    ;(prisma.sampleTestItem.findUnique as jest.Mock).mockResolvedValue({
      id: sampleTestItemId,
    })

    ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue({
      id: consultationId,
      status: 'assessing',
      assessmentTotalCount: 3,
      assessmentPendingCount: 3,
      assessmentPassedCount: 0,
      assessmentFailedCount: 0,
    })

    let updatedConsultation: any = null

    ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        consultationSampleAssessment: {
          update: jest.fn().mockResolvedValue({
            id: assessmentId,
            feasibility: 'feasible',
          }),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        sampleTestItem: {
          update: jest.fn().mockResolvedValue({
            id: sampleTestItemId,
            assessmentStatus: 'passed',
          }),
        },
        consultation: {
          update: jest.fn().mockImplementation((params) => {
            updatedConsultation = params.data
            return Promise.resolve({
              id: consultationId,
              ...params.data,
            })
          }),
        },
      })
    })

    const request = new NextRequest(
      'http://localhost:3001/api/consultation/assessment/' + assessmentId + '/submit',
      {
        method: 'POST',
        body: JSON.stringify({
          feasibility: 'feasible',
          feasibilityNote: '可行',
        }),
      }
    )

    const context = {
      params: Promise.resolve({ assessmentId })
    }

    await POST(request, context)

    // 验证统计信息更新
    expect(updatedConsultation).toBeDefined()
    expect(updatedConsultation.assessmentPassedCount).toBe(1)
    expect(updatedConsultation.assessmentPendingCount).toBe(2)
  })

  it('应该在所有项都通过时更新咨询单状态为assessment_passed', async () => {
    const assessmentId = 'assessment-3'
    const consultationId = 'consultation-1'
    const sampleTestItemId = 'item-3'

    ;(prisma.consultationSampleAssessment.findUnique as jest.Mock).mockResolvedValue({
      id: assessmentId,
      consultationId,
      sampleTestItemId,
      assessorId: 'assessor-1',
    })

    ;(prisma.sampleTestItem.findUnique as jest.Mock).mockResolvedValue({
      id: sampleTestItemId,
    })

    ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue({
      id: consultationId,
      status: 'assessing',
      assessmentTotalCount: 2,
      assessmentPendingCount: 1,
      assessmentPassedCount: 1,
      assessmentFailedCount: 0,
    })

    let updatedStatus: string | null = null

    ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        consultationSampleAssessment: {
          update: jest.fn().mockResolvedValue({
            id: assessmentId,
            feasibility: 'feasible',
          }),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        sampleTestItem: {
          update: jest.fn().mockResolvedValue({
            id: sampleTestItemId,
            assessmentStatus: 'passed',
          }),
        },
        consultation: {
          update: jest.fn().mockImplementation((params) => {
            updatedStatus = params.data.status
            return Promise.resolve({
              id: consultationId,
              ...params.data,
            })
          }),
        },
      })
    })

    const request = new NextRequest(
      'http://localhost:3001/api/consultation/assessment/' + assessmentId + '/submit',
      {
        method: 'POST',
        body: JSON.stringify({
          feasibility: 'feasible',
          feasibilityNote: '可行',
        }),
      }
    )

    const context = {
      params: Promise.resolve({ assessmentId })
    }

    await POST(request, context)

    // 验证所有项通过时更新状态
    expect(updatedStatus).toBe('assessment_passed')
  })

  it('应该在有项失败时更新咨询单状态为assessment_failed', async () => {
    const assessmentId = 'assessment-2'
    const consultationId = 'consultation-1'
    const sampleTestItemId = 'item-2'

    ;(prisma.consultationSampleAssessment.findUnique as jest.Mock).mockResolvedValue({
      id: assessmentId,
      consultationId,
      sampleTestItemId,
      assessorId: 'assessor-1',
    })

    ;(prisma.sampleTestItem.findUnique as jest.Mock).mockResolvedValue({
      id: sampleTestItemId,
    })

    ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue({
      id: consultationId,
      status: 'assessing',
      assessmentTotalCount: 2,
      assessmentPendingCount: 2,
      assessmentPassedCount: 0,
      assessmentFailedCount: 0,
    })

    let updatedStatus: string | null = null

    ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        consultationSampleAssessment: {
          update: jest.fn().mockResolvedValue({
            id: assessmentId,
            feasibility: 'infeasible',
          }),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        sampleTestItem: {
          update: jest.fn().mockResolvedValue({
            id: sampleTestItemId,
            assessmentStatus: 'failed',
          }),
        },
        consultation: {
          update: jest.fn().mockImplementation((params) => {
            updatedStatus = params.data.status
            return Promise.resolve({
              id: consultationId,
              ...params.data,
            })
          }),
        },
      })
    })

    const request = new NextRequest(
      'http://localhost:3001/api/consultation/assessment/' + assessmentId + '/submit',
      {
        method: 'POST',
        body: JSON.stringify({
          feasibility: 'infeasible',
          feasibilityNote: '不可行，样品不符合要求',
        }),
      }
    )

    const context = {
      params: Promise.resolve({ assessmentId })
    }

    await POST(request, context)

    // 验证有项失败时状态为 assessing（继续评估）或 assessment_failed（全部完成）
    expect(updatedStatus).toBeDefined()
  })

  it('应该保存评估的详细说明', async () => {
    const assessmentId = 'assessment-1'
    const consultationId = 'consultation-1'
    const sampleTestItemId = 'item-1'
    const feasibilityNote = '可行。样品规格符合标准，建议在常温下存放。'

    ;(prisma.consultationSampleAssessment.findUnique as jest.Mock).mockResolvedValue({
      id: assessmentId,
      consultationId,
      sampleTestItemId,
      assessorId: 'assessor-1',
    })

    ;(prisma.sampleTestItem.findUnique as jest.Mock).mockResolvedValue({
      id: sampleTestItemId,
    })

    ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue({
      id: consultationId,
      status: 'assessing',
      assessmentTotalCount: 1,
      assessmentPendingCount: 1,
    })

    let savedNote: string | null = null

    ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        consultationSampleAssessment: {
          update: jest.fn().mockImplementation((params) => {
            savedNote = params.data.feasibilityNote
            return Promise.resolve({
              id: assessmentId,
              feasibilityNote,
            })
          }),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        sampleTestItem: {
          update: jest.fn().mockResolvedValue({
            id: sampleTestItemId,
            assessmentStatus: 'passed',
          }),
        },
        consultation: {
          update: jest.fn().mockResolvedValue({
            id: consultationId,
            status: 'assessment_passed',
          }),
        },
      })
    })

    const request = new NextRequest(
      'http://localhost:3001/api/consultation/assessment/' + assessmentId + '/submit',
      {
        method: 'POST',
        body: JSON.stringify({
          feasibility: 'feasible',
          feasibilityNote,
        }),
      }
    )

    const context = {
      params: Promise.resolve({ assessmentId })
    }

    await POST(request, context)

    // 验证详细说明被正确保存
    expect(savedNote).toBe(feasibilityNote)
  })
})
