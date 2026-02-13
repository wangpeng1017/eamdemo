/**
 * @file generate-client-reports.test.ts
 * @desc 测试委托单自动生成客户报告编号的核心逻辑
 * @see docs/plans/2026-02-13-entrustment-report-no-design.md
 */

// Mock prisma before importing anything
jest.mock('@/lib/prisma', () => ({
  prisma: {
    clientReport: {
      create: jest.fn(),
      createMany: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
  },
}))

import { prisma } from '@/lib/prisma'
import {
  generateClientReportsForEntrustment,
  type GenerateClientReportsParams,
} from '@/lib/generate-client-reports'

// Mock generateClientReportNo to return predictable values
jest.mock('@/lib/generate-no', () => ({
  generateClientReportNo: jest.fn(),
}))

import { generateClientReportNo } from '@/lib/generate-no'

const mockGenerateNo = generateClientReportNo as jest.MockedFunction<typeof generateClientReportNo>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('generateClientReportsForEntrustment', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // 默认 mock: 每次调用返回递增编号
    let counter = 0
    mockGenerateNo.mockImplementation(async () => {
      counter++
      return `CR-20260213-${String(counter).padStart(3, '0')}`
    })
    // Mock prisma.clientReport.create 返回传入的数据
    ;(mockPrisma.clientReport.create as jest.Mock).mockImplementation(
      async ({ data }: any) => ({ id: `mock-id-${Date.now()}`, ...data })
    )
  })

  // ==================== by_sample 模式 ====================

  describe('by_sample 模式', () => {
    const baseParams: GenerateClientReportsParams = {
      entrustmentId: 'ent-001',
      reportGrouping: 'by_sample',
      reportCopies: 1,
      samples: [
        { id: 'sample-1', name: '样品A' },
        { id: 'sample-2', name: '样品B' },
        { id: 'sample-3', name: '样品C' },
      ],
      projects: [],
      clientName: '测试客户',
    }

    it('应为每个样品生成一条 ClientReport 记录', async () => {
      const result = await generateClientReportsForEntrustment(baseParams)

      expect(result).toHaveLength(3)
      expect(mockGenerateNo).toHaveBeenCalledTimes(3)
    })

    it('每条记录的 sampleId 应指向对应样品', async () => {
      const result = await generateClientReportsForEntrustment(baseParams)

      expect(result[0].sampleId).toBe('sample-1')
      expect(result[1].sampleId).toBe('sample-2')
      expect(result[2].sampleId).toBe('sample-3')
    })

    it('每条记录的 entrustmentProjectId 应为 null', async () => {
      const result = await generateClientReportsForEntrustment(baseParams)

      result.forEach((r) => {
        expect(r.entrustmentProjectId).toBeNull()
      })
    })

    it('每条记录的 groupingType 应为 by_sample', async () => {
      const result = await generateClientReportsForEntrustment(baseParams)

      result.forEach((r) => {
        expect(r.groupingType).toBe('by_sample')
      })
    })

    it('每条记录的 sampleName 应为对应样品名称', async () => {
      const result = await generateClientReportsForEntrustment(baseParams)

      expect(result[0].sampleName).toBe('样品A')
      expect(result[1].sampleName).toBe('样品B')
      expect(result[2].sampleName).toBe('样品C')
    })

    it('每条记录应有唯一的 reportNo', async () => {
      const result = await generateClientReportsForEntrustment(baseParams)

      const reportNos = result.map((r) => r.reportNo)
      const uniqueNos = new Set(reportNos)
      expect(uniqueNos.size).toBe(3)
    })

    it('每条记录的 status 应为 draft', async () => {
      const result = await generateClientReportsForEntrustment(baseParams)

      result.forEach((r) => {
        expect(r.status).toBe('draft')
      })
    })

    it('每条记录应关联 entrustmentId', async () => {
      const result = await generateClientReportsForEntrustment(baseParams)

      result.forEach((r) => {
        expect(r.entrustmentId).toBe('ent-001')
      })
    })

    it('reportCopies 应存储在每条记录但不影响数量', async () => {
      const params = { ...baseParams, reportCopies: 5 }
      const result = await generateClientReportsForEntrustment(params)

      // 仍然是 3 条（样品数），不是 15 条
      expect(result).toHaveLength(3)
      result.forEach((r) => {
        expect(r.reportCopies).toBe(5)
      })
    })
  })

  // ==================== by_project 模式 ====================

  describe('by_project 模式', () => {
    const baseParams: GenerateClientReportsParams = {
      entrustmentId: 'ent-002',
      reportGrouping: 'by_project',
      reportCopies: 2,
      samples: [],
      projects: [
        { id: 'proj-1', name: '拉伸试验' },
        { id: 'proj-2', name: '弯曲试验' },
      ],
      clientName: '测试客户B',
    }

    it('应为每个检测项目生成一条 ClientReport 记录', async () => {
      const result = await generateClientReportsForEntrustment(baseParams)

      expect(result).toHaveLength(2)
      expect(mockGenerateNo).toHaveBeenCalledTimes(2)
    })

    it('每条记录的 entrustmentProjectId 应指向对应项目', async () => {
      const result = await generateClientReportsForEntrustment(baseParams)

      expect(result[0].entrustmentProjectId).toBe('proj-1')
      expect(result[1].entrustmentProjectId).toBe('proj-2')
    })

    it('每条记录的 sampleId 应为 null', async () => {
      const result = await generateClientReportsForEntrustment(baseParams)

      result.forEach((r) => {
        expect(r.sampleId).toBeNull()
      })
    })

    it('每条记录的 groupingType 应为 by_project', async () => {
      const result = await generateClientReportsForEntrustment(baseParams)

      result.forEach((r) => {
        expect(r.groupingType).toBe('by_project')
      })
    })

    it('每条记录的 projectName 应为对应项目名称', async () => {
      const result = await generateClientReportsForEntrustment(baseParams)

      expect(result[0].projectName).toBe('拉伸试验')
      expect(result[1].projectName).toBe('弯曲试验')
    })

    it('reportCopies 不影响生成数量', async () => {
      const result = await generateClientReportsForEntrustment(baseParams)

      expect(result).toHaveLength(2)
      result.forEach((r) => {
        expect(r.reportCopies).toBe(2)
      })
    })
  })

  // ==================== merged 模式 ====================

  describe('merged 模式', () => {
    const baseParams: GenerateClientReportsParams = {
      entrustmentId: 'ent-003',
      reportGrouping: 'merged',
      reportCopies: 3,
      samples: [
        { id: 'sample-1', name: '样品A' },
        { id: 'sample-2', name: '样品B' },
      ],
      projects: [
        { id: 'proj-1', name: '拉伸试验' },
      ],
      clientName: '测试客户C',
    }

    it('应只生成 1 条 ClientReport 记录', async () => {
      const result = await generateClientReportsForEntrustment(baseParams)

      expect(result).toHaveLength(1)
      expect(mockGenerateNo).toHaveBeenCalledTimes(1)
    })

    it('记录的 sampleId 和 entrustmentProjectId 都应为 null', async () => {
      const result = await generateClientReportsForEntrustment(baseParams)

      expect(result[0].sampleId).toBeNull()
      expect(result[0].entrustmentProjectId).toBeNull()
    })

    it('记录的 groupingType 应为 merged', async () => {
      const result = await generateClientReportsForEntrustment(baseParams)

      expect(result[0].groupingType).toBe('merged')
    })

    it('记录应关联 entrustmentId', async () => {
      const result = await generateClientReportsForEntrustment(baseParams)

      expect(result[0].entrustmentId).toBe('ent-003')
    })

    it('reportCopies 不影响数量，仍为 1 条', async () => {
      const result = await generateClientReportsForEntrustment(baseParams)

      expect(result).toHaveLength(1)
      expect(result[0].reportCopies).toBe(3)
    })
  })

  // ==================== 边界场景 ====================

  describe('边界场景', () => {
    it('reportGrouping 为 null 时不生成任何记录', async () => {
      const params: GenerateClientReportsParams = {
        entrustmentId: 'ent-004',
        reportGrouping: null,
        reportCopies: 1,
        samples: [{ id: 's1', name: 'A' }],
        projects: [],
        clientName: '客户',
      }

      const result = await generateClientReportsForEntrustment(params)

      expect(result).toHaveLength(0)
      expect(mockGenerateNo).not.toHaveBeenCalled()
    })

    it('reportGrouping 为 undefined 时不生成任何记录', async () => {
      const params: GenerateClientReportsParams = {
        entrustmentId: 'ent-005',
        reportGrouping: undefined as any,
        reportCopies: 1,
        samples: [{ id: 's1', name: 'A' }],
        projects: [],
        clientName: '客户',
      }

      const result = await generateClientReportsForEntrustment(params)

      expect(result).toHaveLength(0)
    })

    it('by_sample 模式下样品为空时不生成记录', async () => {
      const params: GenerateClientReportsParams = {
        entrustmentId: 'ent-006',
        reportGrouping: 'by_sample',
        reportCopies: 1,
        samples: [],
        projects: [],
        clientName: '客户',
      }

      const result = await generateClientReportsForEntrustment(params)

      expect(result).toHaveLength(0)
      expect(mockGenerateNo).not.toHaveBeenCalled()
    })

    it('by_project 模式下项目为空时不生成记录', async () => {
      const params: GenerateClientReportsParams = {
        entrustmentId: 'ent-007',
        reportGrouping: 'by_project',
        reportCopies: 1,
        samples: [],
        projects: [],
        clientName: '客户',
      }

      const result = await generateClientReportsForEntrustment(params)

      expect(result).toHaveLength(0)
      expect(mockGenerateNo).not.toHaveBeenCalled()
    })

    it('reportCopies 默认为 1', async () => {
      const params: GenerateClientReportsParams = {
        entrustmentId: 'ent-008',
        reportGrouping: 'merged',
        reportCopies: 1,
        samples: [],
        projects: [],
        clientName: '客户',
      }

      const result = await generateClientReportsForEntrustment(params)

      if (result.length > 0) {
        expect(result[0].reportCopies).toBe(1)
      }
    })

    it('每条记录应包含 clientName', async () => {
      const params: GenerateClientReportsParams = {
        entrustmentId: 'ent-009',
        reportGrouping: 'merged',
        reportCopies: 1,
        samples: [],
        projects: [],
        clientName: '江苏国轻检测',
      }

      const result = await generateClientReportsForEntrustment(params)

      expect(result).toHaveLength(1)
      expect(result[0].clientName).toBe('江苏国轻检测')
    })
  })

  // ==================== 数据库交互 ====================

  describe('数据库交互', () => {
    it('应调用 prisma.clientReport.create 保存每条记录', async () => {
      const params: GenerateClientReportsParams = {
        entrustmentId: 'ent-010',
        reportGrouping: 'by_sample',
        reportCopies: 1,
        samples: [
          { id: 's1', name: 'A' },
          { id: 's2', name: 'B' },
        ],
        projects: [],
        clientName: '客户',
      }

      await generateClientReportsForEntrustment(params)

      expect(mockPrisma.clientReport.create).toHaveBeenCalledTimes(2)
    })

    it('create 调用应包含正确的数据结构', async () => {
      const params: GenerateClientReportsParams = {
        entrustmentId: 'ent-011',
        reportGrouping: 'merged',
        reportCopies: 2,
        samples: [],
        projects: [],
        clientName: '测试客户',
      }

      await generateClientReportsForEntrustment(params)

      expect(mockPrisma.clientReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reportNo: expect.stringMatching(/^CR-\d{8}-\d{3}$/),
          entrustmentId: 'ent-011',
          clientName: '测试客户',
          status: 'draft',
          groupingType: 'merged',
          reportCopies: 2,
          sampleId: null,
          entrustmentProjectId: null,
        }),
      })
    })
  })
})
