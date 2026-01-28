/**
 * @file 重新评估样品检测项API测试
 * @desc 测试 POST /api/consultation/assessment/item/[sampleTestItemId]/reassess 接口
 * @see PRD: docs/plans/2026-01-28-sample-item-assessment-design.md
 */

import { POST } from '@/app/api/consultation/assessment/item/[sampleTestItemId]/reassess/route'
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
    sampleTestItem: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    consultation: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    consultationSampleAssessment: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  }
}))

describe('POST /api/consultation/assessment/item/[sampleTestItemId]/reassess - 重新评估', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('应该成功重新评估样品检测项', async () => {
    const sampleTestItemId = 'item-1'
    const consultationId = 'consultation-1'
    const assessorId = 'assessor-2'
    const assessorName = '李四'

    ;(prisma.sampleTestItem.findUnique as jest.Mock).mockResolvedValue({
      id: sampleTestItemId,
      bizId: consultationId,
      bizType: 'consultation',
      sampleName: '样品A',
      testItemName: '检测项B',
      assessmentStatus: 'failed',
      currentAssessorId: 'assessor-1',
      currentAssessorName: '张三',
    })

    ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue({
      id: consultationId,
      status: 'assessment_failed',
      assessmentTotalCount: 2,
      assessmentPassedCount: 1,
      assessmentFailedCount: 1,
      assessmentPendingCount: 0,
    })

    ;(prisma.consultationSampleAssessment.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'assessment-1',
        round: 1,
        isLatest: true,
      }
    ])

    ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        consultationSampleAssessment: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          create: jest.fn().mockResolvedValue({
            id: 'assessment-2',
            sampleTestItemId,
            consultationId,
            assessorId,
            assessorName,
            round: 2,
            isLatest: true,
          }),
        },
        sampleTestItem: {
          update: jest.fn().mockResolvedValue({
            id: sampleTestItemId,
            assessmentStatus: 'assessing',
            currentAssessorId: assessorId,
            currentAssessorName: assessorName,
          }),
        },
        consultation: {
          update: jest.fn().mockResolvedValue({
            id: consultationId,
            status: 'assessing',
            assessmentPendingCount: 1,
            assessmentFailedCount: 0,
          }),
        },
      })
    })

    const request = new NextRequest(
      `http://localhost:3001/api/consultation/assessment/item/${sampleTestItemId}/reassess`,
      {
        method: 'POST',
        body: JSON.stringify({
          assessorId,
          assessorName,
        }),
      }
    )

    const context = {
      params: Promise.resolve({ sampleTestItemId })
    }

    const response = await POST(request, context)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.sampleTestItemId).toBe(sampleTestItemId)
    expect(data.data.newAssessmentId).toBe('assessment-2')
    expect(data.data.round).toBe(2)
  })

  it('应该支持修改样品信息后重新评估', async () => {
    const sampleTestItemId = 'item-1'
    const consultationId = 'consultation-1'
    const modifiedData = {
      sampleName: '样品A（修改后）',
      quantity: 10,
    }

    ;(prisma.sampleTestItem.findUnique as jest.Mock).mockResolvedValue({
      id: sampleTestItemId,
      bizId: consultationId,
      bizType: 'consultation',
      sampleName: '样品A',
      testItemName: '检测项B',
      quantity: 5,
      assessmentStatus: 'failed',
    })

    ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue({
      id: consultationId,
      status: 'assessment_failed',
      assessmentTotalCount: 1,
      assessmentPassedCount: 0,
      assessmentFailedCount: 1,
      assessmentPendingCount: 0,
    })

    ;(prisma.consultationSampleAssessment.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'assessment-1',
        round: 1,
        isLatest: true,
      }
    ])

    let updatedItemData: any = null

    ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        consultationSampleAssessment: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          create: jest.fn().mockResolvedValue({
            id: 'assessment-2',
            round: 2,
          }),
        },
        sampleTestItem: {
          update: jest.fn().mockImplementation((params) => {
            updatedItemData = params.data
            return Promise.resolve({
              id: sampleTestItemId,
              ...params.data,
            })
          }),
        },
        consultation: {
          update: jest.fn().mockResolvedValue({
            id: consultationId,
            status: 'assessing',
          }),
        },
      })
    })

    const request = new NextRequest(
      `http://localhost:3001/api/consultation/assessment/item/${sampleTestItemId}/reassess`,
      {
        method: 'POST',
        body: JSON.stringify({
          assessorId: 'assessor-2',
          assessorName: '李四',
          modifiedData,
        }),
      }
    )

    const context = {
      params: Promise.resolve({ sampleTestItemId })
    }

    await POST(request, context)

    // 验证样品信息被更新
    expect(updatedItemData).toMatchObject({
      sampleName: '样品A（修改后）',
      quantity: 10,
      assessmentStatus: 'assessing',
    })
  })

  it('应该正确增加round数字', async () => {
    const sampleTestItemId = 'item-1'
    const consultationId = 'consultation-1'

    ;(prisma.sampleTestItem.findUnique as jest.Mock).mockResolvedValue({
      id: sampleTestItemId,
      bizId: consultationId,
      bizType: 'consultation',
      assessmentStatus: 'failed',
    })

    ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue({
      id: consultationId,
      status: 'assessment_failed',
      assessmentTotalCount: 1,
      assessmentPassedCount: 0,
      assessmentFailedCount: 1,
      assessmentPendingCount: 0,
    })

    // 模拟已有3轮评估
    ;(prisma.consultationSampleAssessment.findMany as jest.Mock).mockResolvedValue([
      { id: 'assessment-1', round: 1, isLatest: false },
      { id: 'assessment-2', round: 2, isLatest: false },
      { id: 'assessment-3', round: 3, isLatest: true },
    ])

    let createdRound: number | null = null

    ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        consultationSampleAssessment: {
          updateMany: jest.fn().mockResolvedValue({ count: 3 }),
          create: jest.fn().mockImplementation((params) => {
            createdRound = params.data.round
            return Promise.resolve({
              id: 'assessment-4',
              round: params.data.round,
            })
          }),
        },
        sampleTestItem: {
          update: jest.fn().mockResolvedValue({ id: sampleTestItemId }),
        },
        consultation: {
          update: jest.fn().mockResolvedValue({ id: consultationId }),
        },
      })
    })

    const request = new NextRequest(
      `http://localhost:3001/api/consultation/assessment/item/${sampleTestItemId}/reassess`,
      {
        method: 'POST',
        body: JSON.stringify({
          assessorId: 'assessor-1',
          assessorName: '张三',
        }),
      }
    )

    const context = {
      params: Promise.resolve({ sampleTestItemId })
    }

    await POST(request, context)

    // 验证新评估是第4轮
    expect(createdRound).toBe(4)
  })

  it('应该将所有旧评估记录标记为isLatest=false', async () => {
    const sampleTestItemId = 'item-1'
    const consultationId = 'consultation-1'

    ;(prisma.sampleTestItem.findUnique as jest.Mock).mockResolvedValue({
      id: sampleTestItemId,
      bizId: consultationId,
      bizType: 'consultation',
      assessmentStatus: 'failed',
    })

    ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue({
      id: consultationId,
      status: 'assessment_failed',
      assessmentTotalCount: 1,
      assessmentPassedCount: 0,
      assessmentFailedCount: 1,
      assessmentPendingCount: 0,
    })

    ;(prisma.consultationSampleAssessment.findMany as jest.Mock).mockResolvedValue([
      { id: 'assessment-1', round: 1, isLatest: true },
    ])

    let updateManyParams: any = null

    ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        consultationSampleAssessment: {
          updateMany: jest.fn().mockImplementation((params) => {
            updateManyParams = params
            return Promise.resolve({ count: 1 })
          }),
          create: jest.fn().mockResolvedValue({
            id: 'assessment-2',
            round: 2,
          }),
        },
        sampleTestItem: {
          update: jest.fn().mockResolvedValue({ id: sampleTestItemId }),
        },
        consultation: {
          update: jest.fn().mockResolvedValue({ id: consultationId }),
        },
      })
    })

    const request = new NextRequest(
      `http://localhost:3001/api/consultation/assessment/item/${sampleTestItemId}/reassess`,
      {
        method: 'POST',
        body: JSON.stringify({
          assessorId: 'assessor-1',
          assessorName: '张三',
        }),
      }
    )

    const context = {
      params: Promise.resolve({ sampleTestItemId })
    }

    await POST(request, context)

    // 验证旧记录被标记为 isLatest=false
    expect(updateManyParams).toEqual({
      where: { sampleTestItemId },
      data: { isLatest: false },
    })
  })

  it('应该拒绝样品检测项不存在的请求', async () => {
    const sampleTestItemId = 'non-existent-id'

    ;(prisma.sampleTestItem.findUnique as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest(
      `http://localhost:3001/api/consultation/assessment/item/${sampleTestItemId}/reassess`,
      {
        method: 'POST',
        body: JSON.stringify({
          assessorId: 'assessor-1',
          assessorName: '张三',
        }),
      }
    )

    const context = {
      params: Promise.resolve({ sampleTestItemId })
    }

    const response = await POST(request, context)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toContain('不存在')
  })

  it('应该拒绝缺少必填字段的请求', async () => {
    const sampleTestItemId = 'item-1'

    const request = new NextRequest(
      `http://localhost:3001/api/consultation/assessment/item/${sampleTestItemId}/reassess`,
      {
        method: 'POST',
        body: JSON.stringify({
          // 缺少 assessorId 和 assessorName
        }),
      }
    )

    const context = {
      params: Promise.resolve({ sampleTestItemId })
    }

    const response = await POST(request, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBeDefined()
  })

  it('应该正确更新咨询单统计', async () => {
    const sampleTestItemId = 'item-1'
    const consultationId = 'consultation-1'

    ;(prisma.sampleTestItem.findUnique as jest.Mock).mockResolvedValue({
      id: sampleTestItemId,
      bizId: consultationId,
      bizType: 'consultation',
      assessmentStatus: 'failed',
    })

    ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue({
      id: consultationId,
      status: 'assessment_failed',
      assessmentTotalCount: 2,
      assessmentPassedCount: 1,
      assessmentFailedCount: 1,
      assessmentPendingCount: 0,
    })

    ;(prisma.consultationSampleAssessment.findMany as jest.Mock).mockResolvedValue([
      { id: 'assessment-1', round: 1, isLatest: true },
    ])

    let updatedConsultation: any = null

    ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        consultationSampleAssessment: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          create: jest.fn().mockResolvedValue({
            id: 'assessment-2',
            round: 2,
          }),
        },
        sampleTestItem: {
          update: jest.fn().mockResolvedValue({ id: sampleTestItemId }),
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
      `http://localhost:3001/api/consultation/assessment/item/${sampleTestItemId}/reassess`,
      {
        method: 'POST',
        body: JSON.stringify({
          assessorId: 'assessor-1',
          assessorName: '张三',
        }),
      }
    )

    const context = {
      params: Promise.resolve({ sampleTestItemId })
    }

    await POST(request, context)

    // 验证统计信息更新
    expect(updatedConsultation).toMatchObject({
      status: 'assessing',
      assessmentPendingCount: 1, // 从0变为1
      assessmentFailedCount: 0,  // 从1变为0
    })
  })

  it('应该更新样品检测项状态为assessing', async () => {
    const sampleTestItemId = 'item-1'
    const consultationId = 'consultation-1'

    ;(prisma.sampleTestItem.findUnique as jest.Mock).mockResolvedValue({
      id: sampleTestItemId,
      bizId: consultationId,
      bizType: 'consultation',
      assessmentStatus: 'failed',
    })

    ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue({
      id: consultationId,
      status: 'assessment_failed',
      assessmentTotalCount: 1,
      assessmentPassedCount: 0,
      assessmentFailedCount: 1,
      assessmentPendingCount: 0,
    })

    ;(prisma.consultationSampleAssessment.findMany as jest.Mock).mockResolvedValue([
      { id: 'assessment-1', round: 1, isLatest: true },
    ])

    let updatedItemStatus: string | null = null

    ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        consultationSampleAssessment: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          create: jest.fn().mockResolvedValue({
            id: 'assessment-2',
            round: 2,
          }),
        },
        sampleTestItem: {
          update: jest.fn().mockImplementation((params) => {
            updatedItemStatus = params.data.assessmentStatus
            return Promise.resolve({
              id: sampleTestItemId,
              ...params.data,
            })
          }),
        },
        consultation: {
          update: jest.fn().mockResolvedValue({ id: consultationId }),
        },
      })
    })

    const request = new NextRequest(
      `http://localhost:3001/api/consultation/assessment/item/${sampleTestItemId}/reassess`,
      {
        method: 'POST',
        body: JSON.stringify({
          assessorId: 'assessor-1',
          assessorName: '张三',
        }),
      }
    )

    const context = {
      params: Promise.resolve({ sampleTestItemId })
    }

    await POST(request, context)

    // 验证样品检测项状态更新为 assessing
    expect(updatedItemStatus).toBe('assessing')
  })
})
