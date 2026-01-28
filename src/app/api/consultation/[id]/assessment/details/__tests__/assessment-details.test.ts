/**
 * @file 获取咨询评估详情API测试
 * @desc 测试 GET /api/consultation/[id]/assessment/details 接口
 * @see PRD: docs/plans/2026-01-28-sample-item-assessment-design.md
 */

import { GET } from '@/app/api/consultation/[id]/assessment/details/route'
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
    sampleTestItem: {
      findMany: jest.fn(),
    },
    consultationSampleAssessment: {
      findMany: jest.fn(),
    },
  }
}))

describe('GET /api/consultation/[id]/assessment/details - 获取评估详情', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('应该成功获取评估详情', async () => {
    const consultationId = 'consultation-1'

    ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue({
      id: consultationId,
      consultationNo: 'ZX20260128001',
      status: 'assessing',
      assessmentVersion: 'v2',
      assessmentTotalCount: 2,
      assessmentPassedCount: 1,
      assessmentFailedCount: 0,
      assessmentPendingCount: 1,
    })

    ;(prisma.sampleTestItem.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'item-1',
        sampleName: '样品A',
        testItemName: '检测项B',
        quantity: 5,
        material: '不锈钢',
        assessmentStatus: 'passed',
        currentAssessorId: 'assessor-1',
        currentAssessorName: '张三',
      },
      {
        id: 'item-2',
        sampleName: '样品C',
        testItemName: '检测项D',
        quantity: 3,
        material: '铝合金',
        assessmentStatus: 'assessing',
        currentAssessorId: 'assessor-2',
        currentAssessorName: '李四',
      },
    ])

    ;(prisma.consultationSampleAssessment.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'assessment-1',
        sampleTestItemId: 'item-1',
        assessorId: 'assessor-1',
        assessorName: '张三',
        feasibility: 'feasible',
        feasibilityNote: '可行',
        assessedAt: new Date('2026-01-28T10:00:00Z'),
        round: 1,
        isLatest: true,
      },
    ])

    const request = new NextRequest(
      'http://localhost:3001/api/consultation/' + consultationId + '/assessment/details',
      { method: 'GET' }
    )

    const context = {
      params: Promise.resolve({ id: consultationId })
    }

    const response = await GET(request, context)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.consultation.id).toBe(consultationId)
    expect(data.data.consultation.consultationNo).toBe('ZX20260128001')
    expect(data.data.consultation.assessmentTotalCount).toBe(2)
    expect(data.data.consultation.assessmentPassedCount).toBe(1)
    expect(data.data.sampleItems).toHaveLength(2)
  })

  it('应该返回每个样品检测项的详细信息', async () => {
    const consultationId = 'consultation-1'

    ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue({
      id: consultationId,
      consultationNo: 'ZX20260128001',
      status: 'assessing',
      assessmentTotalCount: 1,
      assessmentPassedCount: 0,
      assessmentPendingCount: 1,
    })

    ;(prisma.sampleTestItem.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'item-1',
        sampleName: '样品A',
        testItemName: '检测项B',
        quantity: 5,
        material: '不锈钢',
        assessmentStatus: 'assessing',
        currentAssessorId: 'assessor-1',
        currentAssessorName: '张三',
      },
    ])

    ;(prisma.consultationSampleAssessment.findMany as jest.Mock).mockResolvedValue([])

    const request = new NextRequest(
      'http://localhost:3001/api/consultation/' + consultationId + '/assessment/details',
      { method: 'GET' }
    )

    const context = {
      params: Promise.resolve({ id: consultationId })
    }

    const response = await GET(request, context)
    const data = await response.json()

    expect(response.status).toBe(200)
    const item = data.data.sampleItems[0]
    expect(item.id).toBe('item-1')
    expect(item.sampleName).toBe('样品A')
    expect(item.testItem).toBe('检测项B')
    expect(item.quantity).toBe(5)
    expect(item.material).toBe('不锈钢')
    expect(item.assessmentStatus).toBe('assessing')
    expect(item.currentAssessor).toBe('张三')
  })

  it('应该包含最新的评估结果', async () => {
    const consultationId = 'consultation-1'

    ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue({
      id: consultationId,
      consultationNo: 'ZX20260128001',
      status: 'assessment_passed',
      assessmentTotalCount: 1,
      assessmentPassedCount: 1,
    })

    ;(prisma.sampleTestItem.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'item-1',
        sampleName: '样品A',
        testItemName: '检测项B',
        quantity: 5,
        material: '不锈钢',
        assessmentStatus: 'passed',
        currentAssessorId: 'assessor-1',
        currentAssessorName: '张三',
      },
    ])

    const assessedAt = new Date('2026-01-28T10:00:00Z')
    ;(prisma.consultationSampleAssessment.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'assessment-1',
        sampleTestItemId: 'item-1',
        assessorId: 'assessor-1',
        assessorName: '张三',
        feasibility: 'feasible',
        feasibilityNote: '样品符合标准',
        assessedAt,
        round: 1,
        isLatest: true,
      },
    ])

    const request = new NextRequest(
      'http://localhost:3001/api/consultation/' + consultationId + '/assessment/details',
      { method: 'GET' }
    )

    const context = {
      params: Promise.resolve({ id: consultationId })
    }

    const response = await GET(request, context)
    const data = await response.json()

    const item = data.data.sampleItems[0]
    expect(item.latestAssessment).toBeDefined()
    expect(item.latestAssessment.feasibility).toBe('feasible')
    expect(item.latestAssessment.feasibilityNote).toBe('样品符合标准')
    expect(item.latestAssessment.assessedAt).toBe(assessedAt.toISOString())
    expect(item.latestAssessment.round).toBe(1)
  })

  it('应该包含完整的评估历史记录', async () => {
    const consultationId = 'consultation-1'

    ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue({
      id: consultationId,
      consultationNo: 'ZX20260128001',
      status: 'assessment_passed',
      assessmentTotalCount: 1,
      assessmentPassedCount: 1,
    })

    ;(prisma.sampleTestItem.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'item-1',
        sampleName: '样品A',
        testItemName: '检测项B',
        quantity: 5,
        material: '不锈钢',
        assessmentStatus: 'passed',
        currentAssessorId: 'assessor-2',
        currentAssessorName: '李四',
      },
    ])

    ;(prisma.consultationSampleAssessment.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'assessment-1',
        sampleTestItemId: 'item-1',
        assessorId: 'assessor-1',
        assessorName: '张三',
        feasibility: 'infeasible',
        feasibilityNote: '不符合要求',
        assessedAt: new Date('2026-01-28T10:00:00Z'),
        round: 1,
        isLatest: false,
      },
      {
        id: 'assessment-2',
        sampleTestItemId: 'item-1',
        assessorId: 'assessor-2',
        assessorName: '李四',
        feasibility: 'feasible',
        feasibilityNote: '重新评估后可行',
        assessedAt: new Date('2026-01-28T11:00:00Z'),
        round: 2,
        isLatest: true,
      },
    ])

    const request = new NextRequest(
      'http://localhost:3001/api/consultation/' + consultationId + '/assessment/details',
      { method: 'GET' }
    )

    const context = {
      params: Promise.resolve({ id: consultationId })
    }

    const response = await GET(request, context)
    const data = await response.json()

    const item = data.data.sampleItems[0]
    expect(item.assessmentHistory).toHaveLength(2)
    expect(item.assessmentHistory[0].round).toBe(1)
    expect(item.assessmentHistory[0].feasibility).toBe('infeasible')
    expect(item.assessmentHistory[1].round).toBe(2)
    expect(item.assessmentHistory[1].feasibility).toBe('feasible')
  })

  it('应该拒绝咨询单不存在的请求', async () => {
    const consultationId = 'non-existent-id'

    ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest(
      'http://localhost:3001/api/consultation/' + consultationId + '/assessment/details',
      { method: 'GET' }
    )

    const context = {
      params: Promise.resolve({ id: consultationId })
    }

    const response = await GET(request, context)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toContain('不存在')
  })

  it('应该正确处理没有评估记录的样品检测项', async () => {
    const consultationId = 'consultation-1'

    ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue({
      id: consultationId,
      consultationNo: 'ZX20260128001',
      status: 'assessing',
      assessmentTotalCount: 1,
      assessmentPendingCount: 1,
    })

    ;(prisma.sampleTestItem.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'item-1',
        sampleName: '样品A',
        testItemName: '检测项B',
        quantity: 5,
        material: '不锈钢',
        assessmentStatus: 'assessing',
        currentAssessorId: 'assessor-1',
        currentAssessorName: '张三',
      },
    ])

    ;(prisma.consultationSampleAssessment.findMany as jest.Mock).mockResolvedValue([])

    const request = new NextRequest(
      'http://localhost:3001/api/consultation/' + consultationId + '/assessment/details',
      { method: 'GET' }
    )

    const context = {
      params: Promise.resolve({ id: consultationId })
    }

    const response = await GET(request, context)
    const data = await response.json()

    const item = data.data.sampleItems[0]
    expect(item.latestAssessment).toBeUndefined()
    expect(item.assessmentHistory).toEqual([])
  })
})
