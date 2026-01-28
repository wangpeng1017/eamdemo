/**
 * @file 咨询样品检测项批量分配评估API测试
 * @desc 测试 POST /api/consultation/[id]/assessment/batch 接口
 * @see PRD: docs/plans/2026-01-28-sample-item-assessment-design.md
 */

import { POST } from '@/app/api/consultation/[id]/assessment/batch/route'
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
    sampleTestItem: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  }
}))

describe('POST /api/consultation/[id]/assessment/batch - 批量分配评估', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('应该成功批量分配评估人', async () => {
    const consultationId = 'test-consultation-id'
    const assignments = [
      {
        sampleTestItemId: 'item-1',
        assessorId: 'assessor-1',
        assessorName: '张三',
      },
      {
        sampleTestItemId: 'item-2',
        assessorId: 'assessor-2',
        assessorName: '李四',
      },
    ]

    // Mock consultation exists and in correct status
    ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue({
      id: consultationId,
      status: 'following',
      assessmentVersion: 'v2',
    })

    // Mock sample test items exist
    ;(prisma.sampleTestItem.findMany as jest.Mock).mockResolvedValue([
      { id: 'item-1', bizType: 'consultation', bizId: consultationId },
      { id: 'item-2', bizType: 'consultation', bizId: consultationId },
    ])

    // Mock transaction
    ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        sampleTestItem: {
          updateMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
        consultation: {
          update: jest.fn().mockResolvedValue({
            id: consultationId,
            status: 'assessing',
            assessmentTotalCount: 2,
            assessmentPendingCount: 2,
          }),
        },
      })
    })

    const request = new NextRequest(
      'http://localhost:3001/api/consultation/' + consultationId + '/assessment/batch',
      {
        method: 'POST',
        body: JSON.stringify({ assignments }),
      }
    )

    const context = {
      params: Promise.resolve({ id: consultationId })
    }

    const response = await POST(request, context)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.consultationId).toBe(consultationId)
    expect(data.data.totalAssignments).toBe(2)
    expect(data.data.createdAssessments).toBe(2)
  })

  it('应该拒绝没有assignments参数的请求', async () => {
    const consultationId = 'test-consultation-id'

    const request = new NextRequest(
      'http://localhost:3001/api/consultation/' + consultationId + '/assessment/batch',
      {
        method: 'POST',
        body: JSON.stringify({}), // Missing assignments
      }
    )

    const context = {
      params: Promise.resolve({ id: consultationId })
    }

    const response = await POST(request, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    // 验证错误消息存在且提到了 array 或 undefined (Zod的验证错误)
    expect(data.error).toBeDefined()
    expect(data.error.length).toBeGreaterThan(0)
  })

  it('应该拒绝空的assignments数组', async () => {
    const consultationId = 'test-consultation-id'

    const request = new NextRequest(
      'http://localhost:3001/api/consultation/' + consultationId + '/assessment/batch',
      {
        method: 'POST',
        body: JSON.stringify({ assignments: [] }),
      }
    )

    const context = {
      params: Promise.resolve({ id: consultationId })
    }

    const response = await POST(request, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('至少')
  })

  it('应该拒绝咨询单不存在的请求', async () => {
    const consultationId = 'non-existent-id'
    const assignments = [
      {
        sampleTestItemId: 'item-1',
        assessorId: 'assessor-1',
        assessorName: '张三',
      },
    ]

    ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest(
      'http://localhost:3001/api/consultation/' + consultationId + '/assessment/batch',
      {
        method: 'POST',
        body: JSON.stringify({ assignments }),
      }
    )

    const context = {
      params: Promise.resolve({ id: consultationId })
    }

    const response = await POST(request, context)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toContain('不存在')
  })

  it('应该拒绝咨询单状态不是following的请求', async () => {
    const consultationId = 'test-consultation-id'
    const assignments = [
      {
        sampleTestItemId: 'item-1',
        assessorId: 'assessor-1',
        assessorName: '张三',
      },
    ]

    ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue({
      id: consultationId,
      status: 'quoted', // 已报价状态
      assessmentVersion: 'v2',
    })

    const request = new NextRequest(
      'http://localhost:3001/api/consultation/' + consultationId + '/assessment/batch',
      {
        method: 'POST',
        body: JSON.stringify({ assignments }),
      }
    )

    const context = {
      params: Promise.resolve({ id: consultationId })
    }

    const response = await POST(request, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('状态')
  })

  it('应该拒绝样品检测项不存在的请求', async () => {
    const consultationId = 'test-consultation-id'
    const assignments = [
      {
        sampleTestItemId: 'non-existent-item',
        assessorId: 'assessor-1',
        assessorName: '张三',
      },
    ]

    ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue({
      id: consultationId,
      status: 'following',
      assessmentVersion: 'v2',
    })

    // Mock sample test items not found
    ;(prisma.sampleTestItem.findMany as jest.Mock).mockResolvedValue([])

    const request = new NextRequest(
      'http://localhost:3001/api/consultation/' + consultationId + '/assessment/batch',
      {
        method: 'POST',
        body: JSON.stringify({ assignments }),
      }
    )

    const context = {
      params: Promise.resolve({ id: consultationId })
    }

    const response = await POST(request, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('样品检测项')
  })

  it('应该验证assignments中的必填字段', async () => {
    const consultationId = 'test-consultation-id'
    const invalidAssignments = [
      {
        // 缺少 sampleTestItemId
        assessorId: 'assessor-1',
        assessorName: '张三',
      },
    ]

    const request = new NextRequest(
      'http://localhost:3001/api/consultation/' + consultationId + '/assessment/batch',
      {
        method: 'POST',
        body: JSON.stringify({ assignments: invalidAssignments }),
      }
    )

    const context = {
      params: Promise.resolve({ id: consultationId })
    }

    const response = await POST(request, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBeDefined()
  })

  it('应该成功分配评估人并更新样品检测项状态', async () => {
    const consultationId = 'test-consultation-id'
    const assignments = [
      {
        sampleTestItemId: 'item-1',
        assessorId: 'assessor-1',
        assessorName: '张三',
      },
    ]

    ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue({
      id: consultationId,
      status: 'following',
      assessmentVersion: 'v2',
    })

    ;(prisma.sampleTestItem.findMany as jest.Mock).mockResolvedValue([
      { id: 'item-1', bizType: 'consultation', bizId: consultationId },
    ])

    let updatedItems: any[] = []

    ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        sampleTestItem: {
          updateMany: jest.fn().mockImplementation((params) => {
            updatedItems.push(params)
            return Promise.resolve({ count: 1 })
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
      'http://localhost:3001/api/consultation/' + consultationId + '/assessment/batch',
      {
        method: 'POST',
        body: JSON.stringify({ assignments }),
      }
    )

    const context = {
      params: Promise.resolve({ id: consultationId })
    }

    await POST(request, context)

    // 验证样品检测项被更新
    expect(updatedItems).toHaveLength(1)
    expect(updatedItems[0].data).toMatchObject({
      assessmentStatus: 'assessing',
      currentAssessorId: 'assessor-1',
      currentAssessorName: '张三',
    })
  })

  it('应该将咨询单状态更新为assessing', async () => {
    const consultationId = 'test-consultation-id'
    const assignments = [
      {
        sampleTestItemId: 'item-1',
        assessorId: 'assessor-1',
        assessorName: '张三',
      },
    ]

    ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue({
      id: consultationId,
      status: 'following',
      assessmentVersion: 'v2',
    })

    ;(prisma.sampleTestItem.findMany as jest.Mock).mockResolvedValue([
      { id: 'item-1', bizType: 'consultation', bizId: consultationId },
    ])

    let updatedConsultation: any = null

    ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        sampleTestItem: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        consultation: {
          update: jest.fn().mockImplementation((data) => {
            updatedConsultation = data.data
            return Promise.resolve({
              id: consultationId,
              ...data.data,
            })
          }),
        },
      })
    })

    const request = new NextRequest(
      'http://localhost:3001/api/consultation/' + consultationId + '/assessment/batch',
      {
        method: 'POST',
        body: JSON.stringify({ assignments }),
      }
    )

    const context = {
      params: Promise.resolve({ id: consultationId })
    }

    await POST(request, context)

    // 验证咨询单状态更新
    expect(updatedConsultation).toMatchObject({
      status: 'assessing',
      assessmentTotalCount: 1,
      assessmentPendingCount: 1,
    })
  })
})
