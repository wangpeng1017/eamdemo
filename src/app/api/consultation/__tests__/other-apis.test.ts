/**
 * @file 咨询评估API测试 - 修改评估、查询待评估、重新评估、关闭咨询单
 */

import { PUT } from '@/app/api/consultation/assessment/[id]/route'
import { GET as GetMyPending } from '@/app/api/consultation/assessment/my-pending/route'
import { POST as Reassess } from '@/app/api/consultation/[id]/reassess/route'
import { POST as CloseConsultation } from '@/app/api/consultation/[id]/close/route'
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
      findFirst: jest.fn(),
      update: jest.fn(),
      createMany: jest.fn(),
    },
    consultation: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  }
}))

describe('PUT /api/consultation/assessment/[id] - 修改评估反馈', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('应该成功修改评估反馈', async () => {
    const assessmentId = 'test-assessment-id'
    const updatedData = {
      conclusion: 'difficult',
      feedback: '修改后的反馈',
    }

    ;(prisma.consultationAssessment.findUnique as jest.Mock).mockResolvedValue({
      id: assessmentId,
      assessorId: 'assessor-1',
      consultationId: 'consultation-1',
      round: 1,
      status: 'completed',
      consultation: {},
    })

    ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      const mockTx = {
        consultationAssessment: {
          update: jest.fn().mockResolvedValue({}),
          findMany: jest.fn().mockResolvedValue([
            { id: assessmentId, status: 'completed', conclusion: 'difficult' },
            { id: 'other', status: 'completed', conclusion: 'feasible' },
          ]),
        },
        consultation: {
          update: jest.fn().mockResolvedValue({}),
        },
      }
      return callback(mockTx)
    })

    const request = new NextRequest('http://localhost:3001/api/consultation/assessment/' + assessmentId, {
      method: 'PUT',
      body: JSON.stringify(updatedData),
    })

    const context = {
      params: Promise.resolve({ id: assessmentId })
    }

    const response = await PUT(request, context)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.message).toContain('评估反馈已更新')
  })

  it('应该在修改为infeasible后重新判断状态', async () => {
    const assessmentId = 'test-assessment-id'
    const updatedData = {
      conclusion: 'infeasible',
      feedback: '重新考虑，不可行',
    }

    ;(prisma.consultationAssessment.findUnique as jest.Mock).mockResolvedValue({
      id: assessmentId,
      assessorId: 'assessor-1',
      consultationId: 'consultation-1',
      round: 1,
      status: 'completed',
      consultation: {},
    })

    let consultationStatus = ''
    ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      const mockTx = {
        consultationAssessment: {
          update: jest.fn().mockResolvedValue({}),
          findMany: jest.fn().mockResolvedValue([
            { id: assessmentId, status: 'completed', conclusion: 'infeasible' },
            { id: 'other', status: 'completed', conclusion: 'feasible' },
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

    const request = new NextRequest('http://localhost:3001/api/consultation/assessment/' + assessmentId, {
      method: 'PUT',
      body: JSON.stringify(updatedData),
    })

    const context = {
      params: Promise.resolve({ id: assessmentId })
    }

    await PUT(request, context)

    expect(consultationStatus).toBe('assessment_failed')
  })

  it('应该拒绝非评估人修改', async () => {
    const assessmentId = 'test-assessment-id'

    ;(prisma.consultationAssessment.findUnique as jest.Mock).mockResolvedValue({
      id: assessmentId,
      assessorId: 'other-assessor',
      consultationId: 'consultation-1',
      consultation: {},
    })

    const request = new NextRequest('http://localhost:3001/api/consultation/assessment/' + assessmentId, {
      method: 'PUT',
      body: JSON.stringify({ conclusion: 'feasible', feedback: '测试' }),
    })

    const context = {
      params: Promise.resolve({ id: assessmentId })
    }

    const response = await PUT(request, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.message).toContain('只有评估人本人可以修改')
  })
})

describe('GET /api/consultation/assessment/my-pending - 查询待评估列表', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('应该成功查询待评估列表', async () => {
    const mockAssessments = [
      {
        id: 'assessment-1',
        requestedAt: new Date(),
        round: 1,
        requestedBy: '跟进人1',
        consultation: {
          consultationNo: 'XZ202401001',
          testItems: JSON.stringify([{ name: '项目A' }, { name: '项目B' }]),
          client: { name: '客户A' },
        },
      },
      {
        id: 'assessment-2',
        requestedAt: new Date(),
        round: 2,
        requestedBy: '跟进人2',
        consultation: {
          consultationNo: 'XZ202401002',
          testItems: JSON.stringify([{ name: '项目C' }]),
          client: { name: '客户B' },
        },
      },
    ]

    ;(prisma.consultationAssessment.findMany as jest.Mock).mockResolvedValue(mockAssessments)

    const request = new NextRequest('http://localhost:3001/api/consultation/assessment/my-pending', {
      method: 'GET',
    })

    const response = await GetMyPending(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(2)
    expect(data.data[0].consultationNo).toBe('XZ202401001')
    expect(data.data[0].testItems).toEqual([{ name: '项目A' }, { name: '项目B' }])
    expect(data.data[0].clientName).toBe('客户A')
  })

  it('应该处理客户为空的情况', async () => {
    ;(prisma.consultationAssessment.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'assessment-1',
        requestedAt: new Date(),
        round: 1,
        requestedBy: '跟进人',
        consultation: {
          consultationNo: 'XZ202401001',
          testItems: '[]',
          client: null,
        },
      },
    ])

    const request = new NextRequest('http://localhost:3001/api/consultation/assessment/my-pending', {
      method: 'GET',
    })

    const response = await GetMyPending(request)
    const data = await response.json()

    expect(data.data[0].clientName).toBe('未知客户')
  })

  it('应该处理空列表', async () => {
    ;(prisma.consultationAssessment.findMany as jest.Mock).mockResolvedValue([])

    const request = new NextRequest('http://localhost:3001/api/consultation/assessment/my-pending', {
      method: 'GET',
    })

    const response = await GetMyPending(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data).toHaveLength(0)
  })
})

describe('POST /api/consultation/[id]/reassess - 重新评估', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('应该成功发起重新评估', async () => {
    const consultationId = 'test-consultation-id'
    const requestData = {
      assessors: [{ id: 'assessor-2', name: '评估人2' }],
      consultationData: {
        testItems: [{ name: '修改后的项目' }],
        clientRequirement: '修改后的需求',
      },
    }

    ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue({
      id: consultationId,
      status: 'assessment_failed',
      assessments: [{ round: 1 }],
    })

    ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      const mockTx = {
        consultation: {
          update: jest.fn().mockResolvedValue({}),
        },
        consultationAssessment: {
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      }
      return callback(mockTx)
    })

    const request = new NextRequest('http://localhost:3001/api/consultation/' + consultationId + '/reassess', {
      method: 'POST',
      body: JSON.stringify(requestData),
    })

    const context = {
      params: Promise.resolve({ id: consultationId })
    }

    const response = await Reassess(request, context)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.round).toBe(2)
    expect(data.data.message).toContain('已开始第 2 轮评估')
  })

  it('应该拒绝非assessment_failed状态的咨询单', async () => {
    const consultationId = 'test-consultation-id'

    ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue({
      id: consultationId,
      status: 'following',
      assessments: [],
    })

    const request = new NextRequest('http://localhost:3001/api/consultation/' + consultationId + '/reassess', {
      method: 'POST',
      body: JSON.stringify({ assessors: [{ id: 'a1', name: 'A1' }] }),
    })

    const context = {
      params: Promise.resolve({ id: consultationId })
    }

    const response = await Reassess(request, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.message).toContain('不能重新评估')
  })

  it('应该拒绝缺少assessors的请求', async () => {
    const consultationId = 'test-consultation-id'

    const request = new NextRequest('http://localhost:3001/api/consultation/' + consultationId + '/reassess', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const context = {
      params: Promise.resolve({ id: consultationId })
    }

    const response = await Reassess(request, context)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.message).toContain('请选择至少一个评估人')
  })
})

describe('POST /api/consultation/[id]/close - 关闭咨询单', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('应该成功关闭咨询单', async () => {
    const consultationId = 'test-consultation-id'
    const closeData = {
      closeReason: '客户取消需求',
    }

    ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue({
      id: consultationId,
      feasibilityNote: null,
    })

    ;(prisma.consultation.update as jest.Mock).mockResolvedValue({})

    const request = new NextRequest('http://localhost:3001/api/consultation/' + consultationId + '/close', {
      method: 'POST',
      body: JSON.stringify(closeData),
    })

    const context = {
      params: Promise.resolve({ id: consultationId })
    }

    const response = await CloseConsultation(request, context)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.message).toContain('咨询单已关闭')
  })

  it('应该将关闭原因追加到现有备注', async () => {
    const consultationId = 'test-consultation-id'
    const closeData = {
      closeReason: '新的关闭原因',
    }

    ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue({
      id: consultationId,
      feasibilityNote: '已有备注',
    })

    let updatedNote = ''
    ;(prisma.consultation.update as jest.Mock).mockImplementation((args) => {
      updatedNote = args.data.feasibilityNote
      return Promise.resolve({})
    })

    const request = new NextRequest('http://localhost:3001/api/consultation/' + consultationId + '/close', {
      method: 'POST',
      body: JSON.stringify(closeData),
    })

    const context = {
      params: Promise.resolve({ id: consultationId })
    }

    await CloseConsultation(request, context)

    expect(updatedNote).toContain('已有备注')
    expect(updatedNote).toContain('[关闭原因]')
    expect(updatedNote).toContain('新的关闭原因')
  })

  it('应该处理没有关闭原因的情况', async () => {
    const consultationId = 'test-consultation-id'

    ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue({
      id: consultationId,
      feasibilityNote: null,
    })

    ;(prisma.consultation.update as jest.Mock).mockResolvedValue({})

    const request = new NextRequest('http://localhost:3001/api/consultation/' + consultationId + '/close', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const context = {
      params: Promise.resolve({ id: consultationId })
    }

    const response = await CloseConsultation(request, context)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('应该返回404当咨询单不存在', async () => {
    const consultationId = 'non-existent-id'

    ;(prisma.consultation.findUnique as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3001/api/consultation/' + consultationId + '/close', {
      method: 'POST',
      body: JSON.stringify({ closeReason: '测试' }),
    })

    const context = {
      params: Promise.resolve({ id: consultationId })
    }

    const response = await CloseConsultation(request, context)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error.message).toContain('咨询单不存在')
  })
})
