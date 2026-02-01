/**
 * @file 我的待评估 v2 测试 - 查询 SampleTestItem 表
 * @desc 测试 GET /api/consultation/assessment/my-pending
 *       改为查询 SampleTestItem 表的 currentAssessorId，按咨询单分组返回
 */

import { GET } from '@/app/api/consultation/assessment/my-pending/route'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(() =>
    Promise.resolve({
      user: {
        id: 'assessor-user-1',
        name: 'Assessor User',
        email: 'assessor@example.com',
        roles: ['assessor'],
        permissions: [],
      },
    })
  ),
}))

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    consultationAssessment: {
      findMany: jest.fn(),
    },
    sampleTestItem: {
      findMany: jest.fn(),
    },
    consultation: {
      findMany: jest.fn(),
    },
  },
}))

describe('GET /api/consultation/assessment/my-pending - v2 查询 SampleTestItem', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('应该通过 SampleTestItem.currentAssessorId 查询待评估任务', async () => {
    // Mock: SampleTestItem 中有当前用户的待评估记录
    ;(prisma.sampleTestItem.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'sti-1',
        bizType: 'consultation',
        bizId: 'consultation-id-1',
        sampleName: '样品A',
        testItemName: '拉伸试验',
        currentAssessorId: 'assessor-user-1',
        currentAssessorName: '评估人',
        assessmentStatus: 'assessing',
      },
      {
        id: 'sti-2',
        bizType: 'consultation',
        bizId: 'consultation-id-1',
        sampleName: '样品B',
        testItemName: '弯曲试验',
        currentAssessorId: 'assessor-user-1',
        currentAssessorName: '评估人',
        assessmentStatus: 'assessing',
      },
      {
        id: 'sti-3',
        bizType: 'consultation',
        bizId: 'consultation-id-2',
        sampleName: '样品C',
        testItemName: '冲击试验',
        currentAssessorId: 'assessor-user-1',
        currentAssessorName: '评估人',
        assessmentStatus: 'assessing',
      },
    ])

    // Mock: 咨询单数据
    ;(prisma.consultation.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'consultation-id-1',
        consultationNo: 'ZX202602010001',
        client: { name: '客户A' },
        testItems: '[]',
        createdAt: new Date('2026-02-01'),
      },
      {
        id: 'consultation-id-2',
        consultationNo: 'ZX202602010002',
        client: { name: '客户B' },
        testItems: '[]',
        createdAt: new Date('2026-02-01'),
      },
    ])

    const request = new NextRequest('http://localhost:3001/api/consultation/assessment/my-pending')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)

    // 应该按咨询单分组, 2个咨询单
    expect(data.data).toHaveLength(2)

    // 第一个咨询单有2个待评估项
    const firstConsultation = data.data.find((d: any) => d.consultationNo === 'ZX202602010001')
    expect(firstConsultation).toBeDefined()
    expect(firstConsultation.sampleTestItems).toHaveLength(2)

    // 第二个咨询单有1个待评估项
    const secondConsultation = data.data.find((d: any) => d.consultationNo === 'ZX202602010002')
    expect(secondConsultation).toBeDefined()
    expect(secondConsultation.sampleTestItems).toHaveLength(1)

    // 验证 sampleTestItem.findMany 被调用时使用了正确的查询条件
    expect(prisma.sampleTestItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          currentAssessorId: 'assessor-user-1',
          assessmentStatus: 'assessing',
          bizType: 'consultation',
        }),
      })
    )
  })

  it('无待评估任务时应返回空数组', async () => {
    ;(prisma.sampleTestItem.findMany as jest.Mock).mockResolvedValue([])

    const request = new NextRequest('http://localhost:3001/api/consultation/assessment/my-pending')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(0)
  })

  it('应该只查询 assessmentStatus=assessing 的记录', async () => {
    ;(prisma.sampleTestItem.findMany as jest.Mock).mockResolvedValue([])

    const request = new NextRequest('http://localhost:3001/api/consultation/assessment/my-pending')
    await GET(request)

    expect(prisma.sampleTestItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          assessmentStatus: 'assessing',
        }),
      })
    )
  })

  it('不应该再查询 ConsultationAssessment 表', async () => {
    ;(prisma.sampleTestItem.findMany as jest.Mock).mockResolvedValue([])

    const request = new NextRequest('http://localhost:3001/api/consultation/assessment/my-pending')
    await GET(request)

    // v1 的 ConsultationAssessment 不应被调用
    expect(prisma.consultationAssessment.findMany).not.toHaveBeenCalled()
  })
})
